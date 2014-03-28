var requestModule = require('request');
var cheerio = require('cheerio');
var express = require("express");
var url = require('url');
var crypto = require('crypto');
var app = express();
app.use(express.logger());
app.use(express.bodyParser());

// application key for rest api: pqec4RXPyC-BMERoXtrnY_ajRkg81lZS

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

// async
crypto.randomBytes(16, function(ex, buf) {
	if (ex) throw ex;

	console.log(buf);

	var streamId = [];
	for (var i = 0; i < buf.length; i++) {
		var charCode = String.fromCharCode((buf[i] % 26) + 65);
		streamId.push(charCode);
	};

	writeToken = crypto.randomBytes(256).toString('base64');
	readToken = crypto.randomBytes(256).toString('base64');

  	var stream = {
  		streamid: streamId.join(''),
  		writeToken: writeToken,
  		readToken: readToken
	};

	var requestOptions = {
		headers: {'content-type' : 'application/json'},
		url:     'https://api.mongolab.com/api/1/databases/quantifieddev/collections/streams?apiKey=pqec4RXPyC-BMERoXtrnY_ajRkg81lZS',
		body:    JSON.stringify(stream)
	};

	console.log(requestOptions);

    requestModule.post(requestOptions, function(error, createStreamResponse, createStreamBody){
			response.send(createStreamBody);
	});
});
	
});

var port = process.env.PORT || 5000;
console.log(port);
app.listen(port, function() {
  console.log("Listening on " + port);
});