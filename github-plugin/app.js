var express = require("express");
var session = require("express-session");
var path = require('path');
var swig = require('swig');
var q = require('q');
var logger = require('morgan');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var sessionSecret = process.env.SESSION_SECRET;

var app = express();
app.use(logger());
app.use(cookieParser());
app.use(bodyParser.urlencoded({
    extended: true
}));
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

var githubOAuth = require("./githubOAuth")(app);
var githubEvents = require("./githubEvents");

app.get("/", function (req, res) {
    res.render('index');
});

app.get("/authSuccess", function (req, res) {
    var githubUsername = req.session.githubUsername;
    var accessToken = req.session.accessToken;
    githubEvents.getGithubEvents(githubUsername, accessToken)
        .then(function (data) {
            res.render('success', data);
        });
});

var port = process.env.PORT || 5001;
app.listen(port, function () {
    console.log("Listening on " + port);
});
