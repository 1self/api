var requestModule = require('request');
var cheerio = require('cheerio');
var express = require("express");
var url = require('url');
var app = express();
app.use(express.logger());
app.use(express.bodyParser());

app.all('*', function(req, res, next) {
	console.log("hit all rule");
  	res.header('Access-Control-Allow-Origin', '*');
   	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,accept,x-requested-with,x-withio-delay');
    if(req.headers["x-withio-delay"]){
    	var delay = req.headers["x-withio-delay"];
    	console.log("request is being delayed by " + delay + " ms")
    	setTimeout(function(){
    		console.log("proceeding with request");
    		next();
    	}, delay);
    }
    else{
	  next();
    }
 });

app.get('/', function(request, response) {
  response.send('quantified dev service');
});

app.post('/echo', function(request, response) {
  console.log(request.body);
  response.send(request.body);
});

app.get('/health', function(request, response) {
  response.send("I'm alive");
});

app.post('/stream', function(request, response){
	response.send("1234");
});

var port = process.env.PORT || 5000;
console.log(port);
app.listen(port, function() {
  console.log("Listening on " + port);
});