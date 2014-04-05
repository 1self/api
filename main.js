var requestModule = require('request');
var cheerio = require('cheerio');
var express = require("express");
var url = require('url');
var crypto = require('crypto');
var app = express();
var q = require('q');
app.use(express.logger());
app.use(express.bodyParser());

var mongoAppKey = 'pqec4RXPyC-BMERoXtrnY_ajRkg81lZS';


app.all('*', function(req, res, next) {
    console.log("hit all rule");
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,accept,x-requested-with,x-withio-delay');
    if (req.headers["x-withio-delay"]) {
        var delay = req.headers["x-withio-delay"];
        console.log("request is being delayed by " + delay + " ms")
        setTimeout(function() {
            console.log("proceeding with request");
            next();
        }, delay);
    } else {
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

app.post('/stream', function(request, response) {

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
            headers: {
                'content-type': 'application/json'
            },
            url: 'https://api.mongolab.com/api/1/databases/quantifieddev/collections/stream?apiKey=' + mongoAppKey,
            body: JSON.stringify(stream)
        };

        console.log(requestOptions);

        requestModule.post(requestOptions, function(error, createStreamResponse, createStreamBody) {
            response.send(createStreamBody);
        });
    });

});

app.get('/stream/:id', function(req, res) {
    var readToken = req.headers.authorization;
    var mongoQuery = {
        "streamid": req.params.id
    };
    var streamReqUri = 'https://api.mongolab.com/api/1/databases/quantifieddev/collections/stream?apiKey=' + mongoAppKey + '&q=' + JSON.stringify(mongoQuery);
    console.log(streamReqUri);
    requestModule(streamReqUri, function(error, streamRes, streamBody) {
        console.log(error);
        var stream = JSON.parse(streamBody);
        console.log(stream);
        console.log(stream.readToken);
        console.log(readToken);
        if (stream[0].readToken != readToken) {
            res.status(404).send("stream not found");
        } else {
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

var authenticateToken = function(tokenComparer, id, error, success) {
    var mongoQuery = {
        "streamid": id
    };
    var streamReqUri = 'https://api.mongolab.com/api/1/databases/quantifieddev/collections/stream?apiKey=' + mongoAppKey + '&q=' + JSON.stringify(mongoQuery);
    console.log(streamReqUri);
    requestModule(streamReqUri, function(dbSaveError, streamRes, streamBody) {
        console.log(error);
        var stream = JSON.parse(streamBody);
        console.log(stream);
        console.log(stream.readToken);
        if (tokenComparer(stream)) {
            error();
        } else {
            var stream = {
                streamid: stream[0].streamid
            }
            console.log('Calling success');
            console.log(stream);
            success(stream);
        }
    });
};

var authenticateReadToken = function(token, id, error, success) {
    authenticateToken(function(stream) {
            stream.readToken != token;
        },
        id,
        error,
        success);
};

var authenticateWriteToken = function(token, id, error, success) {
    authenticateToken(function(stream) {
            stream.writeToken != token;
        },
        id,
        error,
        success);
};

var saveEvent = function(myEvent, stream, serverDateTime, res, rm) {
    console.log("My Event: ");
    console.log(myEvent);
    myEvent.streamid = stream.streamid;
    myEvent.serverDateTime = serverDateTime;
    var requestOptions = {
        headers: {
            'content-type': 'application/json'
        },
        url: "https://api.mongolab.com/api/1/databases/quantifieddev/collections/event?apiKey=" + mongoAppKey,
        body: JSON.stringify(myEvent)
    };

    console.log("Request options");
    console.log(requestOptions);
    rm.post(requestOptions, function(error, eventCreateReq, eventCreateRes) {
        console.log(error)
        console.log(eventCreateRes);
        res.send(eventCreateReq.body);
    });
}

var postEvent = function(req, res) {
    var writeToken = req.headers.authorization;
    authenticateWriteToken(
        writeToken,
        req.params.id,
        function() {
            res.status(404).send("stream not found");
        },
        function(stream) {
            saveEvent(req.body, stream, new Date(), res, requestModule);
        }
    );
};

app.post('/stream/:id/event', postEvent);

app.get('/stream/:id/event', function(req, res) {
    var readToken = req.headers.authorization;
    var streamid = req.params.id;
    authenticateReadToken(
        readToken,
        streamid,
        function() {
            res.status(404).send("stream not found");
        },
        function(stream) {
            var filter = {
                streamid: streamid
            }
            var fields = {
                _id: 0
            };

            var url = "https://api.mongolab.com/api/1/databases/quantifieddev/collections/event?apiKey=" + mongoAppKey + '&q=' + JSON.stringify(filter) + '&f=' + JSON.stringify(fields);
            console.log(url);
            var requestOptions = {
                headers: {
                    'content-type': 'application/json'
                },
                url: url,
                body: JSON.stringify(req.body)
            };

            console.log(requestOptions);
            requestModule(requestOptions, function(error, dbReq, dbRes) {
                console.log(error)
                console.log(dbRes);
                res.send(dbRes);
            });
        }
    );
});

app.get('/live/devbuild/:durationMins', function(req, res) {
    var fields = {
        _id: 0,
        streamid: 0,
    };

    var durationMins = req.params.durationMins || 1;

    var dateNow = new Date();
    var cutoff = new Date(dateNow - (durationMins * 1000 * 60));
    var filter = {
        serverDateTime: {
            "$gte": cutoff
        }
    };

    var url = "https://api.mongolab.com/api/1/databases/quantifieddev/collections/event?apiKey=" + mongoAppKey + '&q=' + JSON.stringify(filter) + '&f=' + JSON.stringify(fields);
    console.log(url);
    var requestOptions = {
        headers: {
            'content-type': 'application/json'
        },
        url: url,
        body: JSON.stringify(req.body)
    };

    console.log(requestOptions);
    requestModule(requestOptions, function(error, dbReq, dbRes) {
        console.log(error)
        console.log(dbRes);
        res.send(dbRes);
    });
});

app.post('/test/datagenerator/event/:day/:count', function(req, res) {
    var writeToken = req.headers.authorization;
    var stream = req.body.stream;
    var template = req.body.template;

    var gen = {
        day: req.params.day,
        count: req.params.count,
        dates: []
    };

    console.log(gen);

    for (var i = gen.count - 1; i >= 0; i--) {
        var randomTimeInDay = new Date(Date.parse(gen.day));
        var randomHour = 8 + (Math.random() * 13); // simulate coding between 8 and 9
        var randomMinute = Math.random() * 59;
        randomTimeInDay.setHours(randomHour);
        randomTimeInDay.setMinutes(randomMinute);

        console.log(JSON.stringify(randomTimeInDay));
        gen.dates.push(randomTimeInDay);
    };

    console.log(gen);

    var responses = [];
    for (var i = gen.dates.length - 1; i >= 0; i--) {
        var eachDate = gen.dates[i];
        var newEvent = JSON.parse(JSON.stringify(template));
        newEvent.serverDateTime = eachDate;
        newEvent.dateTime = eachDate;
        req.body = newEvent;

        var aggregatedResponses = {
            count: 0,
            send: function(data) {
                var curren
                console.log("sending partial response back:" + i);
                console.info(data);
                responses.push(data);
                if (responses.length == gen.dates.length) {
                    console.log("All data created");
                    console.log(responses);
                    res.send(responses);
                }
            }
        };

        console.log("saving event");
        saveEvent(newEvent, stream, newEvent.dateTime, aggregatedResponses, requestModule);
    }



    // authenticateWriteToken(
    // 	writeToken,
    // 	req.params.id,
    // 	function(){
    // 		res.status(404).send("stream not found");
    // 	},
    // 	function(stream){
    // 		var myEvent = req.body;
    // 		console.log("My Event: ");
    // 		console.log(myEvent);
    // 		myEvent.streamid = stream.streamid;
    // 		myEvent.serverDateTime = new Date();
    // 		var requestOptions = {
    // 			headers: {
    // 				'content-type': 'application/json'
    // 			},
    // 			url: "https://api.mongolab.com/api/1/databases/quantifieddev/collections/event?apiKey=" + mongoAppKey,
    // 			body: JSON.stringify(req.body)
    // 		};

    // 		console.log("Request options");
    // 		console.log(requestOptions);
    // 		// requestModule.post(requestOptions, function(error, eventCreateReq, eventCreateRes){
    // 		// 	console.log(error)
    // 		// 	console.log(eventCreateRes);
    // 		// 	res.send();	
    // 		// });
    // 	}
    // );
});

var authenticateReadToken_p = function(streamDetails) {
    console.log("Authing");
    var deferred = q.defer();

    var mongoQuery = {
        "streamid": streamDetails.streamid
    };
    var streamReqUri = 'https://api.mongolab.com/api/1/databases/quantifieddev/collections/stream?apiKey=' + mongoAppKey + '&q=' + JSON.stringify(mongoQuery);
    console.log(streamReqUri);
    requestModule(streamReqUri, function(dbSaveError, streamRes, streamBody) {
        var stream = JSON.parse(streamBody);
        stream = stream[0];
        console.log("This is the streambody:");
        console.log(stream);
        console.log("Trying to match");
        console.log(stream.readToken);
        console.log("against:");
        console.log(streamDetails);
        if (stream.readToken != streamDetails.readToken) {
            console.log("Auth failed!");
            deferred.reject(new Error("Stream auth failed."));
        } else {
            console.log("Deferring auth read token:");
            console.log(streamDetails);
            deferred.resolve(streamDetails);
        }
    });

    return deferred.promise;
};

var calculateQuantifiedDev = function(stream) {
    var deferred = q.defer();

    var filter = {
        streamid: stream.streamid
    }
    var fields = {
        _id: 0
    };

    var url = "https://api.mongolab.com/api/1/databases/quantifieddev/collections/event?apiKey=" + mongoAppKey + '&q=' + JSON.stringify(filter) + '&f=' + JSON.stringify(fields);
    console.log(url);
    var requestOptions = {
        headers: {
            'content-type': 'application/json'
        },
        url: url,
        body: JSON.stringify(req.body)
    };

    console.log(requestOptions);
    requestModule(requestOptions, function(error, dbReq, dbRes) {
        if (error) {
            deferred.reject(error);
        } else {
            var response = {
                content: dbRes,
                clientResponse: stream.clientResponse
            }
            deferred.resolve(dbRes);
        }
    });

    return deferred.promise;
}

var calculateQuantifiedDev_d = function(stream) {
    console.log("prepping data");

    var data = [{
        date: "3/4/2014",
        failed: "15",
        passed: "58"
    }, {
        date: "3/5/2014",
        failed: "10",
        passed: "44"
    }, {
        date: "3/6/2014",
        failed: "9",
        passed: "50"
    }, {
        date: "3/7/2014",
        failed: "20",
        passed: "49"
    }, {
        date: "3/8/2014",
        failed: "0",
        passed: "0"
    }, {
        date: "3/9/2014",
        failed: "0",
        passed: "0"
    }, {
        date: "3/10/2014",
        failed: "23",
        passed: "45"
    }, {
        date: "3/11/2014",
        failed: "13",
        passed: "53"
    }, {
        date: "3/12/2014",
        failed: "18",
        passed: "60"
    }, {
        date: "3/13/2014",
        failed: "32",
        passed: "59"
    }, {
        date: "3/14/2014",
        failed: "8",
        passed: "47"
    }, {
        date: "3/15/2014",
        failed: "0",
        passed: "0"
    }, {
        date: "3/16/2014",
        failed: "0",
        passed: "0"
    }, {
        date: "3/17/2014",
        failed: "21",
        passed: "40"
    }, {
        date: "3/18/2014",
        failed: "26",
        passed: "5"
    }, {
        date: "3/19/2014",
        failed: "0",
        passed: "0"
    }, {
        date: "3/20/2014",
        failed: "0",
        passed: "0"
    }, {
        date: "3/21/2014",
        failed: "13",
        passed: "10"
    }, {
        date: "3/22/2014",
        failed: "0",
        passed: "0"
    }, {
        date: "3/23/2014",
        failed: "0",
        passed: "0"
    }, {
        date: "3/24/2014",
        failed: "7",
        passed: "49"
    }, {
        date: "3/25/2014",
        failed: "8",
        passed: "50"
    }, {
        date: "3/26/2014",
        failed: "5",
        passed: "56"
    }, {
        date: "3/27/2014",
        failed: "11",
        passed: "59"
    }, {
        date: "3/28/2014",
        failed: "6",
        passed: "50"
    }, {
        date: "3/29/2014",
        failed: "0",
        passed: "0"
    }, {
        date: "3/30/2014",
        failed: "0",
        passed: "0"
    }, {
        date: "4/1/2014",
        failed: "11",
        passed: "55"
    }, {
        date: "4/2/2014",
        failed: "3",
        passed: "36"
    }, {
        date: "4/3/2014",
        failed: "21",
        passed: "48"
    }, {
        date: "4/4/2014",
        failed: "18",
        passed: "33"
    }, ]

    return q.fcall(function() {
        console.log("Returning data");
        return {
            content: data
        };
    })
};

app.get('/quantifieddev/mydev/:streamid', function(req, res) {
    var readToken = req.headers.authorization;
    var streamid = req.params.streamid;

    var stream = {
        readToken: readToken,
        streamid: streamid
    }
    authenticateReadToken_p(stream)
        .then(calculateQuantifiedDev_d)
        .then(function(response) {
            console.log("Trying to send back to the client");
            console.log("Res is:")
            console.log(response);
            res.send(response.content)
            // Do something with value4
        })
        .
    catch (function(error) {
        // Handle any error from all above steps
        res.status(404).send("stream not found");
    })

});

var port = process.env.PORT || 5000;
console.log(port);
app.listen(port, function() {
    console.log("Listening on " + port);
});