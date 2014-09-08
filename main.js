var requestModule = require('request');
var express = require("express");
var moment = require("moment");
var url = require('url');
var swig = require('swig');
var path = require('path');
var _ = require("underscore");
var opbeat = require('opbeat');
var session = require("express-session");
var q = require('q');
var mongoDbConnection = require('./lib/connection.js');
var util = require('./util');
var PasswordEncrypt = require('./lib/PasswordEncrypt');
var redis = require('redis');
var RedisStore = require('connect-redis')(session);
var logger = require('morgan');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');

var opbeatOptions = {
    organization_id: process.env.OPBEAT_ORGANIZATION_ID,
    app_id: process.env.OPBEAT_APP_ID,
    secret_token: process.env.OPBEAT_SECRET_TOKEN
};
var client = opbeat.createClient(opbeatOptions);

var app = express();

app.use(logger());
app.use(cookieParser());
var sessionSecret = process.env.SESSION_SECRET;
var redisURL = url.parse(process.env.REDISCLOUD_URL);
var redisClient = redis.createClient(redisURL.port, redisURL.hostname, {no_ready_check: true});
redisClient.auth(redisURL.auth.split(":")[1]);
app.use(session({
    store: new RedisStore({
        client: redisClient
    }),
    secret: sessionSecret,
    resave: false, // don't save session if unmodified
    saveUninitialized: false, // don't create session until something stored
    cookie: {
        maxAge: 2 * 365 * 24 * 60 * 60 * 1000, // 2 years
        secure: false // change to true when using https
    }
}));

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

app.engine('html', swig.renderFile);
app.use(express.static(path.join(__dirname, 'website/public')));
app.set('views', __dirname + '/website/views');
app.set('view engine', 'html');
/* app.set('view cache', false);
swig.setDefaults({
    cache: false
});*/

// Constants
var aDay = 24 * 60 * 60 * 1000;
var platformUri = process.env.PLATFORM_BASE_URI;
var sharedSecret = process.env.SHARED_SECRET;
console.log("sharedSecret : " + sharedSecret);

console.log('Connecting to PLATFORM_BASE_URI : ' + platformUri);

require('./githubOAuth')(app);

app.all('*', function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,accept,x-requested-with,x-withio-delay');
    if (req.headers["x-withio-delay"]) {
        var delay = req.headers["x-withio-delay"];
        setTimeout(function () {
            next();
        }, delay);
    } else {
        next();
    }
});


require('./quantifieddevRoutes')(app);

// Please keep it below inclusion of quantifieddevRoutes file.
app.use(opbeat.middleware.express(client));

var encryptedPassword = PasswordEncrypt.encryptPassword(sharedSecret);

var convertMillisToMinutes = function (milliseconds) {
    return Math.round(milliseconds / (1000 * 60) * 100) / 100;
};

var validEncodedUsername = function (encodedUsername, forUsername, params) {
    var deferred = q.defer();
    var encodedUsernameExists = {
        "encodedUsername": encodedUsername
    };

    mongoDbConnection(function (qdDb) {
        qdDb.collection('users').findOne(encodedUsernameExists, function (err, user) {
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
};

var getStreamIdForUsername = function (params) {
    var deferred = q.defer();
    var query = null;
    var usernames = params[0];
    var encodedUsername = usernames[0];
    var forUsername = usernames[1];
    if (!(_.isEmpty(forUsername)) && (forUsername !== 'undefined')) {
        query = {
            "username": forUsername.toLowerCase()
        };
    } else {
        query = {
            "encodedUsername": encodedUsername
        };
    }

    mongoDbConnection(function (qdDb) {
        qdDb.collection('users').findOne(query, {
            "streams": 1
        }, function (err, user) {
            if (err) {
                deferred.reject(err);
            } else {
                if (!user) {
                    deferred.reject("user not found");
                } else if (user.streams) {
                    var paramsToPassOn = [user.streams, params[1]];
                    deferred.resolve(paramsToPassOn);
                } else {
                    deferred.resolve([
                        [],
                        params[1]
                    ]);
                }
            }
        });
    });

    return deferred.promise;
};

var getGithubStreamIdForUsername = function (params) {
    var deferred = q.defer();
    var query = null;
    var usernames = params[0];
    var encodedUsername = usernames[0];
    var forUsername = usernames[1];
    if (!(_.isEmpty(forUsername)) && (forUsername !== 'undefined')) {
        query = {
            "username": forUsername.toLowerCase()
        };
    } else {
        query = {
            "encodedUsername": encodedUsername
        };
    }

    mongoDbConnection(function (qdDb) {
        qdDb.collection('users').findOne(query, {
            "githubUser.githubStreamId": 1
        }, function (err, user) {
            if (err) {
                console.log(err);
                deferred.reject(err);
            } else {
                if (!user) {
                    deferred.reject("user not found");
                } else if (user.githubUser.githubStreamId) {
                    deferred.resolve(user.githubUser.githubStreamId);
                } else {
                    deferred.resolve(null);
                }
            }
        });
    });

    return deferred.promise;
};

var saveEvent_driver = function (myEvent, stream, eventDateTime, res, rm) {
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
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                res.send(body);
            } else {
                res.status(500).send("Database error");
            }
        });
};

var authenticateWriteToken = function (token, id, error, success) {
    mongoDbConnection(function (qdDb) {
        qdDb.collection('stream').find({
            streamid: id
        }, function (err, docs) {
            docs.toArray(function (err, docsArray) {
                var stream = docsArray[0] || {};
                if (stream.writeToken != token) {
                    error();
                } else {
                    success({
                        streamid: stream.streamid
                    });
                }
            });
        });
    });
};

var postEvent = function (req, res) {
    var writeToken = req.headers.authorization;
    authenticateWriteToken(
        writeToken,
        req.params.id,
        function () {
            res.status(404).send("stream not found");
        },
        function (stream) {
            saveEvent_driver(req.body, stream, moment(new Date()).format(), res, requestModule);
        }
    );
};

var getEventsForStreams = function (params) {
    var streams = params[0];
    var streamids = _.map(streams, function (stream) {
        return stream.streamid;
    });
    var deferred = q.defer();
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

    var getEventsFromPlatform = function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var result = JSON.parse(body);
            deferred.resolve(result);
        } else {
            deferred.reject(error);
        }
    };
    requestModule(options, getEventsFromPlatform);
    return deferred.promise;
};

var getEventsCount = function () {
    var deferred = q.defer();

    var options = {
        url: platformUri + '/rest/events/eventsCount',
        auth: {
            user: "",
            password: encryptedPassword
        },
        method: 'GET'
    };

    var getEventsCountFromPlatform = function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var result = JSON.parse(body);
            deferred.resolve(result);
        } else {
            deferred.reject(error);
        }
    };
    requestModule(options, getEventsCountFromPlatform);
    return deferred.promise;
};

var generateDatesFor = function (defaultValues) {
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
            day = '0' + day;
        }
        var dateKey = (month) + '/' + day + '/' + eachDay.getFullYear();
        result[dateKey] = {
            date: dateKey
        };

        for (var index in defaultValues) {
            result[dateKey][defaultValues[index].key] = defaultValues[index].value;
        }
    }
    return result;
};

var rollupToArray = function (rollup) {
    var result = [];
    for (var r in rollup) {
        result.push(rollup[r]);
    }
    return result;
};

var groupByOnParameters = function (streamids, actionTag, objectTag) {
    var lastMonth = moment().subtract('months', 1);
    return {
        "$groupBy": {
            "fields": [
                {
                    "name": "payload.eventDateTime",
                    "format": "MM/dd/yyyy"
                }
            ],
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
                "payload.actionTags": actionTag,
                "payload.objectTags": objectTag
            },
            "projectionSpec": {
                "payload.eventDateTime": "date",
                "payload.properties": "properties"
            },
            "orderSpec": {}
        }
    };
};

var countOnParameters = function (groupQuery, filterSpec, resultField) {
    return {
        "$count": {
            "data": groupQuery,
            "filterSpec": filterSpec,
            "projectionSpec": {
                "resultField": resultField
            }
        }
    }
};

var transformPlatformDataToQDEvents = function (result) {
    return _.map(result, function (valueJson, date) {
        var keys = Object.keys(valueJson);
        var event = {
            "date": date
        };
        event[keys[0]] = valueJson[keys[0]];
        return event;
    });
};

var getMyActiveDuration = function (params) {
    var streams = params[0];
    var streamids = _.map(streams, function (stream) {
        return stream.streamid;
    });
    var deferred = q.defer();
    var groupQuery = groupByOnParameters(streamids, "Develop");
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
    var countOfActiveEvents = countOnParameters(groupQuery,{},"activeCount");
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

    function callback(error, response, body) {
        if (!error && response.statusCode === 200) {
            var result = JSON.parse(body);
            if (_.isEmpty(result)) {
                deferred.resolve([]);
            } else {
                var defaulActiveDurationValues = [
                    {
                        key: "totalActiveDuration",
                        value: 0
                    },
                    {
                        key: "inActiveCount",
                        value: 0
                    }
                ];
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

var getAvgBuildDurationFromPlatform = function (params) {
    var streams = params[0];
    var streamids = _.map(streams, function (stream) {
        return stream.streamid;
    });
    var deferred = q.defer();
    var groupQuery = groupByOnParameters(streamids, "Finish");
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
    var countBuildFinishEventsQuery = countOnParameters(groupQuery,{},"eventCount");
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
    var convertMillisToSeconds = function (milliseconds) {
        return Math.round(milliseconds / 1000 * 100) / 100;
    };

    function callback(error, response, body) {
        if (!error && response.statusCode == 200) {
            var result = JSON.parse(body);
            if (_.isEmpty(result)) {
                deferred.resolve([]);
            } else {
                var defaultBuildValues = [
                    {
                        key: "avgBuildDuration",
                        value: 0
                    }
                ];
                var buildDurationByDay = generateDatesFor(defaultBuildValues);
                for (var date in result) {
                    if (buildDurationByDay[date] !== undefined) {
                        var buildDurationInMillis = result[date].totalDuration / result[date].eventCount;
                        buildDurationByDay[date].avgBuildDuration = convertMillisToSeconds(buildDurationInMillis);
                    }
                }
                deferred.resolve(rollupToArray(buildDurationByDay));
            }
        } else {
            deferred.reject(error);
        }
    }

    requestModule(options, callback);
    return deferred.promise;
};

var getBuildEventsFromPlatform = function (params) {
    var streams = params[0];
    var streamids = _.map(streams, function (stream) {
        return stream.streamid;
    });
    var deferred = q.defer();
    var groupQuery = groupByOnParameters(streamids, "Finish");
    var countSuccessQuery = countOnParameters(groupQuery, {"properties.Result": "Success"}, "passed");
    var countFailureQuery = countOnParameters(groupQuery, {"properties.Result": "Failure"}, "failed");
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
                var defaultBuildValues = [
                    {
                        key: "passed",
                        value: 0
                    },
                    {
                        key: "failed",
                        value: 0
                    }
                ];
                var buildsByDay = generateDatesFor(defaultBuildValues);
                for (var date in result) {
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
};

var getMyWTFsFromPlatform = function (params) {
    var streams = params[0];
    var streamids = _.map(streams, function (stream) {
        return stream.streamid;
    });
    var deferred = q.defer();
    var groupQuery = groupByOnParameters(streamids, "wtf");
    var countWTFQuery = countOnParameters(groupQuery,{},"wtfCount");
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

    var sendWTFs = function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var result = JSON.parse(body)[0];
            var wtfEvents = transformPlatformDataToQDEvents(result);
            deferred.resolve(wtfEvents);
        } else {
            deferred.reject(error);
        }
    };
    requestModule(options, sendWTFs);
    return deferred.promise;
};

var getMyHydrationEventsFromPlatform = function (params) {
    var streams = params[0];
    var streamids = _.map(streams, function (stream) {
        return stream.streamid;
    });
    var deferred = q.defer();
    var groupQuery = groupByOnParameters(streamids, "drink", "Water");
    var countHydrationQuery = countOnParameters(groupQuery, {}, "hydrationCount");
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
    var sendHydrationCount = function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var result = JSON.parse(body)[0];
            var hydrationEvents = transformPlatformDataToQDEvents(result);
            deferred.resolve(hydrationEvents);
        } else {
            deferred.reject(error);
        }
    };
    requestModule(requestDetails, sendHydrationCount);
    return deferred.promise;
};

var getMyCaffeineEventsFromPlatform = function (params) {
    var streams = params[0];
    var streamids = _.map(streams, function (stream) {
        return stream.streamid;
    });
    var deferred = q.defer();
    var groupQuery = groupByOnParameters(streamids, "drink", "Coffee");
    var countCaffeineQuery = countOnParameters(groupQuery, {},"caffeineCount");
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
    var sendCaffeineCount = function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var result = JSON.parse(body)[0];
            var caffeineEvents = transformPlatformDataToQDEvents(result);
            deferred.resolve(caffeineEvents);
        } else {
            deferred.reject(error);
        }
    };
    requestModule(requestDetails, sendCaffeineCount);
    return deferred.promise;
};

var generateHoursForWeek = function (defaultValues) {
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
var generateWeek = function (defaultValues) {
    var result = {};
    var numberOfDaysToReportBuildsOn = 7;
    for (var i = 1; i <= numberOfDaysToReportBuildsOn; i++) {
        var day = i;
        result[day] = {
            day: day
        };
        for (var index in defaultValues) {
            result[day][defaultValues[index].key] = defaultValues[index].value;
        }
    }
    return result;
};

var defaultEventValues = [
    {
        key: "hourlyEventCount",
        value: 0
    }
];

var groupByForHourlyEvents= function(streamids, actionTag, objectTag) {
    return {
        "$groupBy": {
            "fields": [
                {
                    "name": "payload.eventDateTime",
                    "format": "e HH"
                }
            ],
            "filterSpec": {
                "payload.streamid": {
                    "$operator": {
                        "in": streamids
                    }
                },
                "payload.actionTags": actionTag,
                "payload.objectTags" : objectTag
            },
            "projectionSpec": {
                "payload.eventDateTime": "date",
                "payload.properties": "properties"
            },
            "orderSpec": {}
        }
    };
};

var getHourlyBuildCountFromPlatform = function (params) {
    var streams = params[0];
    var streamids = _.map(streams, function (stream) {
        return stream.streamid;
    });
    var deferred = q.defer();
    var groupQuery = groupByForHourlyEvents(streamids, "Finish");
    var hourlyBuildCount = countOnParameters(groupQuery,{},"buildCount");
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

var getHourlyWtfCount = function (params) {
    var streams = params[0];
    var streamids = _.map(streams, function (stream) {
        return stream.streamid;
    });
    var deferred = q.defer();
    var groupQuery = groupByForHourlyEvents(streamids, "wtf");
    var hourlyWtfCount = countOnParameters(groupQuery,{},"wtfCount");
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

var getHourlyHydrationCount = function (params) {
    var streams = params[0];
    var streamids = _.map(streams, function (stream) {
        return stream.streamid;
    });
    var deferred = q.defer();
    var groupQuery = groupByForHourlyEvents(streamids, "drink", "Water");
    var hourlyHydrationCount = countOnParameters(groupQuery,{},"hydrationCount");
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

var getHourlyCaffeineCount = function (params) {
    var streams = params[0];
    var streamids = _.map(streams, function (stream) {
        return stream.streamid;
    });
    var deferred = q.defer();
    var groupQuery = groupByForHourlyEvents(streamids, "drink","Coffee");
    var hourlyCaffeineCount = countOnParameters(groupQuery,{},"caffeineCount");
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

var getHourlyGithubPushEventsCount = function (streamid) {
    var deferred = q.defer();
    var groupQuery = groupByForHourlyEvents([streamid], "Push");
    var hourlyGithubPushEventCount = countOnParameters(groupQuery,{},"githubPushEventCount");
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
            if (_.isEmpty(result)) {
                deferred.resolve([]);
            }
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

var getTotalGithubUsersOfQd = function (params) {
    var deferred = q.defer();
    var query = {
        "githubUser.githubStreamId": {
            $exists: true
        }
    };
    mongoDbConnection(function (qdDb) {
        qdDb.collection('users').count(query, function (err, count) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve([count, params]);
            }
        });
    });
    return deferred.promise;
};

var getTotalUsersOfQd = function (params) {
    var deferred = q.defer();
    mongoDbConnection(function (qdDb) {
        qdDb.collection('users').count(function (err, count) {
            if (err) {
                deferred.reject(err);
            } else {
                var paramsToPassOn = params[0];
                deferred.resolve([count, paramsToPassOn]);
            }
        });
    });
    return deferred.promise;
};

var getGithubPushEventCountForCompare = function (params) {
    var deferred = q.defer();
    var lastMonth = moment().subtract('months', 1);
    var totalUsers = params[0];
    var streamid = params[1];
    var groupBy = function (filterSpecValue) {
        return {
            "$groupBy": {
                "fields": [
                    {
                        "name": "payload.eventDateTime",
                        "format": "MM/dd/yyyy"
                    }
                ],
                "filterSpec": filterSpecValue,
                "projectionSpec": {
                    "payload.eventDateTime": "date",
                    "payload.properties": "properties"
                },
                "orderSpec": {}
            }
        };
    };
    var myGithubPushEventGroupQuery = groupBy({
        "payload.streamid": {
            "$operator": {
                "in": [streamid]
            }
        },
        "payload.eventDateTime": {
            "$operator": {
                ">": {
                    "$date": moment(lastMonth).format()
                }
            }
        },
        "payload.actionTags": "Push"
    });
    var theirGithubPushEventGroupQuery = groupBy({
        "payload.streamid": {
            "$operator": {
                "nin": [streamid]
            }
        },
        "payload.eventDateTime": {
            "$operator": {
                ">": {
                    "$date": moment(lastMonth).format()
                }
            }
        },
        "payload.actionTags": "Push"
    });
    var myGithubPushEventCount = countOnParameters(myGithubPushEventGroupQuery, {}, "myGithubPushEventCount");
    var theirGithubPushEventCount = countOnParameters(theirGithubPushEventGroupQuery,{},"theirGithubPushEventCount");
    var options = {
        url: platformUri + '/rest/analytics/aggregate',
        auth: {
            user: "",
            password: encryptedPassword
        },
        qs: {
            spec: JSON.stringify([myGithubPushEventCount, theirGithubPushEventCount]),
            merge: true
        },
        method: 'GET'
    };
    function callback(error, response, body) {
        if (!error && response.statusCode === 200) {
            var result = JSON.parse(body);
            if (_.isEmpty(result)) {
                deferred.resolve([]);
            }
            var defaultGithubPushEventsForCompare = [
                {
                    key: "my",
                    value: 0
                },
                {
                    key: "avg",
                    value: 0
                }
            ];
            var githubPushEventsForCompare = generateDatesFor(defaultGithubPushEventsForCompare);
            for (var date in result) {
                if (githubPushEventsForCompare[date] !== undefined) {
                    if (result[date].myGithubPushEventCount === undefined) {
                        result[date].myGithubPushEventCount = 0;
                    }
                    if (result[date].theirGithubPushEventCount === undefined) {
                        result[date].theirGithubPushEventCount = 0;
                    }
                    githubPushEventsForCompare[date].my = result[date].myGithubPushEventCount;
                    githubPushEventsForCompare[date].avg = result[date].theirGithubPushEventCount / (totalUsers - 1);
                }
            }
            deferred.resolve(rollupToArray(githubPushEventsForCompare));

        } else {
            deferred.reject(error);
        }
    }

    requestModule(options, callback);

    return deferred.promise;
};

var getIdeActivityDurationForCompare = function (params) {
    var deferred = q.defer();
    var lastMonth = moment().subtract('months', 1);
    var totalUsers = params[0];
    var streams = params[1];
    var streamids = _.map(streams, function (stream) {
        return stream.streamid;
    });
    var groupBy = function (filterSpecValue) {
        return {
            "$groupBy": {
                "fields": [
                    {
                        "name": "payload.eventDateTime",
                        "format": "MM/dd/yyyy"
                    }
                ],
                "filterSpec": filterSpecValue,
                "projectionSpec": {
                    "payload.eventDateTime": "date",
                    "payload.properties": "properties"
                },
                "orderSpec": {}
            }
        };
    };
    var myIdeActivityDuration = {
        "$sum": {
            "field": {
                "name": "properties.duration"
            },
            "data": groupBy({
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
            }),
            "filterSpec": {},
            "projectionSpec": {
                "resultField": "myIdeActivityDuration"
            }
        }
    };

    var restOfTheWorldIdeActivityDuration = {
        "$sum": {
            "field": {
                "name": "properties.duration"
            },
            "data": groupBy({
                "payload.streamid": {
                    "$operator": {
                        "nin": streamids
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
            }),
            "filterSpec": {},
            "projectionSpec": {
                "resultField": "restOfTheWorldIdeActivityDuration"
            }
        }
    };

    console.log("query : " + JSON.stringify([myIdeActivityDuration, restOfTheWorldIdeActivityDuration]));
    var options = {
        url: platformUri + '/rest/analytics/aggregate',
        auth: {
            user: "",
            password: encryptedPassword
        },
        qs: {
            spec: JSON.stringify([myIdeActivityDuration, restOfTheWorldIdeActivityDuration]),
            merge: true
        },
        method: 'GET'
    };

    function callback(error, response, body) {
        if (!error && response.statusCode === 200) {
            var result = JSON.parse(body);
            var defaultIdeActivityDurationForCompare = [
                {
                    key: "my",
                    value: 0
                },
                {
                    key: "avg",
                    value: 0
                }
            ];
            var ideActivityDurationForCompare = generateDatesFor(defaultIdeActivityDurationForCompare);
            for (var date in result) {
                if (ideActivityDurationForCompare[date] !== undefined) {
                    if (result[date].myIdeActivityDuration === undefined) {
                        result[date].myIdeActivityDuration = 0;
                    }
                    if (result[date].restOfTheWorldIdeActivityDuration === undefined) {
                        result[date].restOfTheWorldIdeActivityDuration = 0;
                    }
                    ideActivityDurationForCompare[date].my = convertMillisToMinutes(result[date].myIdeActivityDuration);
                    var durationInMins = convertMillisToMinutes(result[date].restOfTheWorldIdeActivityDuration);
                    ideActivityDurationForCompare[date].avg = durationInMins / (totalUsers - 1);
                }
            }
            deferred.resolve(rollupToArray(ideActivityDurationForCompare));

        } else {
            deferred.reject(error);
        }
    }

    requestModule(options, callback);

    return deferred.promise;
};

var getDailyGithubPushEventsCount = function (streamid) {
    var deferred = q.defer();
    var groupQuery = {
        "$groupBy": {
            "fields": [
                {
                    "name": "payload.eventDateTime",
                    "format": "e"
                }
            ],
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
    var dailyGithubPushEventCount = countOnParameters(groupQuery,{},"githubPushEventCount");
    var options = {
        url: platformUri + '/rest/analytics/aggregate',
        auth: {
            user: "",
            password: encryptedPassword
        },
        qs: {
            spec: JSON.stringify(dailyGithubPushEventCount)
        },
        method: 'GET'
    };

    function callback(error, response, body) {
        if (!error && response.statusCode === 200) {
            var result = JSON.parse(body);
            result = result[0];
            if (_.isEmpty(result)) {
                deferred.resolve([]);
            }
            var defaultEventValues = [
                {
                    key: "dailyEventCount",
                    value: 0
                }
            ];
            var dailyGithubPushEvents = generateWeek(defaultEventValues);
            for (var date in result) {
                if (dailyGithubPushEvents[date] !== undefined) {
                    dailyGithubPushEvents[date].dailyEventCount = result[date].githubPushEventCount;
                }
            }
            deferred.resolve(rollupToArray(dailyGithubPushEvents));

        } else {
            deferred.reject(error);
        }
    }

    requestModule(options, callback);

    return deferred.promise;
};

var correlateGithubPushesAndIDEActivity = function (params) {
    var streams = params[0];
    var events = params[1];
    var streamids = _.map(streams, function (stream) {
        return stream.streamid;
    });
    var deferred = q.defer();
    var sumQuery = {
        "$sum": {
            "field": {
                "name": "properties.duration"
            },
            "data": groupByOnParameters(streamids, events[0]),
            "filterSpec": {},
            "projectionSpec": {
                "resultField": "activeTimeInMillis"
            }
        }
    };
    var countQuery = {
        "$count": {
            "data": groupByOnParameters(streamids, events[1]),
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
    function callback(error, response, body) {
        if (!error && response.statusCode == 200) {
            var result = JSON.parse(body);
            if (_.isEmpty(result)) {
                deferred.resolve([]);
            } else {
                for (var date in result) {
                    if (result[date].activeTimeInMillis === undefined) {
                        result[date].activeTimeInMillis = 0;
                    }
                    if (result[date].githubPushEventCount === undefined) {
                        result[date].githubPushEventCount = 0;
                    }
                    result[date].activeTimeInMinutes = convertMillisToMinutes(result[date].activeTimeInMillis);
                    result[date].date = date;
                }
                deferred.resolve(result);
            }
        } else {
            deferred.reject(error);
        }
    }
    requestModule(options, callback);
    return deferred.promise;
};

app.get('/', function (request, response) {
    response.redirect('/dashboard');
});

app.post('/echo', function (request, response) {
    console.log(request.body);
    response.send(request.body);
});

app.get('/health', function (request, response) {
    response.send("I'm alive");
});

app.get('/demo', function (request, response) {
    response.send("This is a demo");
});

app.get('/users_count', function (req, res) {
    mongoDbConnection(function (qdDb) {
        qdDb.collection('users').count(function (err, count) {
            if (err) {
                console.log("Err", err);
            } else {
                res.send({
                    count: count
                });
            }
        });
    });
});

app.get('/users/active', function (req, res) {
    var query = {
        "lastAccess": {
            "$gt": new Date(moment().format("MM/DD/YYYY"))
        }
    };
    mongoDbConnection(function (qdDb) {
        qdDb.collection('sessions').distinct("username", query, function (err, activeUsers) {
            if (err) {
                console.log("Err", err);
            } else {
                res.send({
                    count: activeUsers.length
                });
            }
        });
    });
});

app.get('/recent_signups', function (req, res) {
    mongoDbConnection(function (qdDb) {
        qdDb.collection('users').find({}, {
            "githubUser.profileUrl": true
        }, {
            "sort": [
                ["_id", -1]
            ],
            "limit": "10"
        }, function (error, results) {
            results.toArray(function (err, users) {
                if (err) {
                    console.log("Err", err);
                } else {
                    console.log("Data is", users);
                    res.send(users);
                }
            });
            if (error) {
                console.log("Err", error);
            }
        });
    });
});

app.post('/stream', function (req, res) {
    util.createStream(function (err, data) {
        if (err) {
            res.status(500).send("Database error");
        } else {
            res.send(data);
        }
    });
});

app.get('/stream/:id', function (req, res) {
    var readToken = req.headers.authorization;
    var spec = {
        streamid: req.params.id
    };
    mongoDbConnection(function (qdDb) {
        qdDb.collection('stream').find(spec, function (err, docs) {
            docs.toArray(function (err, streamArray) {
                var stream = streamArray[0] || {};
                if (stream.readToken !== readToken) {
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

app.get('/event', function (req, res) {
    var encodedUsername = req.headers.authorization;
    validEncodedUsername(encodedUsername, req.query.forUsername, [])
        .then(getStreamIdForUsername)
        .then(getEventsForStreams)
        .then(function (response) {
            res.send(response);
        }).catch(function (error) {
            res.status(404).send("No stream associated with user.");
        });
});

app.get('/eventsCount', function (req, res) {
    getEventsCount()
        .then(function (response) {
            res.send(response);
        }).catch(function (error) {
            console.log("Err", error);
            res.status(400).send("Invalid request");
        });
});

app.post('/stream/:id/event', postEvent);

app.get('/live/devbuild/:durationMins', function (req, res) {
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
        if (!error && response.statusCode === 200) {
            var info = JSON.parse(body);
            res.send(info);
        } else {
            res.status(500).send("Something went wrong!");
        }
    }

    requestModule(options, callback);
});

app.get('/quantifieddev/mydev', function (req, res) {
    var encodedUsername = req.headers.authorization;
    var forUsername = req.query.forUsername;
    validEncodedUsername(encodedUsername, forUsername, [])
        .then(getStreamIdForUsername)
        .then(getBuildEventsFromPlatform)
        .then(function (response) {
            res.send(response);
        }).catch(function (error) {
            console.log("error during fetching /mydev data ", error);
            res.status(404).send("cannot fetch mydev data");
        });
});

app.get('/quantifieddev/mywtf', function (req, res) {
    var encodedUsername = req.headers.authorization;
    validEncodedUsername(encodedUsername, req.query.forUsername, [])
        .then(getStreamIdForUsername)
        .then(getMyWTFsFromPlatform)
        .then(function (response) {
            res.send(response);
        }).catch(function (error) {
            res.status(404).send("stream not found");
        });
});

app.get('/quantifieddev/myhydration', function (req, res) {
    var encodedUsername = req.headers.authorization;
    validEncodedUsername(encodedUsername, req.query.forUsername, [])
        .then(getStreamIdForUsername)
        .then(getMyHydrationEventsFromPlatform)
        .then(function (response) {
            res.send(response);
        }).catch(function (error) {
            res.status(404).send("stream not found");
        });
});

app.get('/quantifieddev/mycaffeine', function (req, res) {
    var encodedUsername = req.headers.authorization;
    validEncodedUsername(encodedUsername, req.query.forUsername, [])
        .then(getStreamIdForUsername)
        .then(getMyCaffeineEventsFromPlatform)
        .then(function (response) {
            res.send(response);
        }).catch(function (error) {
            res.status(404).send("stream not found");
        });
});

app.get('/quantifieddev/buildDuration', function (req, res) {
    var encodedUsername = req.headers.authorization;
    validEncodedUsername(encodedUsername, req.query.forUsername, [])
        .then(getStreamIdForUsername)
        .then(getAvgBuildDurationFromPlatform)
        .then(function (response) {
            res.send(response);
        }).catch(function (error) {
            res.status(404).send("stream not found");
        });
});

app.get('/quantifieddev/hourlyBuildCount', function (req, res) {
    var encodedUsername = req.headers.authorization;
    validEncodedUsername(encodedUsername, req.query.forUsername, [])
        .then(getStreamIdForUsername)
        .then(getHourlyBuildCountFromPlatform)
        .then(function (response) {
            res.send(response);
        }).catch(function (error) {
            res.status(404).send("stream not found");
        });
});

app.get('/quantifieddev/hourlyWtfCount', function (req, res) {
    var encodedUsername = req.headers.authorization;
    validEncodedUsername(encodedUsername, req.query.forUsername, [])
        .then(getStreamIdForUsername)
        .then(getHourlyWtfCount)
        .then(function (response) {
            res.send(response);
        }).catch(function (error) {
            res.status(404).send("stream not found");
        });
});

app.get('/quantifieddev/hourlyHydrationCount', function (req, res) {
    var encodedUsername = req.headers.authorization;
    validEncodedUsername(encodedUsername, req.query.forUsername, [])
        .then(getStreamIdForUsername)
        .then(getHourlyHydrationCount)
        .then(function (response) {
            res.send(response);
        }).catch(function (error) {
            res.status(404).send("stream not found");
        });
});

app.get('/quantifieddev/hourlyCaffeineCount', function (req, res) {
    var encodedUsername = req.headers.authorization;
    validEncodedUsername(encodedUsername, req.query.forUsername, [])
        .then(getStreamIdForUsername)
        .then(getHourlyCaffeineCount)
        .then(function (response) {
            res.send(response);
        }).catch(function (error) {
            res.status(404).send("stream not found");
        });
});

app.get('/quantifieddev/myActiveEvents', function (req, res) {
    var encodedUsername = req.headers.authorization;
    validEncodedUsername(encodedUsername, req.query.forUsername, [])
        .then(getStreamIdForUsername)
        .then(getMyActiveDuration)
        .then(function (response) {
            res.send(response);
        }).catch(function (error) {
            res.status(404).send("stream not found");
        });
});

app.get('/quantifieddev/githubPushEventForCompare', function (req, res) {
    var encodedUsername = req.headers.authorization;
    validEncodedUsername(encodedUsername, req.query.forUsername, [])
        .then(getGithubStreamIdForUsername)
        .then(getTotalGithubUsersOfQd)
        .then(getGithubPushEventCountForCompare)
        .then(function (response) {
            res.send(response);
        }).catch(function (error) {
            res.status(404).send("stream not found");
        });
});

app.get('/quantifieddev/compare/ideActivity', function (req, res) {
    var encodedUsername = req.headers.authorization;
    validEncodedUsername(encodedUsername, req.query.forUsername, [])
        .then(getStreamIdForUsername)
        .then(getTotalUsersOfQd)
        .then(getIdeActivityDurationForCompare)
        .then(function (response) {
            res.send(response);
        }).catch(function (error) {
            res.status(404).send("stream not found");
        });
});

app.get('/quantifieddev/hourlyGithubPushEvents', function (req, res) {
    var encodedUsername = req.headers.authorization;
    validEncodedUsername(encodedUsername, req.query.forUsername, [])
        .then(getGithubStreamIdForUsername)
        .then(getHourlyGithubPushEventsCount)
        .then(function (response) {
            res.send(response);
        }).catch(function (error) {
            console.log("Error is", error);
            res.status(404).send("stream not found");
        });
});

app.get('/quantifieddev/dailyGithubPushEvents', function (req, res) {
    var encodedUsername = req.headers.authorization;
    validEncodedUsername(encodedUsername, req.query.forUsername, [])
        .then(getGithubStreamIdForUsername)
        .then(getDailyGithubPushEventsCount)
        .then(function (response) {
            res.send(response);
        }).catch(function (error) {
            console.log("Error is", error);
            res.status(404).send("stream not found");
        });
});

app.get('/quantifieddev/correlate', function (req, res) {
    var firstEvent = req.query.firstEvent;
    var secondEvent = req.query.secondEvent;
    var encodedUsername = req.headers.authorization;
    validEncodedUsername(encodedUsername, req.query.forUsername, [firstEvent, secondEvent])
        .then(getStreamIdForUsername)
        .then(correlateGithubPushesAndIDEActivity)
        .then(function (response) {
            res.send(response);
        }).catch(function (error) {
            res.status(404).send("stream not found");
        });
});

app.get('/quantifieddev/extensions/message', function (req, res) {
    var result = {
        text: "To get involved, receive updates or interact with the quantifieddev community, please go to quantifieddev.org."
    };
    res.send(JSON.stringify(result));
});

app.options('*', function (request, response) {
    response.header('Access-Control-Allow-Origin', '*');
    response.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    response.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,accept,x-requested-with,x-withio-delay');
    response.send();
});

// Handle 404
app.use(function (req, res) {
    res.status(404);
    res.render('404.html');
});

// Handle 500
app.use(function (error, req, res, next) {
    res.status(500);
    res.render('500.html');
});

var port = process.env.PORT || 5000;
app.listen(port, function () {
    console.log("Listening on " + port);
});
