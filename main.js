var requestModule = require('request');
var cheerio = require('cheerio');
var express = require("express");
var url = require('url');
var crypto = require('crypto');
var app = express();
var q = require('q');
var mongoClient = require('mongodb').MongoClient;
app.use(express.logger());
app.use(express.bodyParser());

// Constants
var aDay = 24 * 60 * 60 * 1000;

var mongoAppKey = process.env.DBKEY;
var mongoUri = process.env.DBURI;

console.log("Connecting to: " + mongoUri);
var qdDb;
mongoClient.connect(mongoUri, function(err, db) {
    if (err) {
        console.log(err);
    } else {
        console.log('database connected');
        qdDb = db;
    }
});

app.all('*', function(req, res, next) {
    console.log("hit all rule");
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
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

var saveEvent_driver = function(myEvent, stream, serverDateTime, res, rm) {
    console.log("My Event: ");
    console.log(myEvent);
    myEvent.streamid = stream.streamid;
    myEvent.serverDateTime = serverDateTime;
    qdDb.collection('event').insert(myEvent, function(err, doc) {
        if (err) {
            res.status(500).send("Database error");
        } else {
            res.send(doc);
        }
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
            saveEvent_driver(req.body, stream, new Date(), res, requestModule);
        }
    );
};

app.post('/upgrade/event', function(req, res) {

    var start = new Date(new Date() - 32 * aDay);
    var end = new Date();
    var findSpec = {
        serverDateTime: {
            $gte: start,
            $lte: end
        }
    };

    console.log(findSpec);

    qdDb.collection('event').find(
        findSpec,
        function(err, events) {
            events.toArray(function(err, docs) {
                console.log("error:\n" + err);
                console.log("docs:\n" + docs);
                res.send(docs);
            });
        }
    )
});

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
            };

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
    res.send();

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
        console.log(streamBody);
        var stream = JSON.parse(streamBody);
        stream = stream[0];
        console.log("This is the streambody:");
        console.log(stream);
        console.log("Trying to match");
        console.log(stream.readToken);
        console.log("against:");
        console.log(streamDetails.readToken);
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
        url: url
    };

    console.log(requestOptions);
    requestModule(requestOptions, function(error, dbReq, dbRes) {
        if (error) {
            deferred.reject(error);
        } else {
            var data = {};
            dbRes = JSON.parse(dbRes);

            console.log("Generating dates");
            var currentDate = new Date();
            for (var i = 0; i < 31; i++) {
                var eachDay = currentDate - i * aDay;
                eachDay = new Date(eachDay);
                console.log(eachDay);
                var dateKey = (eachDay.getMonth() + 1) + '/' + eachDay.getDate() + '/' + eachDay.getFullYear();
                console.log(dateKey);
                data[dateKey] = {
                    date: dateKey,
                    failed: 0,
                    passed: 0
                };
            };

            dbRes.forEach(function(d) {
                if (!d) {
                    console.log("Data corruption detected:");
                    cnosole.log(dbRes);
                }
                console.log(d);
                var options = {}
                var sdt = new Date(d.serverDateTime);
                var diff = (currentDate.getTime() - sdt.getTime()) / aDay;
                console.log("Diff is");
                console.log(diff);
                if (diff > 30) {
                    return;
                }

                var dateKey = (sdt.getMonth() + 1) + '/' + sdt.getDate() + '/' + sdt.getFullYear();
                var buildsOnDay = data[dateKey];
                console.log("dateKey:");
                console.log(dateKey);
                console.log("buildsOnDay")
                console.log(buildsOnDay);

                if (d.actionTags.indexOf("Build") >= 0 && d.actionTags.indexOf("Finish") >= 0) {
                    console.log("found build finished")
                    if (d.properties.Result == "Success") {
                        buildsOnDay.passed += 1;
                    } else if (d.properties.Result == "Failure") {
                        buildsOnDay.failed += 1;
                    }
                }

                data[dateKey] = buildsOnDay;
            })

            var dataArray = [];
            for (var d in data) {
                dataArray.push(data[d]);
            }

            deferred.resolve(dataArray);
        }
    });

    return deferred.promise;
}

var generateDates = function() {
    var result = {};

    console.log("Generating dates");
    var currentDate = new Date();
    for (var i = 0; i < 31; i++) {
        var eachDay = currentDate - i * aDay;
        eachDay = new Date(eachDay);
        console.log(eachDay);
        var dateKey = (eachDay.getMonth() + 1) + '/' + eachDay.getDate() + '/' + eachDay.getFullYear();
        console.log(dateKey);
        result[dateKey] = {
            date: dateKey,
            failed: 0,
            passed: 0
        };
    };

    return result;
}

var rollupByDay = function(build, dates) {
    if (!build) {
        console.log("Data corruption detected:");
        cnosole.log(dbRes);
    }
    console.log(build);
    var options = {}
    var sdt = new Date(build.serverDateTime);
    var dateKey = (sdt.getMonth() + 1) + '/' + sdt.getDate() + '/' + sdt.getFullYear();
    var buildsOnDay = dates[dateKey];
    console.log("dateKey:");
    console.log(dateKey);
    console.log("buildsOnDay")
    console.log(buildsOnDay);

    if (build.actionTags.indexOf("Build") >= 0 && build.actionTags.indexOf("Finish") >= 0) {
        console.log("found build finished")
        if (d.properties.Result == "Success") {
            buildsOnDay.passed += 1;
        } else if (d.properties.Result == "Failure") {
            buildsOnDay.failed += 1;
        }
    }

    dates[dateKey] = buildsOnDay;
};

var filterToLastMonth = function(streamId) {
    var start = new Date(new Date() - 32 * aDay);
    var end = new Date();
    return {
        streamid: streamId,
        serverDateTime: {
            $gte: start,
            $lte: end
        }
    };
}

var rollupToArray = function(rollup) {
    var result = [];
    for (var r in rollup) {
        result.push(rollup[r]);
    }
    console.log("rollupToArray:");
    console.log(result);
    return result;
}

var calculateQuantifiedDev_driver = function(stream) {
    var deferred = q.defer();
    var noId = {
        _id: 0
    };

    console.log(stream);
    var lastMonth = filterToLastMonth(stream.streamid);
    console.log(lastMonth);
    qdDb.collection('event').find(
        lastMonth,
        noId,
        function(err, events) {
            events.toArray(function(err, rawEvents) {
                if (err) {
                    deferred.reject(error);
                } else {
                    var buildsByDay = generateDates();
                    rawEvents.forEach(rollupByDay, buildsByDay);
                    deferred.resolve(rollupToArray(buildsByDay));
                }
            });

        }
    );
    return deferred.promise;
}

app.get('/quantifieddev/mydev/:streamid', function(req, res) {
    var readToken = req.headers.authorization;
    var streamid = req.params.streamid;

    var stream = {
        readToken: readToken,
        streamid: streamid
    }

    authenticateReadToken_p(stream)
        .then(calculateQuantifiedDev_driver)
        .then(function(response) {
            console.log("Trying to send back to the client");
            console.log("Res is:")
            console.log(response);
            res.send(response)
            // Do something with value4
        })
        .
    catch (function(error) {
        // Handle any error from all above steps
        console.log(error);
        res.status(404).send("stream not found");
    })

});

app.get('/quantifieddev/extensions/message', function(req, res) {
    var result = {
        text: "To get involved, receive updates or interact with the quantifieddev community, please go to quantifieddev.org."
    };
    res.send(JSON.stringify(result));
});

// We need this to allow requests coming from origins other than the webservices domain to be served. Right now we're just allowing anyone to post a request
// to the backend services
app.options('*', function(request, response) {
    response.header('Access-Control-Allow-Origin', '*');
    response.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    response.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,accept,x-requested-with,x-withio-delay');
    response.send();
});

var port = process.env.PORT || 5000;
console.log(port);
app.listen(port, function() {
    console.log("Listening on " + port);
});