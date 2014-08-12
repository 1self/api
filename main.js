// require('newrelic');
var requestModule = require('request');
var cheerio = require('cheerio');
var express = require("express");
var moment = require("moment");
var url = require('url');

var swig = require('swig');
var path = require('path');
var _ = require("underscore");
var session = require("express-session");
var q = require('q');

var mongoDbConnection = require('./lib/connection.js');
var util = require('./util');
var PasswordEncrypt = require('./lib/PasswordEncrypt');

var githubEvents = require("./githubEvents");

var MongoStore = require("express-session-mongo");

var app = express();
app.use(express.logger());
app.use(express.bodyParser());
app.use(express.cookieParser());

app.engine('html', swig.renderFile);
app.use(express.static(path.join(__dirname, 'website/public')));
app.set('view engine', 'html');
app.set('view cache', false);
app.set('views', __dirname + '/website/views');
swig.setDefaults({
    cache: false
});
var sessionSecret = process.env.SESSION_SECRET;
app.use(session({
    store: new MongoStore({
        db: "quantifieddev",
        ip: process.env.DB_HOST,
        port: process.env.DB_PORT,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD
    }),
    secret: sessionSecret,
    resave: true,
    saveUninitialized: true,
    cookie: {
        maxAge: 2 * 365 * 24 * 60 * 60 * 1000, // 2 years
        secure: false // change to true when using https
    }
}));
// Constants
var aDay = 24 * 60 * 60 * 1000;
var platformUri = process.env.PLATFORM_BASE_URI;
var sharedSecret = process.env.SHARED_SECRET;
console.log("sharedSecret : " + sharedSecret);

console.log('Connecting to PLATFORM_BASE_URI : ' + platformUri);
require('./githubOAuth')(app);
require('./quantifieddevRoutes')(app);

var encryptedPassword = PasswordEncrypt.encryptPassword(sharedSecret);

var getFilterValuesFrom = function(req) {
    var lastHour = 60;
    var selectedLanguage = req.query.language ? req.query.language : "all";
    var selectedEvent = req.query.event ? req.query.event : "all";
    var selectedDuration = req.query.duration ? req.query.duration : lastHour;
    var filterValues = {
        globe: {
            lang: selectedLanguage,
            duration: selectedDuration,
            event: selectedEvent
        },
        country: {
            lang: selectedLanguage,
            duration: selectedDuration,
            event: selectedEvent
        }
    };
    return filterValues;
};


var validEncodedUsername = function(encodedUsername, forUsername, params) {
    var deferred = q.defer();
    var encodedUsernameExists = {
        "encodedUsername": encodedUsername
    };

    mongoDbConnection(function(qdDb) {
        qdDb.collection('users').findOne(encodedUsernameExists, function(err, user) {
            if (err) {
                deferred.reject(err);
            } else {
                if (user) {
                    var usernames = [encodedUsername, forUsername];
                    var paramsToPassOn = [usernames, params];
                    deferred.resolve(paramsToPassOn);
                } else {
                    deferred.reject();
                }
            }
        });
    });

    return deferred.promise;
}

var getStreamIdForUsername = function(params) {
    var deferred = q.defer();
    var query = null;
    usernames = params[0];
    var encodedUsername = usernames[0];
    var forUsername = usernames[1];
    if (forUsername !== undefined) {
        query = {
            "username": forUsername
        };
    } else {
        query = {
            "encodedUsername": encodedUsername
        };
    }

    mongoDbConnection(function(qdDb) {
        qdDb.collection('users').findOne(query, {
            "streams": 1
        }, function(err, user) {
            if (err) {
                deferred.reject(err);
            } else {
                if (user && user.streams) {
                    var paramsToPassOn = [user.streams, params[1]]
                    deferred.resolve(paramsToPassOn);
                } else {
                    deferred.reject();
                }
            }
        });
    });

    return deferred.promise;
};


var getGithubStreamIdForUsername = function(params) {
    var deferred = q.defer();
    var query = null;
    var usernames = params[0];
    var encodedUsername = usernames[0];
    var forUsername = usernames[1];
    if (forUsername !== undefined) {
        query = {
            "username": forUsername
        };
    } else {
        query = {
            "encodedUsername": encodedUsername
        };
    }

    mongoDbConnection(function(qdDb) {
        qdDb.collection('users').findOne(query, {
            "githubUser.githubStreamId": 1
        }, function(err, user) {
            if (err) {
                console.log(err);
                deferred.reject(err);
            } else {
                if (user && user.githubUser.githubStreamId) {
                    deferred.resolve(user.githubUser.githubStreamId);
                } else {
                    deferred.reject();
                }
            }
        });
    });

    return deferred.promise;
};

var saveEvent_driver = function(myEvent, stream, eventDateTime, res, rm) {
    myEvent.streamid = stream.streamid;
    myEvent.eventDateTime = {
        "$date": eventDateTime
    };
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
        });
}

var authenticateWriteToken = function(token, id, error, success) {
    mongoDbConnection(function(qdDb) {
        qdDb.collection('stream').find({
            streamid: id
        }, function(err, docs) {
            docs.toArray(function(err, docsArray) {
                var stream = docsArray[0] || {};
                if (stream.writeToken != token) {
                    error();
                } else {
                    var stream = {
                        streamid: stream.streamid
                    };
                    success(stream);
                }
            });
        });
    });
};

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

var getEventsForStreams = function(params) {
    var streams = params[0];
    var streamids = _.map(streams, function(stream) {
        return stream.streamid;
    });
    var deferred = q.defer();
    var fields = {
        _id: 0
    };
    var filterSpec = {
        'payload.streamid': streamids
    };
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

    var getEventsFromPlatform = function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var result = JSON.parse(body);
            deferred.resolve(result);
        } else {
            deferred.reject(error);
        }
    }
    requestModule(options, getEventsFromPlatform);
    return deferred.promise;
};

var generateDatesFor = function(defaultValues) {
    var result = {};
    var numberOfDaysToReportBuildsOn = 30;
    var currentDate = new Date();
    var startDate = new Date(currentDate - (30 * aDay));
    for (var i = 0; i <= numberOfDaysToReportBuildsOn; i++) {
        var eachDay = startDate - 0 + (i * aDay);
        eachDay = new Date(eachDay);
        var month = eachDay.getMonth() + 1;
        if (month < 10) {
            month = '0' + month;
        }
        var day = eachDay.getDate();
        if (day < 10) {
            day = '0' + day
        }
        var dateKey = (month) + '/' + day + '/' + eachDay.getFullYear();
        result[dateKey] = {
            date: dateKey
        };

        for (var index in defaultValues) {
            result[dateKey][defaultValues[index].key] = defaultValues[index].value;
        }
    };
    return result;
}

var rollupToArray = function(rollup) {
    var result = [];
    for (var r in rollup) {
        result.push(rollup[r]);
    }
    return result;
}

var getBuildEventsFromPlatform = function(params) {
    var streams = params[0];
    var streamids = _.map(streams, function(stream) {
        return stream.streamid;
    });
    var deferred = q.defer();
    var noId = {
        _id: 0
    };
    var lastMonth = moment().subtract('months', 1);
    var groupQuery = {
        "$groupBy": {
            "fields": [{
                "name": "payload.eventDateTime",
                "format": "MM/dd/yyyy"
            }],
            "filterSpec": {
                "payload.streamid": {
                    "$operator": {
                        "in": streamids
                    }
                },
                "payload.eventDateTime": {
                    "$operator": {
                        ">": {
                            "$date": moment(lastMonth).format()
                        }
                    }
                },
                "payload.actionTags": "Finish"
            },
            "projectionSpec": {
                "payload.eventDateTime": "date",
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
    };
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
        if (!error && response.statusCode == 200) {
            var result = JSON.parse(body);
            if (_.isEmpty(result)) {
                deferred.resolve([]);
            } else {
                var defaultBuildValues = [{
                    key: "passed",
                    value: 0
                }, {
                    key: "failed",
                    value: 0
                }];
                var buildsByDay = generateDatesFor(defaultBuildValues);
                for (date in result) {
                    if (buildsByDay[date] !== undefined) {
                        buildsByDay[date].passed = result[date].passed;
                        buildsByDay[date].failed = result[date].failed;
                    }
                }
                deferred.resolve(rollupToArray(buildsByDay));
            }
        } else {
            deferred.reject(error);
        }
    }
    requestModule(options, callback);

    return deferred.promise;
}

var getMyWTFsFromPlatform = function(params) {
    var streams = params[0];
    var streamids = _.map(streams, function(stream) {
        return stream.streamid;
    });
    var deferred = q.defer();
    var lastMonth = moment().subtract('months', 1);

    var groupQuery = {
        "$groupBy": {
            "fields": [{
                "name": "payload.eventDateTime",
                "format": "MM/dd/yyyy"
            }],
            "filterSpec": {
                "payload.streamid": {
                    "$operator": {
                        "in": streamids
                    }
                },
                "payload.eventDateTime": {
                    "$operator": {
                        ">": {
                            "$date": moment(lastMonth).format()
                        }
                    }
                },
                "payload.actionTags": "wtf"
            },
            "projectionSpec": {
                "payload.eventDateTime": "date",
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
            if (_.isEmpty(result)) {
                deferred.resolve([]);
            } else {
                var defaultWTFValues = [{
                    key: "wtfCount",
                    value: 0
                }];
                var wtfsByDay = generateDatesFor(defaultWTFValues);
                for (date in result) {
                    if (wtfsByDay[date] !== undefined) {
                        wtfsByDay[date].wtfCount = result[date].wtfCount;
                    }
                }
                deferred.resolve(rollupToArray(wtfsByDay));
            }
        } else {
            deferred.reject(error);
        }
    };
    requestModule(options, sendWTFs);
    return deferred.promise;
};

var getMyHydrationEventsFromPlatform = function(params) {
    var streams = params[0];
    var streamids = _.map(streams, function(stream) {
        return stream.streamid;
    });
    var deferred = q.defer();
    var lastMonth = moment().subtract('months', 1);

    var groupQuery = {
        "$groupBy": {
            "fields": [{
                "name": "payload.eventDateTime",
                "format": "MM/dd/yyyy"
            }],
            "filterSpec": {
                "payload.streamid": {
                    "$operator": {
                        "in": streamids
                    }
                },
                "payload.eventDateTime": {
                    "$operator": {
                        ">": {
                            "$date": moment(lastMonth).format()
                        }
                    }
                },
                "payload.actionTags": "drink",
                "payload.objectTags": "Water"
            },
            "projectionSpec": {
                "payload.eventDateTime": "date",
                "payload.properties": "properties"
            },
            "orderSpec": {}
        }
    };
    var countHydrationQuery = {
        "$count": {
            "data": groupQuery,
            "filterSpec": {},
            "projectionSpec": {
                "resultField": "hydrationCount"
            }
        }
    };

    var requestDetails = {
        url: platformUri + '/rest/analytics/aggregate',
        auth: {
            user: "",
            password: encryptedPassword
        },
        qs: {
            spec: JSON.stringify(countHydrationQuery)
        },
        method: 'GET'
    };

    var sendHydrationCount = function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var result = JSON.parse(body)[0];
            if (_.isEmpty(result)) {
                deferred.resolve([]);
            } else {
                var defaultHydrationValues = [{
                    key: "hydrationCount",
                    value: 0
                }];
                var hydrationsByDay = generateDatesFor(defaultHydrationValues);
                for (date in result) {
                    if (hydrationsByDay[date] !== undefined) {
                        hydrationsByDay[date].hydrationCount = result[date].hydrationCount;
                    }
                }
                deferred.resolve(rollupToArray(hydrationsByDay));
            }
        } else {
            deferred.reject(error);
        }
    };
    requestModule(requestDetails, sendHydrationCount);
    return deferred.promise;
};

var getMyCaffeineEventsFromPlatform = function(params) {
    var streams = params[0];
    var streamids = _.map(streams, function(stream) {
        return stream.streamid;
    });
    var deferred = q.defer();
    var lastMonth = moment().subtract('months', 1);

    var groupQuery = {
        "$groupBy": {
            "fields": [{
                "name": "payload.eventDateTime",
                "format": "MM/dd/yyyy"
            }],
            "filterSpec": {
                "payload.streamid": {
                    "$operator": {
                        "in": streamids
                    }
                },
                "payload.eventDateTime": {
                    "$operator": {
                        ">": {
                            "$date": moment(lastMonth).format()
                        }
                    }
                },
                "payload.actionTags": "drink",
                "payload.objectTags": "Coffee"
            },
            "projectionSpec": {
                "payload.eventDateTime": "date",
                "payload.properties": "properties"
            },
            "orderSpec": {}
        }
    };
    var countCaffeineQuery = {
        "$count": {
            "data": groupQuery,
            "filterSpec": {},
            "projectionSpec": {
                "resultField": "caffeineCount"
            }
        }
    };

    var requestDetails = {
        url: platformUri + '/rest/analytics/aggregate',
        auth: {
            user: "",
            password: encryptedPassword
        },
        qs: {
            spec: JSON.stringify(countCaffeineQuery)
        },
        method: 'GET'
    };

    var sendCaffeineCount = function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var result = JSON.parse(body)[0];
            if (_.isEmpty(result)) {
                deferred.resolve([]);
            } else {
                var defaultCaffeineValues = [{
                    key: "caffeineCount",
                    value: 0
                }];
                var caffeineIntakeByDay = generateDatesFor(defaultCaffeineValues);
                for (date in result) {
                    if (caffeineIntakeByDay[date] !== undefined) {
                        caffeineIntakeByDay[date].caffeineCount = result[date].caffeineCount;
                    }
                }
                deferred.resolve(rollupToArray(caffeineIntakeByDay));
            }
        } else {
            deferred.reject(error);
        }
    };
    requestModule(requestDetails, sendCaffeineCount);
    return deferred.promise;
};

var getAvgBuildDurationFromPlatform = function(params) {
    var streams = params[0];
    var streamids = _.map(streams, function(stream) {
        return stream.streamid;
    });
    var deferred = q.defer();
    var lastMonth = moment().subtract('months', 1);

    var groupQuery = {
        "$groupBy": {
            "fields": [{
                "name": "payload.eventDateTime",
                "format": "MM/dd/yyyy"
            }],
            "filterSpec": {
                "payload.streamid": {
                    "$operator": {
                        "in": streamids
                    }
                },
                "payload.eventDateTime": {
                    "$operator": {
                        ">": {
                            "$date": moment(lastMonth).format()
                        }
                    }
                },
                "payload.actionTags": "Finish"
            },
            "projectionSpec": {
                "payload.eventDateTime": "date",
                "payload.properties": "properties"
            },
            "orderSpec": {}
        }
    };
    var sumOfBuildDurationForBuildFinishEvents = {
        "$sum": {
            "field": {
                "name": "properties.BuildDuration"
            },
            "data": groupQuery,
            "filterSpec": {},
            "projectionSpec": {
                "resultField": "totalDuration"
            }
        }
    };
    var countBuildFinishEventsQuery = {
        "$count": {
            "data": groupQuery,
            "filterSpec": {},
            "projectionSpec": {
                "resultField": "eventCount"
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
            spec: JSON.stringify([sumOfBuildDurationForBuildFinishEvents,
                countBuildFinishEventsQuery
            ]),
            merge: true
        },
        method: 'GET'
    };
    var convertMillisToSeconds = function(milliseconds) {
        return Math.round(milliseconds / 1000 * 100) / 100;
    };

    function callback(error, response, body) {
        if (!error && response.statusCode == 200) {
            var result = JSON.parse(body);
            if (_.isEmpty(result)) {
                deferred.resolve([]);
            } else {
                var defaultBuildValues = [{
                    key: "avgBuildDuration",
                    value: 0
                }];
                var buildDurationByDay = generateDatesFor(defaultBuildValues);
                for (date in result) {
                    if (buildDurationByDay[date] !== undefined) {
                        buildDurationInMillis = result[date].totalDuration / result[date].eventCount;
                        buildDurationByDay[date].avgBuildDuration = convertMillisToSeconds(buildDurationInMillis);
                    }
                }
                deferred.resolve(rollupToArray(buildDurationByDay))
            }
        } else {
            deferred.reject(error);
        }
    }

    requestModule(options, callback);

    return deferred.promise;
};

var orderDateAsPerWeek = function(date) {
    var dayOfWeek = new Date(date).getDay();
    var orderedDates = [];
    orderedDates[dayOfWeek] = date;
    return orderedDates;
}
var generateHoursForWeek = function(defaultValues) {
    var result = {};
    var numberOfDaysToReportBuildsOn = 7;
    for (var i = 1; i <= numberOfDaysToReportBuildsOn; i++) {
        for (var j = 1; j <= 24; j++) {
            if (j < 10) {
                j = '0' + j;
            }
            var hourOfDay = i + " " + j;
            result[hourOfDay] = {
                day: hourOfDay
            };
            for (var index in defaultValues) {
                result[hourOfDay][defaultValues[index].key] = defaultValues[index].value;
            }
        }
    }
    return result;
};

var defaultEventValues = [{
    key: "hourlyEventCount",
    value: 0
}];

var getHourlyBuildCountFromPlatform = function(params) {
    var streams = params[0];
    var streamids = _.map(streams, function(stream) {
        return stream.streamid;
    });
    var deferred = q.defer();
    var groupQuery = {
        "$groupBy": {
            "fields": [{
                "name": "payload.eventDateTime",
                "format": "e HH"
            }],
            "filterSpec": {
                "payload.streamid": {
                    "$operator": {
                        "in": streamids
                    }
                },
                "payload.actionTags": "Finish"
            },
            "projectionSpec": {
                "payload.eventDateTime": "date",
                "payload.properties": "properties"
            },
            "orderSpec": {}
        }
    };
    var hourlyBuildCount = {
        "$count": {
            "data": groupQuery,
            "filterSpec": {},
            "projectionSpec": {
                "resultField": "buildCount"
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
            spec: JSON.stringify(hourlyBuildCount)
        },
        method: 'GET'
    };

    function callback(error, response, body) {
        if (!error && response.statusCode == 200) {
            var result = JSON.parse(body);
            result = result[0];
            if (_.isEmpty(result)) {
                deferred.resolve([]);
            } else {
                var hourlyBuilds = generateHoursForWeek(defaultEventValues);
                for (var date in result) {
                    if (hourlyBuilds[date] !== undefined) {
                        hourlyBuilds[date].hourlyEventCount = result[date].buildCount;
                    }
                }
                deferred.resolve(rollupToArray(hourlyBuilds));
            }
        } else {
            deferred.reject(error);

        }
    }

    requestModule(options, callback);

    return deferred.promise;
};

var getHourlyWtfCount = function(params) {
    var streams = params[0];
    var streamids = _.map(streams, function(stream) {
        return stream.streamid;
    });
    var deferred = q.defer();
    var groupQuery = {
        "$groupBy": {
            "fields": [{
                "name": "payload.eventDateTime",
                "format": "e HH"
            }],
            "filterSpec": {
                "payload.streamid": {
                    "$operator": {
                        "in": streamids
                    }
                },
                "payload.actionTags": "wtf"
            },
            "projectionSpec": {
                "payload.eventDateTime": "date",
                "payload.properties": "properties"
            },
            "orderSpec": {}
        }
    };
    var hourlyWtfCount = {
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
            spec: JSON.stringify(hourlyWtfCount)
        },
        method: 'GET'
    };

    function callback(error, response, body) {
        if (!error && response.statusCode == 200) {
            var result = JSON.parse(body);
            result = result[0];
            if (_.isEmpty(result)) {
                deferred.resolve([]);
            } else {
                var hourlyWtfs = generateHoursForWeek(defaultEventValues);
                for (var date in result) {
                    if (hourlyWtfs[date] !== undefined) {
                        hourlyWtfs[date].hourlyEventCount = result[date].wtfCount;
                    }
                }
                deferred.resolve(rollupToArray(hourlyWtfs));
            }
        } else {
            deferred.reject(error);
        }
    }
    requestModule(options, callback);

    return deferred.promise;
};

var getHourlyHydrationCount = function(params) {
    var streams = params[0];
    var streamids = _.map(streams, function(stream) {
        return stream.streamid;
    });
    var deferred = q.defer();
    var groupQuery = {
        "$groupBy": {
            "fields": [{
                "name": "payload.eventDateTime",
                "format": "e HH"
            }],
            "filterSpec": {
                "payload.streamid": {
                    "$operator": {
                        "in": streamids
                    }
                },
                "payload.actionTags": "drink",
                "payload.objectTags": "Water"
            },
            "projectionSpec": {
                "payload.eventDateTime": "date",
                "payload.properties": "properties"
            },
            "orderSpec": {}
        }
    };
    var hourlyHydrationCount = {
        "$count": {
            "data": groupQuery,
            "filterSpec": {},
            "projectionSpec": {
                "resultField": "hydrationCount"
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
            spec: JSON.stringify(hourlyHydrationCount)
        },
        method: 'GET'
    };

    function callback(error, response, body) {
        if (!error && response.statusCode == 200) {
            var result = JSON.parse(body);
            result = result[0];
            if (_.isEmpty(result)) {
                deferred.resolve([]);
            } else {
                var hourlyHydration = generateHoursForWeek(defaultEventValues);
                for (var date in result) {
                    if (hourlyHydration[date] !== undefined) {
                        hourlyHydration[date].hourlyEventCount = result[date].hydrationCount;
                    }
                }
                deferred.resolve(rollupToArray(hourlyHydration));
            }
        } else {
            deferred.reject(error);
        }
    }
    requestModule(options, callback);

    return deferred.promise;
};

var getHourlyCaffeineCount = function(params) {
    var streams = params[0];
    var streamids = _.map(streams, function(stream) {
        return stream.streamid;
    });
    var deferred = q.defer();
    var groupQuery = {
        "$groupBy": {
            "fields": [{
                "name": "payload.eventDateTime",
                "format": "e HH"
            }],
            "filterSpec": {
                "payload.streamid": {
                    "$operator": {
                        "in": streamids
                    }
                },
                "payload.actionTags": "drink",
                "payload.objectTags": "Coffee"
            },
            "projectionSpec": {
                "payload.eventDateTime": "date",
                "payload.properties": "properties"
            },
            "orderSpec": {}
        }
    };
    var hourlyCaffeineCount = {
        "$count": {
            "data": groupQuery,
            "filterSpec": {},
            "projectionSpec": {
                "resultField": "caffeineCount"
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
            spec: JSON.stringify(hourlyCaffeineCount)
        },
        method: 'GET'
    };

    function callback(error, response, body) {
        if (!error && response.statusCode == 200) {
            var result = JSON.parse(body);
            result = result[0];
            if (_.isEmpty(result)) {
                deferred.resolve([]);
            } else {
                var hourlyCaffeine = generateHoursForWeek(defaultEventValues);
                for (var date in result) {
                    if (hourlyCaffeine[date] !== undefined) {
                        hourlyCaffeine[date].hourlyEventCount = result[date].caffeineCount;
                    }
                }
                deferred.resolve(rollupToArray(hourlyCaffeine));
            }
        } else {
            deferred.reject(error);
        }
    }
    requestModule(options, callback);

    return deferred.promise;
};
var getHourlyGithubPushEventsCount = function(streamid) {
    var deferred = q.defer();
    groupQuery = {
        "$groupBy": {
            "fields": [{
                "name": "payload.eventDateTime",
                "format": "e HH"
            }],
            "filterSpec": {
                "payload.streamid": {
                    "$operator": {
                        "in": [streamid]
                    }
                },
                "payload.actionTags": "Push"
            },
            "projectionSpec": {
                "payload.eventDateTime": "date",
                "payload.properties": "properties"
            },
            "orderSpec": {}
        }
    };
    hourlyGithubPushEventCount = {
        "$count": {
            "data": groupQuery,
            "filterSpec": {},
            "projectionSpec": {
                "resultField": "githubPushEventCount"
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
            spec: JSON.stringify(hourlyGithubPushEventCount)
        },
        method: 'GET'
    };

    function callback(error, response, body) {
        if (!error && response.statusCode == 200) {
            var result = JSON.parse(body);
            result = result[0];
            var hourlyGithubPushEvents = generateHoursForWeek(defaultEventValues);
            for (var date in result) {
                if (hourlyGithubPushEvents[date] !== undefined) {
                    hourlyGithubPushEvents[date].hourlyEventCount = result[date].githubPushEventCount;
                }
            }
            deferred.resolve(rollupToArray(hourlyGithubPushEvents));

        } else {
            deferred.reject(error);
        }
    }
    requestModule(options, callback);

    return deferred.promise;
};
var getMyActiveDuration = function(params) {
    var streams = params[0];
    var streamids = _.map(streams, function(stream) {
        return stream.streamid;
    });
    var deferred = q.defer();
    var lastMonth = moment().subtract('months', 1);

    var groupQuery = {
        "$groupBy": {
            "fields": [{
                "name": "payload.eventDateTime",
                "format": "MM/dd/yyyy"
            }],
            "filterSpec": {
                "payload.streamid": {
                    "$operator": {
                        "in": streamids
                    }
                },
                "payload.eventDateTime": {
                    "$operator": {
                        ">": {
                            "$date": moment(lastMonth).format()
                        }
                    }
                },
                "payload.actionTags": "Develop"
            },
            "projectionSpec": {
                "payload.eventDateTime": "date",
                "payload.properties": "properties"
            },
            "orderSpec": {}
        }
    };
    var sumOfActiveEvents = {
        "$sum": {
            "field": {
                "name": "properties.duration"
            },
            "data": groupQuery,
            "filterSpec": {},
            "projectionSpec": {
                "resultField": "totalActiveDuration"
            }
        }
    };
    var countOfActiveEvents = {
        "$count": {
            "data": groupQuery,
            "filterSpec": {},
            "projectionSpec": {
                "resultField": "activeCount"
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
            spec: JSON.stringify([sumOfActiveEvents,
                countOfActiveEvents
            ]),
            merge: true
        },
        method: 'GET'
    };
    var convertMillisToMinutes = function(milliseconds) {
        return Math.round(milliseconds / (1000 * 60) * 100) / 100;
    };

    function callback(error, response, body) {
        if (!error && response.statusCode == 200) {
            var result = JSON.parse(body);
            if (_.isEmpty(result)) {
                deferred.resolve([]);
            } else {
                var defaulActiveDurationValues = [{
                    key: "totalActiveDuration",
                    value: 0
                }, {
                    key: "inActiveCount",
                    value: 0
                }];
                var activeDurationByDay = generateDatesFor(defaulActiveDurationValues);
                for (var date in result) {
                    if (activeDurationByDay[date] !== undefined) {
                        activeDurationByDay[date].totalActiveDuration = convertMillisToMinutes(result[date].totalActiveDuration);
                        activeDurationByDay[date].inActiveCount = result[date].activeCount - 1;
                    }

                }
                deferred.resolve(rollupToArray(activeDurationByDay));
            }
        } else {
            deferred.reject(error);

        }
    }

    requestModule(options, callback);

    return deferred.promise;
};

var correlateGithubPushesAndIDEActivity = function(params) {
    var streams = params[0];
    var events = params[1];
    var streamids = _.map(streams, function(stream) {
        return stream.streamid;
    });
    var deferred = q.defer();
    var lastMonth = moment().subtract('months', 1);
    var groupBy = function(event) {
        return {
            "$groupBy": {
                "fields": [{
                    "name": "payload.eventDateTime",
                    "format": "MM/dd/yyyy"
                }],
                "filterSpec": {
                    "payload.streamid": {
                        "$operator": {
                            "in": streamids
                        }
                    },
                    "payload.actionTags": event
                },
                "projectionSpec": {
                    "payload.eventDateTime": "date",
                    "payload.properties": "properties"
                },
                "orderSpec": {}
            }
        }
    };
    var sumQuery = {
        "$sum": {
            "field": {
                "name": "properties.duration"
            },
            "data": groupBy(events[0]),
            "filterSpec": {},
            "projectionSpec": {
                "resultField": "activeTimeInMillis"
            }
        }
    };
    var countQuery = {
        "$count": {
            "data": groupBy(events[1]),
            "filterSpec": {},
            "projectionSpec": {
                "resultField": "githubPushEventCount"
            }
        }
    };

    var query = [sumQuery, countQuery];

    var options = {
        url: platformUri + '/rest/analytics/aggregate',
        auth: {
            user: "",
            password: encryptedPassword
        },
        qs: {
            spec: JSON.stringify(query),
            merge: true
        },
        method: 'GET'
    };
    var convertMillisToMinutes = function(milliseconds) {
        return Math.round(milliseconds / (1000 * 60) * 100) / 100;
    };

    function callback(error, response, body) {
        if (!error && response.statusCode == 200) {
            var result = JSON.parse(body);
            if (_.isEmpty(result)) {
                deferred.resolve([]);
            } else {
                for (var date in result) {
                    if (result[date].activeTimeInMillis == undefined) {
                        result[date].activeTimeInMillis = 0;
                    }
                    if (result[date].githubPushEventCount == undefined) {
                        result[date].githubPushEventCount = 0;
                    }
                    result[date].activeTimeInMinutes = convertMillisToMinutes(result[date].activeTimeInMillis);
                }
            }
            deferred.resolve(result);
        } else {
            deferred.reject(error);
        }
    }
    requestModule(options, callback);
    return deferred.promise;
};

app.all('*', function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,accept,x-requested-with,x-withio-delay');
    if (req.headers["x-withio-delay"]) {
        var delay = req.headers["x-withio-delay"];
        setTimeout(function() {
            next();
        }, delay);
    } else {
        next();
    }
});

app.get('/', function(request, response) {
    response.redirect('/dashboard');
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
    util.createStream(function(err, data) {
        if (err) {
            res.status(500).send("Database error");
        } else {
            res.send(data)
        }
    })
});


app.get('/stream/:id', function(req, res) {
    var readToken = req.headers.authorization;

    var spec = {
        streamid: req.params.id
    };

    mongoDbConnection(function(qdDb) {

        qdDb.collection('stream').find(spec, function(err, docs) {
            docs.toArray(function(err, streamArray) {
                var stream = streamArray[0] || {};
                if (stream.readToken != readToken) {
                    res.status(404).send("stream not found");
                } else {
                    var response = {
                        streamid: stream.streamid
                    };
                    res.send(JSON.stringify(response));
                }
            });
        });
    });
});

app.get('/event', function(req, res) {
    var encodedUsername = req.headers.authorization;
    validEncodedUsername(encodedUsername, req.query.forUsername)
        .then(getStreamIdForUsername)
        .then(getEventsForStreams)
        .then(function(response) {
            res.send(response);
        }).catch(function(error) {
            res.status(404).send("No stream associated with user.");
        });
});

app.get('/:ip', function(req, res) {
    requestModule('http://freegeoip.net/json/' + req.params.ip, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            res.send(body);
        }
    });
});

app.post('/stream/:id/event', postEvent);

app.get('/live/devbuild/:durationMins', function(req, res) {
    var fields = {
        _id: 0,
        streamid: 0
    };

    var durationMins = req.params.durationMins;
    var selectedEventType = req.query.eventType;
    var selectedLanguage = req.query.lang;
    var dateNow = new Date();
    var cutoff = new Date(dateNow - (durationMins * 1000 * 60));

    var filterSpec = {
        "payload.eventDateTime": {
            "$gte": {
                "$date": moment(cutoff).format()
            }
        },
        "payload.actionTags": ["Build", "wtf"]
    };
    if (selectedEventType) {
        filterSpec["payload.actionTags"] = selectedEventType;
    }
    if (selectedLanguage) {
        filterSpec["payload.properties.Language"] = selectedLanguage;
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
            res.send(info);
        } else {
            res.status(500).send("Something went wrong!");
        }
    }
    requestModule(options, callback);

});

app.get('/quantifieddev/mydev', function(req, res) {
    var encodedUsername = req.headers.authorization;
    var forUsername = req.query.forUsername;
    validEncodedUsername(encodedUsername, forUsername, [])
        .then(getStreamIdForUsername)
        .then(getBuildEventsFromPlatform)
        .then(function(response) {
            res.send(response);
        }).catch(function(error) {
            res.status(404).send("stream not found");
        });
});

app.get('/quantifieddev/mywtf', function(req, res) {
    var encodedUsername = req.headers.authorization;
    validEncodedUsername(encodedUsername, req.query.forUsername, [])
        .then(getStreamIdForUsername)
        .then(getMyWTFsFromPlatform)
        .then(function(response) {
            res.send(response);
        }).catch(function(error) {
            res.status(404).send("stream not found");
        });
});

app.get('/quantifieddev/myhydration', function(req, res) {
    var encodedUsername = req.headers.authorization;
    validEncodedUsername(encodedUsername, req.query.forUsername, [])
        .then(getStreamIdForUsername)
        .then(getMyHydrationEventsFromPlatform)
        .then(function(response) {
            res.send(response);
        }).catch(function(error) {
            res.status(404).send("stream not found");
        });
});

app.get('/quantifieddev/mycaffeine', function(req, res) {
    var encodedUsername = req.headers.authorization;
    validEncodedUsername(encodedUsername, req.query.forUsername, [])
        .then(getStreamIdForUsername)
        .then(getMyCaffeineEventsFromPlatform)
        .then(function(response) {
            res.send(response);
        }).catch(function(error) {
            res.status(404).send("stream not found");
        });
});

app.get('/quantifieddev/buildDuration', function(req, res) {
    var encodedUsername = req.headers.authorization;
    validEncodedUsername(encodedUsername, req.query.forUsername, [])
        .then(getStreamIdForUsername)
        .then(getAvgBuildDurationFromPlatform)
        .then(function(response) {
            res.send(response);
        }).catch(function(error) {
            res.status(404).send("stream not found");
        });
});

app.get('/quantifieddev/hourlyBuildCount', function(req, res) {
    var encodedUsername = req.headers.authorization;
    validEncodedUsername(encodedUsername, req.query.forUsername, [])
        .then(getStreamIdForUsername)
        .then(getHourlyBuildCountFromPlatform)
        .then(function(response) {
            res.send(response);
        }).catch(function(error) {
            res.status(404).send("stream not found");
        });
});

app.get('/quantifieddev/hourlyWtfCount', function(req, res) {
    var encodedUsername = req.headers.authorization;
    validEncodedUsername(encodedUsername, req.query.forUsername, [])
        .then(getStreamIdForUsername)
        .then(getHourlyWtfCount)
        .then(function(response) {
            res.send(response);
        }).catch(function(error) {
            res.status(404).send("stream not found");
        });
});

app.get('/quantifieddev/hourlyHydrationCount', function(req, res) {
    var encodedUsername = req.headers.authorization;
    validEncodedUsername(encodedUsername, req.query.forUsername, [])
        .then(getStreamIdForUsername)
        .then(getHourlyHydrationCount)
        .then(function(response) {
            res.send(response);
        }).catch(function(error) {
            res.status(404).send("stream not found");
        });
});

app.get('/quantifieddev/hourlyCaffeineCount', function(req, res) {
    var encodedUsername = req.headers.authorization;
    validEncodedUsername(encodedUsername, req.query.forUsername, [])
        .then(getStreamIdForUsername)
        .then(getHourlyCaffeineCount)
        .then(function(response) {
            res.send(response);
        }).catch(function(error) {
            res.status(404).send("stream not found");
        });
});

app.get('/quantifieddev/myActiveEvents', function(req, res) {
    var encodedUsername = req.headers.authorization;
    validEncodedUsername(encodedUsername, req.query.forUsername, [])
        .then(getStreamIdForUsername)
        .then(getMyActiveDuration)
        .then(function(response) {
            res.send(response);
        }).catch(function(error) {
            res.status(404).send("stream not found");
        });
});

app.get('/quantifieddev/hourlyGithubPushEvents', function(req, res) {
    var encodedUsername = req.headers.authorization;


    validEncodedUsername(encodedUsername, req.query.forUsername, [])
        .then(getGithubStreamIdForUsername)
        .then(getHourlyGithubPushEventsCount)
        .then(function(response) {
            res.send(response);
        }).catch(function(error) {
            console.log("Error is", error);
            res.status(404).send("stream not found");
        });
});

app.get('/quantifieddev/correlate', function(req, res) {
    var firstEvent = req.query.firstEvent;
    var secondEvent = req.query.secondEvent;
    console.log("Events to correlate are: " + firstEvent + secondEvent);
    var encodedUsername = req.headers.authorization;
    validEncodedUsername(encodedUsername, req.query.forUsername, [firstEvent, secondEvent])
        .then(getStreamIdForUsername)
        .then(correlateGithubPushesAndIDEActivity)
        .then(function(response) {
            res.send(response);
        }).catch(function(error) {
            res.status(404).send("stream not found");
        });
});

app.get('/quantifieddev/extensions/message', function(req, res) {
    var result = {
        text: "To get involved, receive updates or interact with the quantifieddev community, please go to quantifieddev.org."
    };
    res.send(JSON.stringify(result));
});

app.options('*', function(request, response) {
    response.header('Access-Control-Allow-Origin', '*');
    response.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    response.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,accept,x-requested-with,x-withio-delay');
    response.send();
});


var port = process.env.PORT || 5000;
app.listen(port, function() {
    console.log("Listening on " + port);
});