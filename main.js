require('newrelic');
var requestModule = require('request');
var cheerio = require('cheerio');
var express = require("express");
var moment = require("moment")
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
var platformUri = process.env.PLATFORM_BASE_URI;
var sharedSecret = process.env.SHARED_SECRET;

console.log("sharedSecret : " + sharedSecret);

console.log("Connecting to: " + mongoUri);
var qdDb;
mongoClient.connect(mongoUri, function(err, db) {
    if (err) {
        console.log(err);
    } else {
        qdDb = db;
        console.log('database connected : ' + qdDb);
    }
});

console.log('Connecting to PLATFORM_BASE_URI : ' + platformUri);

var encryptPassword = function() {
    if (sharedSecret) {
        var tokens = sharedSecret.split(":");
        var encryptionKey = tokens[0];
        var password = tokens[1];
        var iv = new Buffer('');
        var key = new Buffer(encryptionKey, 'hex'); //secret key for encryption
        var cipher = crypto.createCipheriv('aes-128-ecb', key, iv);
        var encryptedPassword = cipher.update(password, 'utf-8', 'hex');
        encryptedPassword += cipher.final('hex');
        console.log("encryptedPassword : " + encryptedPassword);

        return encryptedPassword;
    }
};

var encryptedPassword = encryptPassword();

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

//create stream
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

app.get('/:ip', function(req, res) {
    requestModule('http://freegeoip.net/json/' + req.params.ip, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            res.send(body)
        }
    })
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
    myEvent.serverDateTime = {
        "$date": serverDateTime
    }
    var options = {
        url: platformUri + '/rest/events/',
        auth: {
            user: "",
            password: encryptedPassword
        },
        json: {
            'payload': myEvent
        }
    };
    requestModule.post(options,
        function(error, response, body) {
            if (!error && response.statusCode == 200) {
                res.send(body)
            } else {
                res.status(500).send("Database error");
            }
        })
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
            saveEvent_driver(req.body, stream, moment(new Date()).format(), res, requestModule);
        }
    );
};

// Migrate
app.post('/stream/:id/event', postEvent);

//Migrate
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

            var fields = {
                _id: 0
            };

            var filterSpec = {
                'payload.streamid': streamid
            }
            var options = {
                url: platformUri + '/rest/events/filter',
                auth: {
                    user: "",
                    password: encryptedPassword
                },
                qs: {
                    'filterSpec': JSON.stringify(filterSpec)
                },
                method: 'GET'
            };

            function callback(error, response, body) {
                if (!error && response.statusCode == 200) {
                    var info = JSON.parse(body);
                    res.send(info)
                } else {
                    res.status(500).send("Something went wrong!");
                }
            }
            requestModule(options, callback);

        }
    );
});
//Migrate
app.get('/live/devbuild/:durationMins', function(req, res) {
    console.log("finding live builds");
    var fields = {
        _id: 0,
        streamid: 0,
    };

    var durationMins = req.params.durationMins;
    var selectedLanguage = req.query.lang;
    var dateNow = new Date();
    var cutoff = new Date(dateNow - (durationMins * 1000 * 60));

    var filterSpec = {
        "payload.serverDateTime": {
            "$gte": {
                "$date": moment(cutoff).format()
            }
        },
        "payload.actionTags": "Build"
    };

    if (selectedLanguage) {
        filterSpec["payload.properties.Language"] = selectedLanguage;
    }

    console.log("-----------------" + filterSpec);

    var options = {
        url: platformUri + '/rest/events/filter',
        auth: {
            user: "",
            password: encryptedPassword
        },
        qs: {
            'filterSpec': JSON.stringify(filterSpec)
        },
        method: 'GET'
    };

    function callback(error, response, body) {
        if (!error && response.statusCode == 200) {
            var info = JSON.parse(body);
            res.send(info)
        } else {
            res.status(500).send("Something went wrong!");
        }
    }
    console.log("options are :: ", options);
    requestModule(options, callback);

});

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
    for (var i = 0; i <= gen.day; i++) {
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

var numberOfDaysToReportBuildsOn = 30;

var generateDatesFor = function(defaultValues) {
    var result = {};

    var currentDate = new Date();
    var startDate = new Date(currentDate - (30 * aDay));
    for (var i = 0; i <= numberOfDaysToReportBuildsOn; i++) {
        var eachDay = startDate - 0 + (i * aDay);
        eachDay = new Date(eachDay);
        month = eachDay.getMonth() + 1;
        if (month < 10) {
            month = '0' + month
        }
        var dateKey = (month) + '/' + eachDay.getDate() + '/' + eachDay.getFullYear();
        console.log("dateKey :", dateKey)
        result[dateKey] = {
            date: dateKey
        };

        for (var index in defaultValues) {
            result[dateKey][defaultValues[index].key] = defaultValues[index].value;
        }
    };
    return result;
}

var filterToLastMonth = function(streamId) {
    var start = new Date(new Date() - numberOfDaysToReportBuildsOn * aDay);
    var end = new Date();
    console.log("filter start: " + start);
    console.log("filter end: " + end);
    return {
        'payload.streamid': streamId,
        'payload.serverDateTime': {
            '$gt': {
                "$date": moment(start).format()
            },
            '$lte': {
                "$date": moment(end).format()
            }
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

var getBuildEventsFromPlatform = function(stream) {
        var deferred = q.defer();
        var noId = {
            _id: 0
        };
        var groupQuery = {
            "$groupBy": {
                "fields": [{
                    "name": "payload.serverDateTime",
                    "format": "MM/dd/yyyy"
                }],
                "filterSpec": {
                    "payload.streamid": stream.streamid,
                    "payload.actionTags": "Finish"
                },
                "projectionSpec": {
                    "payload.serverDateTime": "date",
                    "payload.properties": "properties"
                },
                "orderSpec": {}
            }
        };
        var countSuccessQuery = {
            "$count": {
                "data": groupQuery,
                "filterSpec": {
                    "properties.Result": "Success"
                },
                "projectionSpec": {
                    "resultField": "passed"
                }
            }
        };
        var countFailureQuery = {
            "$count": {
                "data": groupQuery,
                "filterSpec": {
                    "properties.Result": "Failure"
                },
                "projectionSpec": {
                    "resultField": "failed"
                }
            }
        }

        var lastMonth = filterToLastMonth(stream.streamid);
        var filterSpec = lastMonth;

        var options = {
            url: platformUri + '/rest/analytics/aggregate',
            auth: {
                user: "",
                password: encryptedPassword
            },
            qs: {
                spec: JSON.stringify([countSuccessQuery, countFailureQuery]),
                merge: true
            },
            method: 'GET'
        };

        function callback(error, response, body) {
            console.log("error: " + JSON.stringify(error) + " response : " + JSON.stringify(response) + " body :" + JSON.stringify(body));
            if (!error && response.statusCode == 200) {
                var result = JSON.parse(body);
                console.log("generating builds per day now... : " + JSON.stringify(result));
                var defaultBuildValues = [{
                    key: "passed",
                    value: 0
                }, {
                    key: "failed",
                    value: 0
                }];
                var buildsByDay = generateDatesFor(defaultBuildValues);
                for (date in result) {
                    buildsByDay[date].passed = result[date].passed
                    buildsByDay[date].failed = result[date].failed
                }
                deferred.resolve(rollupToArray(buildsByDay))
            } else {
                console.log("error during call to platform: " + error);
                deferred.reject(error);
                // res.status(500).send("Something went wrong!");
            }
        }
        requestModule(options, callback);

        return deferred.promise;
    }
    //Migrate 
app.get('/quantifieddev/mydev/:streamid', function(req, res) {
    var readToken = req.headers.authorization;
    var streamid = req.params.streamid;

    var stream = {
        readToken: readToken,
        streamid: streamid
    }

    authenticateReadToken_p(stream)
        .then(getBuildEventsFromPlatform)
        .then(function(response) {
            res.send(response)
        }).catch(function(error) {
            // Handle any error from all above steps
            console.log("stream not found due to : " + error);
            res.status(404).send("stream not found");
        })
});

var getMyWTFsFromPlatform = function(streamid) {
    var deferred = q.defer();
    var groupQuery = {
        "$groupBy": {
            "fields": [{
                "name": "payload.serverDateTime",
                "format": "MM/dd/yyyy"
            }],
            "filterSpec": {
                "payload.streamid": streamid,
                "payload.actionTags": "wtf"
            },
            "projectionSpec": {
                "payload.serverDateTime": "date",
                "payload.properties": "properties"
            },
            "orderSpec": {}
        }
    };
    var countWTFQuery = {
        "$count": {
            "data": groupQuery,
            "filterSpec": {},
            "projectionSpec": {
                "resultField": "wtfCount"
            }
        }
    };

    var options = {
        url: platformUri + '/rest/analytics/aggregate',
        auth: {
            user: "",
            password: encryptedPassword
        },
        qs: {
            spec: JSON.stringify(countWTFQuery)
        },
        method: 'GET'
    };

    var sendWTFs = function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var result = JSON.parse(body)[0];
            var defaultWTFValues = [{
                key: "wtfCount",
                value: 0
            }];
            var wtfsByDay = generateDatesFor(defaultWTFValues);
            for (date in result) {
                wtfsByDay[date].wtfCount = result[date].wtfCount;
            }
            deferred.resolve(rollupToArray(wtfsByDay))
        } else {
            console.log("error during call to platform: " + error);
            deferred.reject(error);
        }
    };
    requestModule(options, sendWTFs);
    return deferred.promise;
};

app.get('/quantifieddev/mywtf/:streamid', function(req, res) {
    var readToken = req.headers.authorization;
    var streamid = req.params.streamid;

    authenticateReadToken_p(streamid)
        .then(getMyWTFsFromPlatform)
        .then(function(response) {
            res.send(response)
        }).catch(function(error) {
            console.log("stream not found due to : " + error);
            res.status(404).send("stream not found");
        });
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