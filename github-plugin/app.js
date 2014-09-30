var express = require("express");
var session = require("express-session");
var path = require('path');
var swig = require('swig');
var q = require('q');
var logger = require('morgan');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var mongoClient = require('mongodb').MongoClient;

var GithubEvents = require("./routes/githubEvents");
var MongoRepository = require('./routes/mongoRepository');
var GithubOAuth = require("./routes/githubOAuth");
var QdService = require("./routes/qdService");
var app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(logger());
app.use(cookieParser());
app.use(bodyParser.urlencoded({
    extended: true
}));

var sessionSecret = process.env.SESSION_SECRET;
app.use(session({
    secret: sessionSecret,
    cookie: {
        maxAge: 2 * 365 * 24 * 60 * 60 * 1000, // 2 years
        secure: false // change to true when using https
    },
    resave: false, // don't save session if unmodified
    saveUninitialized: false // don't create session until something stored
}));

app.use(bodyParser.json());
app.engine('html', swig.renderFile);
app.set('views', __dirname + '/views');
app.set('view engine', 'html');

var port = process.env.PORT || 5001;
var server = app.listen(port, function () {
    console.log("Listening on " + port);
});

var io = require('socket.io')(server);
io.on('connection', function (socket) {
    console.log("client connected..............");
    socket.on('clientConnected', function (githubUsername) {
        console.log("new client logged in." + githubUsername);
        socket.join(githubUsername);
    });
});

var qdService = new QdService();
var mongoUri = process.env.DBURI;
var mongoRepository;
var githubEvents;
var githubOAuth;
mongoClient.connect(mongoUri, function (err, databaseConnection) {
    if (err) {
        console.error("Could not connect to Mongodb with URI : " + mongoUri);
        console.error(err);
        process.exit(1);
    } else {
        console.log("connected to mongo : ", mongoUri);
        mongoRepository = new MongoRepository(databaseConnection);
        githubEvents = new GithubEvents(mongoRepository, qdService);
        githubOAuth = new GithubOAuth(app, mongoRepository, qdService);
    }
});

app.get("/", function (req, res) {
    res.render('index');
});

app.get("/authSuccess", function (req, res) {
    var githubUsername = req.session.githubUsername;
    var accessToken = req.session.accessToken;
    githubEvents.sendGithubEvents(githubUsername, accessToken)
        .then(function () {
            io.in(githubUsername).emit('status',"Synced GitHub Push Events.");
        },function(){
            io.in(githubUsername).emit('status',"No data to sync up!");
        });
    res.redirect("/status?githubUsername=" + githubUsername);
});

app.get("/status", function (req, res) {
    res.render("status");
});
