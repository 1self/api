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

app.get('/demo', function(request, response) {
    response.send("This is a demo");
});

app.post('/stream', function(req, res) {

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

        console.log("stream:");
        console.log(stream);
        qdDb.collection('stream').insert(stream, function(err, insertedRecords) {
            if (err) {
                res.status(500).send("Database error");
            } else {
                console.log("Inserted stream is : " + JSON.stringify(insertedRecords));
                res.send(insertedRecords[0]);
            }
        });

    });


});

app.get('/stream/:id', function(req, res) {
    var readToken = req.headers.authorization;

    console.log(req.params.id);
    var spec = {
        streamid: req.params.id
    };

    console.log(spec);
    qdDb.collection('stream').find(spec, function(err, docs) {
        docs.toArray(function(err, streamArray) {
            var stream = streamArray[0] || {};
            if (stream.readToken != readToken) {
                res.status(404).send("stream not found");
            } else {
                var response = {
                    streamid: stream.streamid
                }
                console.log(response);
                res.send(JSON.stringify(response));
            }
        })
    });
});

var authenticateToken = function(tokenComparer, id, error, success) {
    console.log('streamid:' + id);
    qdDb.collection('stream').find({
        streamid: id
    }, function(err, docs) {
        docs.toArray(function(err, docsArray) {
            var stream = docsArray[0] || {};
            console.log("streamVV: ");
            console.log(stream);
            if (tokenComparer(stream)) {
                error();
            } else {
                var stream = {
                    streamid: stream.streamid
                }
                console.log('Calling success');
                console.log(stream);
                success(stream);
            }
        })
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

            console.log('looking for events');
            console.log(filter);
            console.log(fields);

            qdDb.collection('event').find(filter, fields, function(err, docs) {
                docs.toArray(function(err, docsArray) {
                    console.log(docsArray);
                    res.send(docsArray);
                })
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


/* Pass this into data genreator api
{
  "stream": {"streamid": "YUWBBEPCPGWIDRBK"},
  "template": {
    "dateTime": "2014-04-28T15:28:36.1788806Z",
    "location": {
      "lat": 52,
      "long": 0
    },
    "actionTags": [
      "Build",
      "Finish"
    ],
    "objectTags": [
      "Computer",
      "Software"
    ],
    "properties": {
      "Language": "IronPython",
      "Environment": "VisualStudio2012",
      "Result": "Failure"
    },
    "streamid": "YUWBBEPCPGWIDRBK"
  }
}
*/


app.post('/test/datagenerator/event/:day/:count', function(req, res) {
    var writeToken = req.headers.authorization;
    var stream = req.body.stream;
    var template = req.body.template;

    var gen = {
        day: parseInt(req.params.day),
        count: parseInt(req.params.count),
        dates: []
    };

    console.log(gen);

    var generateEventsOnDay = function(day, count) {
        var result = [];
        for (var i = count - 1; i >= 0; i--) {
            var randomTimeInDay = new Date(Date.parse(day));
            var randomHour = 8 + (Math.random() * 9); // simulate coding between 8 and 13
            var randomMinute = Math.random() * 59;
            randomTimeInDay.setHours(randomHour);
            randomTimeInDay.setMinutes(randomMinute);

            console.log(JSON.stringify(randomTimeInDay));
            result.push(randomTimeInDay);
        };

        return result;
    }

    var responses = [];
    var startDate = new Date(new Date() - (gen.day * aDay));
    currentDate = startDate;
    console.log("startDate: " + startDate);
    console.log("currentDate: " + currentDate);

    var eventsToAdd = [];
    for (var i = 0; i < gen.day; i++) {
        times = generateEventsOnDay(currentDate, Math.random() * gen.count);
        for (j = 0; j < times.length; j++) {
            var newEvent = JSON.parse(JSON.stringify(template));
            newEvent.serverDateTime = times[j];
            newEvent.dateTime = times[j];
            eventsToAdd.push(newEvent);
        }
        currentDate = new Date(currentDate - 0 + aDay);
        console.log("CurrentDate: " + currentDate);
    }

    console.log(eventsToAdd);

    var responses
    var aggregatedResponses = {
        count: 0,
        send: function(data) {
            responses.push(data);
            console.log(responses.length);
            console.log(eventsToAdd.length);
            if (responses.length == eventsToAdd.length) {
                console.log("All data created");
                console.log(responses);
                res.send(responses);
            }
        }
    };

    eventsToAdd.forEach(function(d, i) {
        console.log(d);
        saveEvent_driver(d, stream, d.dateTime, aggregatedResponses, requestModule);
    });
});



// var responses = [];
// for (var i = gen.dates.length - 1; i >= 0; i--) {
//     var eachDate = gen.dates[i];
//     var newEvent = JSON.parse(JSON.stringify(template));
//     newEvent.serverDateTime = eachDate;
//     newEvent.dateTime = eachDate;
//     req.body = newEvent;

//     var aggregatedResponses = {
//         count: 0,
//         send: function(data) {
//             var curren
//             console.log("sending partial response back:" + i);
//             console.info(data);
//             responses.push(data);
//             if (responses.length == gen.dates.length) {
//                 console.log("All data created");
//                 console.log(responses);
//                 res.send(responses);
//             }
//         }
//     };

//     console.log("saving event");
//     saveEvent(newEvent, stream, newEvent.dateTime, aggregatedResponses, requestModule);
// }

var authenticateReadToken_p = function(streamDetails) {
    console.log("Authing");
    var deferred = q.defer();

    var mongoQuery = {
        "streamid": streamDetails.streamid
    };

    console.log("streamdetails: " + streamDetails);
    var spec = {
        streamid: streamDetails.streamid
    }


    console.log(spec);
    qdDb.collection('stream').find(spec, function(err, docs) {
        docs.toArray(function(err, docsArray) {
            if (err) {
                deferred.reject(new Error("Database error"));
            } else {
                var stream = docsArray[0] || {};
                console.log(stream.readToken);
                if (stream.readToken != streamDetails.readToken) {
                    console.log("Auth failed!");
                    deferred.reject(new Error("Stream auth failed."));
                } else {
                    console.log("Deferring auth read token:");
                    console.log(streamDetails);
                    deferred.resolve(streamDetails);
                }
            }
        })
    });

    return deferred.promise;
};

var generateDates = function() {
    var result = {};

    console.log("Generating dates");
    var currentDate = new Date();
    var startDate = new Date(currentDate - (30 * aDay));
    for (var i = 0; i < 31; i++) {
        console.log(i);
        console.log('startdate: ' + startDate);
        console.log(i * aDay);
        var eachDay = startDate - 0 + (i * aDay);
        console.log("ed: " + eachDay)
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

    console.log('generate dates done:');
    console.log(result);
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
    console.log(dates);

    if (build.actionTags.indexOf("Build") >= 0 && build.actionTags.indexOf("Finish") >= 0) {
        console.log("found build finished")
        if (build.properties.Result == "Success") {
            buildsOnDay.passed += 1;
        } else if (build.properties.Result == "Failure") {
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
                    console.log("raw events: ");
                    console.log(rawEvents);
                    rawEvents.forEach(function(build) {
                        rollupByDay(build, buildsByDay)
                    });
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