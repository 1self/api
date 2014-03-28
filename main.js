var requestModule = require('request');
var cheerio = require('cheerio');
var express = require("express");
var url = require('url');
var crypto = require('crypto');
var app = express();
app.use(express.logger());
app.use(express.bodyParser());

var mongoAppKey = 'pqec4RXPyC-BMERoXtrnY_ajRkg81lZS';


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
			url:     'https://api.mongolab.com/api/1/databases/quantifieddev/collections/stream?apiKey=' + mongoAppKey,
			body:    JSON.stringify(stream)
		};

		console.log(requestOptions);

	    requestModule.post(requestOptions, function(error, createStreamResponse, createStreamBody){
				response.send(createStreamBody);
		});
	});
	
});

app.get('/stream/:id', function(req, res){
	var readToken = req.headers.authorization;
	var mongoQuery = {
				"streamid":req.params.id
			};
	var streamReqUri = 'https://api.mongolab.com/api/1/databases/quantifieddev/collections/stream?apiKey=' + mongoAppKey + '&q=' + JSON.stringify(mongoQuery);
	console.log(streamReqUri);
	requestModule(streamReqUri, function(error, streamRes, streamBody){
		console.log(error);
		var stream = JSON.parse(streamBody);
		console.log(stream);
		console.log(stream.readToken);
		console.log(readToken);
		if(stream[0].readToken != readToken){
			res.status(404).send("stream not found");
		}
		else{
			console.log("Got the stream from repo");
			console.log(streamBody)
			var response = {
				streamid: stream[0].streamid
			}
			console.log(response);
			res.send(JSON.stringify(response));
		}
	});
});

var authenticateWriteToken = function(token, id, error, success){
	var mongoQuery = {
				"streamid":id
			};
	var streamReqUri = 'https://api.mongolab.com/api/1/databases/quantifieddev/collections/stream?apiKey=' + mongoAppKey + '&q=' + JSON.stringify(mongoQuery);
	console.log(streamReqUri);
	requestModule(streamReqUri, function(dbSaveError, streamRes, streamBody){
		console.log(error);
		var stream = JSON.parse(streamBody);
		console.log(stream);
		console.log(stream.readToken);
		console.log(token);
		if(stream[0].writeToken != token){
			error();
		}
		else{
			var stream = {
				streamid: stream[0].streamid
			}
			success(stream);
		}
	});
};

app.post('/stream/:id/event', function(req, res){
	var writeToken = req.headers.authorization;
	authenticateWriteToken(
		writeToken,
		req.params.id,
		function(){
			res.status(404).send("stream not found");
		},
		function(stream){
			var requestOptions = {
				headers: {
					'content-type': 'application/json'
				},
				url: "https://api.mongolab.com/api/1/databases/quantifieddev/collections/event?apiKey=" + mongoAppKey,
				body: JSON.stringify(req.body)
			};

			console.log(requestOptions);
			requestModule.post(requestOptions, function(error, eventCreateReq, eventCreateRes){
				console.log(error)
				console.log(eventCreateRes);
				res.send();	
			});
		}
	);
});

var port = process.env.PORT || 5000;
console.log(port);
app.listen(port, function() {
  console.log("Listening on " + port);
});