var express = require("express");
var moment = require("moment");
var url = require('url');
var swig = require('swig');
var path = require('path');
var _ = require("underscore");
var session = require("express-session");
var q = require('q');
var util = require('./util');
var redis = require('redis');
var RedisStore = require('connect-redis')(session);
var logger = require('morgan');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var fs = require('fs');
var validateRequest = require("./validateRequest");
var validator = require('validator');
var mongoRespository = require('./mongoRepository.js');
var platformService = require('./platformService.js');
var CONTEXT_URI = process.env.CONTEXT_URI;

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

require('./oAuth')(app);

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
require('./controllers/integrationsController')(app);

var periodMap = {
    daily: "MM/dd/yyyy",
    hourOfDay: "e HH"
};

var convertSecsToMinutes = function (seconds) {
    return Math.round(seconds / 60 * 100) / 100;
};

var validEncodedUsername = function (encodedUsername) {
    var deferred = q.defer();
    var query = {
        "encodedUsername": encodedUsername
    };
    mongoRespository.findOne('users', query)
        .then(function (user) {
            if (user) {
                deferred.resolve();
            } else {
                deferred.reject();
            }
        }, function (err) {
            console.log("Error is", err);
            deferred.reject(err);
        });

    return deferred.promise;
};

var validateShareTokenAndGraphUrl = function (shareToken, graphUrl) {
    var deferred = q.defer();
    var graphShareObject = {"graphUrl": graphUrl, "shareToken": shareToken};

    checkGraphAlreadyShared(graphShareObject)
        .then(function (graphShareObject) {
            if (graphShareObject) {
                deferred.resolve();
            } else {
                deferred.reject("Invalid input");
            }
        }).catch(function (err) {
            console.log("Error is", err);
            deferred.reject(err);
        });

    return deferred.promise;
};

var checkGraphAlreadyShared = function (graphShareObject) {
    var deferred = q.defer();
    mongoRespository.findOne('graphShares', graphShareObject)
        .then(function (graphShareObject) {
            deferred.resolve(graphShareObject);
        }, function (err) {
            deferred.reject(err);
        });
    return deferred.promise;
};

var getStreamIdForUsername = function (encodedUsername, forUsername) {
    var deferred = q.defer();
    var query = null;
    if (!(_.isEmpty(forUsername)) && (forUsername !== 'undefined')) {
        query = {
            "username": forUsername.toLowerCase()
        };
    } else {
        query = {
            "encodedUsername": encodedUsername
        };
    }
    var projection = {
        "streams": 1
    };
    mongoRespository.findOne('users', query, projection)
        .then(function (user) {
            if (!user) {
                deferred.reject("user not found");
            } else if (user.streams) {
                console.log("Streams: " + JSON.stringify(user.streams));
                deferred.resolve(user.streams);
            } else {
                deferred.resolve([]);
            }
        }, function (err) {
            deferred.reject(err);
        });
    return deferred.promise;
};

var saveEvent = function (myEvent, stream, res) {
    myEvent.streamid = stream.streamid;
    var dateInfo = formatEventDateTime(myEvent.dateTime);
    myEvent.eventDateTime = dateInfo.eventDateTime;
    myEvent.eventLocalDateTime = dateInfo.eventLocalDateTime;
    myEvent.offset = dateInfo.offset;
    return platformService.saveEvent(myEvent);
};

var authenticateWriteToken = function (writeToken, id) {
    var deferred = q.defer();
    var query = {
        streamid: id
    };
    mongoRespository.findOne('stream', query)
        .then(function (stream) {
            if (stream === null || stream.writeToken !== writeToken) {
                deferred.reject();
            } else {
                deferred.resolve({
                    streamid: stream.streamid
                });
            }
        });

    return deferred.promise;
};

var postEvent = function (req, res) {
    var writeToken = req.headers.authorization;
    authenticateWriteToken(writeToken, req.params.id)
        .then(function (stream) {
            return saveEvent(req.body, stream);
        },
        function () {
            res.status(404).send("stream not found");
        })
        .then(function (result) {
            res.send(result);
        }, function (err) {
            res.status(500).send("Database error.");
        });
};

var generateDatesFor = function (defaultValues) {
    var result = {};
    var numberOfDaysToReportBuildsOn = 30;
    var currentDate = new Date();
    var aDay = 24 * 60 * 60 * 1000;
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

var getQueryForStreamIdActionTagAndObjectTag = function (streamids, actionTag, objectTag) {
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

var groupByOnParametersForLastMonth = function (streamids, actionTag, objectTag) {
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
                            "$date": moment(lastMonth).toISOString()
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
    };
};

var sumOnParameters = function (sumField, groupQuery, filterSpec, resultField) {
    return {
        "$sum": {
            "field": {
                "name": sumField
            },
            "data": groupQuery,
            "filterSpec": filterSpec,
            "projectionSpec": {
                "resultField": resultField
            }
        }
    };
};

var transformPlatformDataToQDEvents = function (result) {
    return _.map(result, function (valueJson, date) {
        var keys = Object.keys(valueJson);
        var event = {
            "date": date
        };
        for (var i = 0; i < keys.length; i++) {
            event[keys[i]] = valueJson[keys[i]];
        }
        return event;
    });
};

var getBuildEventsFromPlatform = function (streams) {
    var deferred = q.defer();
    var streamids = _.map(streams, function (stream) {
        return stream.streamid;
    });
    var groupQuery = groupByOnParametersForLastMonth(streamids, "Finish");
    var countSuccessQuery = countOnParameters(groupQuery, {"properties.Result": "Success"}, "passed");
    var countFailureQuery = countOnParameters(groupQuery, {"properties.Result": "Failure"}, "failed");
    var query = {
        spec: JSON.stringify([countSuccessQuery, countFailureQuery]),
        merge: true
    };
    var processResult = function (result) {
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
    };
    platformService.aggregate(query)
        .then(processResult, function (err) {
            deferred.reject(err);
        });
    return deferred.promise;
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

var getTotalUsersOfQd = function (streams) {
    var deferred = q.defer();
    mongoRespository.count('users', {})
        .then(function (count) {
            deferred.resolve([count, streams]);
        }, function (err) {
            deferred.reject(err);
        });
    return deferred.promise;
};

var getGithubPushEventCountForCompare = function (params) {
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
    var myGithubPushEventGroupQuery = groupBy({
        "payload.streamid": {
            "$operator": {
                "in": streamids
            }
        },
        "payload.eventDateTime": {
            "$operator": {
                ">": {
                    "$date": moment(lastMonth).toISOString()
                }
            }
        },
        "payload.actionTags": "Push"
    });
    var theirGithubPushEventGroupQuery = groupBy({
        "payload.streamid": {
            "$operator": {
                "nin": streamids
            }
        },
        "payload.eventDateTime": {
            "$operator": {
                ">": {
                    "$date": moment(lastMonth).toISOString()
                }
            }
        },
        "payload.actionTags": "Push"
    });
    var myGithubPushEventCount = countOnParameters(myGithubPushEventGroupQuery, {}, "myGithubPushEventCount");
    var theirGithubPushEventCount = countOnParameters(theirGithubPushEventGroupQuery, {}, "theirGithubPushEventCount");

    var query = {
        spec: JSON.stringify([myGithubPushEventCount, theirGithubPushEventCount]),
        merge: true
    };
    var processResult = function (result) {
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
    };
    platformService.aggregate(query)
        .then(processResult, function (err) {
            deferred.reject(err);
        });

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
                            "$date": moment(lastMonth).toISOString()
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
                            "$date": moment(lastMonth).toISOString()
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
    var query = {
        spec: JSON.stringify([myIdeActivityDuration, restOfTheWorldIdeActivityDuration]),
        merge: true
    };
    var processResult = function (result) {
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
                ideActivityDurationForCompare[date].my = convertSecsToMinutes(result[date].myIdeActivityDuration);
                var durationInMins = convertSecsToMinutes(result[date].restOfTheWorldIdeActivityDuration);
                ideActivityDurationForCompare[date].avg = durationInMins / (totalUsers - 1);
            }
        }
        deferred.resolve(rollupToArray(ideActivityDurationForCompare));
    };
    platformService.aggregate(query)
        .then(processResult, function (err) {
            deferred.reject(error);
        });
    return deferred.promise;
};

var getDailyGithubPushEventsCount = function (streams) {
    var deferred = q.defer();
    var streamids = _.map(streams, function (stream) {
        return stream.streamid;
    });
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
                        "in": streamids
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
    var dailyGithubPushEventCount = countOnParameters(groupQuery, {}, "githubPushEventCount");

    var query = {
        spec: JSON.stringify(dailyGithubPushEventCount)
    };
    var processResult = function (result) {
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
    };

    platformService.aggregate(query)
        .then(processResult, function (err) {
            deferred.reject(error);
        });

    return deferred.promise;
};

var correlateStepsAndTracks = function (streams) {
    var streamids = _.map(streams, function (stream) {
        return stream.streamid;
    });
    var deferred = q.defer();
    var sumQuery = {
        "$sum": {
            "field": {
                "name": "properties.numberOfSteps"
            },
            "data": getQueryForStreamIdActionTagAndObjectTag(streamids, 'walked', 'steps'),
            "filterSpec": {},
            "projectionSpec": {
                "resultField": "stepSum"
            }
        }
    };
    var countQuery = {
        "$count": {
            "data": getQueryForStreamIdActionTagAndObjectTag(streamids, 'listen', 'music'),
            "filterSpec": {},
            "projectionSpec": {
                "resultField": "musicListenCount"
            }
        }
    };
    var query = {
        spec: JSON.stringify([sumQuery, countQuery]),
        merge: true
    };
    var processResult = function (result) {
        if (_.isEmpty(result)) {
            deferred.resolve([]);
        } else {
            for (var date in result) {
                if (result[date].stepSum === undefined) {
                    result[date].stepSum = 0;
                }
                if (result[date].musicListenCount === undefined) {
                    result[date].musicListenCount = 0;
                }
                result[date].date = date;
            }
            deferred.resolve(result);
        }
    };
    platformService.aggregate(query)
        .then(processResult, function (err) {
            deferred.reject(err);
        });
    return deferred.promise;
};

var correlateIDEActivityAndTracks = function (streams) {
    var streamids = _.map(streams, function (stream) {
        return stream.streamid;
    });
    var deferred = q.defer();
    var sumQuery = {
        "$sum": {
            "field": {
                "name": "properties.duration"
            },
            "data": getQueryForStreamIdActionTagAndObjectTag(streamids, 'Develop', 'Software'),
            "filterSpec": {},
            "projectionSpec": {
                "resultField": "activeTimeInSecs"
            }
        }
    };
    var countQuery = {
        "$count": {
            "data": getQueryForStreamIdActionTagAndObjectTag(streamids, 'listen', 'music'),
            "filterSpec": {},
            "projectionSpec": {
                "resultField": "musicListenCount"
            }
        }
    };
    var query = {
        spec: JSON.stringify([sumQuery, countQuery]),
        merge: true
    };
    var processResult = function (result) {
        if (_.isEmpty(result)) {
            deferred.resolve([]);
        } else {
            for (var date in result) {
                if (result[date].activeTimeInSecs === undefined) {
                    result[date].activeTimeInSecs = 0;
                }
                if (result[date].musicListenCount === undefined) {
                    result[date].musicListenCount = 0;
                }
                result[date].activeTimeInMinutes = convertSecsToMinutes(result[date].activeTimeInSecs);
                result[date].date = date;
            }
            deferred.resolve(result);
        }
    };
    platformService.aggregate(query)
        .then(processResult, function (err) {
            deferred.reject(err);
        });
    return deferred.promise;
};

var correlateGithubPushesAndIDEActivity = function (streams, firstEvent, secondEvent) {
    var streamids = _.map(streams, function (stream) {
        return stream.streamid;
    });
    var deferred = q.defer();
    var sumQuery = {
        "$sum": {
            "field": {
                "name": "properties.duration"
            },
            "data": getQueryForStreamIdActionTagAndObjectTag(streamids, firstEvent),
            "filterSpec": {},
            "projectionSpec": {
                "resultField": "activeTimeInSecs"
            }
        }
    };
    var countQuery = {
        "$count": {
            "data": getQueryForStreamIdActionTagAndObjectTag(streamids, secondEvent),
            "filterSpec": {},
            "projectionSpec": {
                "resultField": "githubPushEventCount"
            }
        }
    };
    var query = {
        spec: JSON.stringify([sumQuery, countQuery]),
        merge: true
    };
    var processResult = function (result) {
        if (_.isEmpty(result)) {
            deferred.resolve([]);
        } else {
            for (var date in result) {
                if (result[date].activeTimeInSecs === undefined) {
                    result[date].activeTimeInSecs = 0;
                }
                if (result[date].githubPushEventCount === undefined) {
                    result[date].githubPushEventCount = 0;
                }
                result[date].activeTimeInMinutes = convertSecsToMinutes(result[date].activeTimeInSecs);
                result[date].date = date;
            }
            deferred.resolve(result);
        }
    };
    platformService.aggregate(query)
        .then(processResult, function (err) {
            deferred.reject(err);
        });
    return deferred.promise;
};

app.get('/', function (request, response) {
    response.redirect('/timeline');
});

app.get('/health', function (request, response) {
    response.send("I'm alive");
});

app.get('/users_count', function (req, res) {
    mongoRespository.count('users', {}).then(function (count) {
        if (!count) {
            res.send(400, "Error")
        } else {
            res.send({
                count: count
            });
        }
    });
});

app.get('/recent_signups', function (req, res) {
    mongoRespository.find('users', {
        "profile.profileUrl": {$exists: true}
    }, {
        "sort": [
            ["_id", -1]
        ],
        "limit": "10"
    }).then(function (users) {
        res.send(users);
    }).catch(function (err) {
        res.send(err);
    });
});

var validateClient = function (appId, appSecret) {
    var deferred = q.defer();
    var query = {
        appId: appId,
        appSecret: appSecret
    };

    mongoRespository.findOne('registeredApps', query)
        .then(function (result) {
            if (!result) {
                deferred.reject();
            } else {
                deferred.resolve();
            }
        }, function (err) {
            deferred.reject(err);
        });
    return deferred.promise;
};

app.post('/stream', function (req, res) {
    util.createStream(function (err, data) {
        if (err) {
            res.status(500).send("Database error");
        } else {
            delete data._id;
            res.send(data);
        }
    });
});

app.post('/v1/streams', function (req, res) {
    var auth = req.headers.authorization;
    var callbackUrl = req.body.callbackUrl;
    console.log(callbackUrl);
    console.log("auth is " + auth);
    if (auth === undefined) {
        res.send(401, "Unauthorized request. Please pass valid appId and appSecret");
        return;
    }
    var appId = auth.split(":")[0];
    var appSecret = auth.split(":")[1];

    validateClient(appId, appSecret)
        .then(function () {
            return util.createV1Stream(appId, callbackUrl);
        })
        .then(function (data) {
            delete data._id;
            delete data.appId;
            res.send(data);
        })
        .catch(function () {
            res.status(401).send("Unauthorized request. Invalid appId and appSecret");
        });
});

var getEventsForStreams = function (streams, skipCount, limitCount) {
    var deferred = q.defer();
    var streamids = _.map(streams, function (stream) {
        return stream.streamid;
    });
    var filterSpec = {
        'payload.streamid': {
            "$operator": {
                "in": streamids
            }
        }
    };
    var orderSpec = {
        "payload.eventDateTime": -1
    };
    var projectionSpec = {
        "payload": 1
    };
    var options = {
        "skip": skipCount,
        "limit": limitCount
    };
    var query = {
        'filterSpec': JSON.stringify(filterSpec),
        'orderSpec': JSON.stringify(orderSpec),
        'projectionSpec': JSON.stringify(projectionSpec),
        'options': JSON.stringify(options)
    };
    platformService.filter(query)
        .then(function (result) {
            deferred.resolve(result);
        }, function (err) {
            deferred.reject(err);
        });
    return deferred.promise;
};

var findUniqueStreamIdsFromEvents = function (events) {
    var streamIds = events.map(function (e) {
        return e.payload.streamid;
    });
    return _.unique(streamIds);
};

// timeline api
app.get('/v1/users/:username/events', function (req, res) {
    var skipCount = parseInt(req.query.skip) || 0;
    var limitCount = parseInt(req.query.limit) || 50; // by default show only 50 events per page

    var encodedUsername = req.headers.authorization;
    validEncodedUsername(encodedUsername)
        .then(function () {
            return getStreamIdForUsername(encodedUsername, req.query.forUsername);
        })
        .then(function (streams) {
            return getEventsForStreams(streams, skipCount, limitCount);
        })
        .then(function (events) {
            var streamIds = findUniqueStreamIdsFromEvents(events);
            var fetchIconUrlFromApp = function (streamId) {
                return mongoRespository.findOne('stream', {streamid: streamId}, {appId: 1})
                    .then(function (stream) {
                        return mongoRespository.findOne('registeredApps', {appId: stream.appId}, {iconUrl: 1})
                    })
                    .then(function (registeredApp) {
                        if (registeredApp) {
                            return {streamid: streamId, iconUrl: registeredApp.iconUrl};
                        } else {
                            return {streamid: streamId, iconUrl: CONTEXT_URI + "/img/noimage.png"};
                        }
                    })
            };
            var iconPromises = streamIds.map(fetchIconUrlFromApp);

            return q.all(iconPromises)
                .then(function (streamIdIconMapping) {
                    return events.map(function (e) {
                        var iconUrl = _.findWhere(streamIdIconMapping, {streamid: e.payload.streamid}).iconUrl;
                        return {payload: e.payload, iconUrl: iconUrl};
                    });
                });
        })
        .then(function (events) {
            res.send(events);
        }).catch(function (error) {
            res.status(404).send("No stream associated with user.");
        });
});

var findUser = function (username, registrationToken) {
    var deferred = q.defer();
    var query = {
        username: username,
        registrationToken: registrationToken
    };
    mongoRespository.findOne("users", query)
        .then(function (user) {
            if (!_.isEmpty(user)) {
                deferred.resolve(user);
            }
            deferred.reject();
        });
    return deferred.promise;
};

app.post('/v1/users/:username/streams', function (req, res) {
    var auth = req.headers.authorization;
    var callbackUrl = req.body.callbackUrl;
    var contentType = req.headers['content-type'];
    var registrationToken = req.headers['registration-token'];
    var username = req.params.username;
    if (auth === undefined) {
        res.send(401, "Unauthorized request. Please pass valid appId and appSecret");
        return;
    }
    if (contentType !== "application/json") {
        res.send(400, "Please use application/json as content-type");
        return;
    }
    var appId = auth.split(":")[0];
    var appSecret = auth.split(":")[1];
    var streamData;

    validateClient(appId, appSecret)
        .then(function () {
            return findUser(username, registrationToken);
        })
        .then(function (user) {
            return util.createV1Stream(appId, callbackUrl)
                .then(function (stream) {
                    streamData = stream;
                    return util.linkStreamToUser(user, stream.streamid);
                })
                .then(function () {
                    return util.linkIntegrationAppToUser(user, appId)
                })
                .then(function () {
                    delete streamData._id;
                    delete streamData.appId;
                    res.status(200).send(streamData);
                });
        })
        .catch(function (err) {
            res.status(400).send("invalid request");
        });
});

// TODO: remove this once all existing github integration users are migrated
app.post('/v1/users/:username/link', function (req, res) {
    var streamId = req.body.streamId;
    var appId = req.body.appId;
    var username = req.params.username;
    if (streamId && appId) {
        util.findUser(username)
            .then(function (user) {
                return q.all([util.linkStreamToUser(user, streamId), util.linkIntegrationAppToUser(user, appId)]);
            })
            .then(function () {
                res.status(200).send("ok");
            })
            .catch(function (err) {
                console.log("Error: ", err);
                res.status(500).send(err);
            })
    } else {
        res.status(400).send("invalid streamId and appId");
    }
});

app.get('/eventsCount', function (req, res) {
    platformService.getEventsCount()
        .then(function (response) {
            res.send(response);
        }).catch(function (error) {
            console.log("Err", error);
            res.status(400).send("Invalid request");
        });
});

app.post('/stream/:id/event', postEvent);

app.post('/v1/streams/:id/events', validateRequest.validate, postEvent);

var endsWith = function (string, suffix) {
    return string.indexOf(suffix, string.length - suffix.length) !== -1;
};
var formatEventDateTime = function (datetime) {
    var currentMoment = moment();
    var offset = null;
    if (typeof datetime !== 'undefined') {
        currentMoment = moment(datetime);
    }
    var utcDate = currentMoment.toISOString();
    var localISODate = utcDate;
    if (!endsWith(datetime, "Z")) {
        offset = currentMoment._tzm;
        localISODate = currentMoment.subtract(offset, 'minutes').toISOString();
    }
    return {
        eventDateTime: {"$date": utcDate},
        eventLocalDateTime: {"$date": localISODate},
        offset: offset
    }
};

var getLatestSyncField = function (streamId) {
    var deferred = q.defer();
    var filterSpec = {
        'payload.streamid': streamId
    };
    var orderSpec = {
        "payload.latestSyncField": -1
    };
    var options = {
        "limit": 1
    };
    var query = {
        'filterSpec': JSON.stringify(filterSpec),
        'orderSpec': JSON.stringify(orderSpec),
        'options': JSON.stringify(options)
    };
    platformService.filter(query)
        .then(function (result) {
            deferred.resolve(result[0].payload.latestSyncField);
        }, function (err) {
            deferred.reject(err);
        });
    return deferred.promise;
};

var saveBatchEvents = function (myEvents, stream) {
    var deferred = q.defer();
    var myEventsWithPayload = _.map(myEvents, function (myEvent) {
        myEvent.streamid = stream.streamid;
        var dateInfo = formatEventDateTime(myEvent.dateTime);
        myEvent.eventDateTime = dateInfo.eventDateTime;
        myEvent.eventLocalDateTime = dateInfo.eventLocalDateTime;
        myEvent.offset = dateInfo.offset;
        return {
            'payload': myEvent
        };
    });
    var responseBody = undefined;
    platformService.saveBatchEvents(myEventsWithPayload)
        .then(function (result) {
            responseBody = result;
            return getLatestSyncField(stream.streamid)
                .then(function (latestSyncField) {
                    return updateLatestSyncField(stream.streamid, latestSyncField);
                });
        })
        .then(function () {
            deferred.resolve(responseBody)
        }, function (err) {
            deferred.reject(err);
        });
    return deferred.promise;
};

var updateLatestSyncField = function (streamId, latestSyncField) {
    var deferred = q.defer();
    var query = {"streamid": streamId};
    var updateObject = {
        $set: {"latestSyncField": latestSyncField}
    };
    mongoRespository.update('stream', query, updateObject)
        .then(function () {
            deferred.resolve(updateObject);
        }, function (err) {
            deferred.reject(err);
        });
    return deferred.promise;
};

var postEvents = function (req, res) {
    var writeToken = req.headers.authorization;
    authenticateWriteToken(writeToken, req.params.id)
        .then(function (stream) {
            return saveBatchEvents(req.body, stream);
        },
        function () {
            res.status(404).send("stream not found");
        })
        .then(function (result) {
            res.send(result);
        }, function (err) {
            res.status(500).send('Database error.');
        });
};
app.post('/stream/:id/batch', postEvents);

app.post('/v1/streams/:id/events/batch', validateRequest.validate, postEvents);

app.get('/live/devbuild/:durationMins', function (req, res) {
    var durationMins = req.params.durationMins;
    var selectedEventType = req.query.eventType;
    var selectedLanguage = req.query.lang;
    var dateNow = new Date();
    var cutoff = new Date(dateNow - (durationMins * 1000 * 60));

    var filterSpec = {
        "payload.eventDateTime": {
            "$gte": {
                "$date": moment(cutoff).toISOString()
            }
        },
        "payload.actionTags": ["Build", "wtf", "create"]
    };
    if (selectedEventType) {
        filterSpec["payload.actionTags"] = selectedEventType;
    }
    if (selectedLanguage) {
        filterSpec["payload.properties.Language"] = selectedLanguage;
    }
    var query = {
        'filterSpec': JSON.stringify(filterSpec)
    };
    platformService.filter(query)
        .then(function (result) {
            res.send(result);
        }, function (err) {
            res.status(500).send("Something went wrong!");
        });
});

app.get('/quantifieddev/mydev', function (req, res) {
    var encodedUsername = req.headers.authorization;
    var forUsername = req.query.forUsername;
    validEncodedUsername(encodedUsername)
        .then(function () {
            return getStreamIdForUsername(encodedUsername, forUsername)
        })
        .then(getBuildEventsFromPlatform)
        .then(function (response) {
            res.send(response);
        }).catch(function (error) {
            console.log("error during fetching /mydev data ", error);
            res.status(404).send("cannot fetch mydev data");
        });
});

app.get('/quantifieddev/githubPushEventForCompare', function (req, res) {
    var encodedUsername = req.headers.authorization;
    validEncodedUsername(encodedUsername)
        .then(function () {
            return getStreamIdForUsername(encodedUsername, req.query.forUsername);
        })
        .then(getTotalUsersOfQd)
        .then(getGithubPushEventCountForCompare)
        .then(function (response) {
            res.send(response);
        }).catch(function (error) {
            res.status(404).send("stream not found");
        });
});

app.get('/quantifieddev/compare/ideActivity', function (req, res) {
    var encodedUsername = req.headers.authorization;
    var forUsername = req.query.forUsername;
    validEncodedUsername(encodedUsername)
        .then(function () {
            return getStreamIdForUsername(encodedUsername, forUsername)
        }).then(getTotalUsersOfQd)
        .then(getIdeActivityDurationForCompare)
        .then(function (response) {
            console.log("Ide Activity For compare: ", JSON.stringify(response));
            res.send(response);
        }).catch(function (error) {
            res.status(404).send("stream not found");
        });
});

app.get('/quantifieddev/dailyGithubPushEvents', function (req, res) {
    var encodedUsername = req.headers.authorization;
    validEncodedUsername(encodedUsername)
        .then(function () {
            return getStreamIdForUsername(encodedUsername, req.query.forUsername);
        })
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
    var forUsername = req.query.forUsername;
    validEncodedUsername(encodedUsername)
        .then(function () {
            return getStreamIdForUsername(encodedUsername, forUsername);
        })
        .then(function (streams) {
            return correlateGithubPushesAndIDEActivity(streams, firstEvent, secondEvent);
        })
        .then(function (response) {
            res.send(response);
        }).catch(function (error) {
            res.status(404).send("stream not found");
        });
});

var getEventParams = function (event) {
    var eventSplit = event.split("/");
    return {
        "objectTags": eventSplit[0],
        "actionTags": eventSplit[1],
        "operation": eventSplit[2]
    };
};

// /v1/users/:username/correlate/:period/type/json?firstEvent=:objectTags/:actionTags/:operation&secondEvent=:objectTags/:actionTags/:operation
app.get('/v1/users/:username/correlate/:period/type/json', function (req, res) {
    var firstEvent = req.query.firstEvent;
    var secondEvent = req.query.secondEvent;
    var fromDate = req.query.from;
    var toDate = req.query.to;

    var firstEventParams = getEventParams(firstEvent);
    var secondEventParams = getEventParams(secondEvent);
    firstEventParams.period = req.params.period;
    secondEventParams.period = req.params.period;

    var encodedUsername = req.headers.authorization;
    var forUsername = req.query.forUsername;
    validEncodedUsername(encodedUsername)
        .then(function () {
            return getStreamIdForUsername(encodedUsername, forUsername);
        })
        .then(function (streams) {
            var streamids = _.map(streams, function (stream) {
                return stream.streamid;
            });
            var firstEventQuery = getQueryForVisualizationAPI(streamids, firstEventParams, fromDate, toDate, "value_first");
            var secondEventQuery = getQueryForVisualizationAPI(streamids, secondEventParams, fromDate, toDate, "value_second");
            var query = {
                "spec": JSON.stringify([firstEventQuery, secondEventQuery]),
                "merge": true
            };
            //console.log("Query for correlate: ", JSON.stringify(query));
            return query;
        })
        .then(platformService.aggregate)
        .then(transformPlatformDataToQDEvents)
        .then(function (response) {
            res.send(response);
        }).catch(function (error) {
            res.status(404).send("stream not found");
        });
});

app.get('/quantifieddev/correlate/steps/trackcount', function (req, res) {
    var encodedUsername = req.headers.authorization;
    var forUsername = req.query.forUsername;
    validEncodedUsername(encodedUsername)
        .then(function () {
            return getStreamIdForUsername(encodedUsername, forUsername);
        })
        .then(function (streams) {
            return correlateStepsAndTracks(streams);
        })
        .then(function (response) {
            res.send(response);
        }).catch(function (error) {
            res.status(404).send("stream not found");
        });
});

app.get('/quantifieddev/correlate/ideactivity/trackcount', function (req, res) {
    var encodedUsername = req.headers.authorization;
    var forUsername = req.query.forUsername;
    validEncodedUsername(encodedUsername)
        .then(function () {
            return getStreamIdForUsername(encodedUsername, forUsername);
        })
        .then(function (streams) {
            return correlateIDEActivityAndTracks(streams);
        })
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

var getQueryForVisualizationAPI = function (streamIds, params, fromDate, toDate, result) {
    var actionTags = params.actionTags.split(',');
    var objectTags = params.objectTags.split(',');
    var period = params.period;
    var resultField = result || "value";
    var groupQuery = {
        "$groupBy": {
            "fields": [
                {
                    "name": "payload.eventDateTime",
                    "format": periodMap[period]
                }
            ],
            "filterSpec": {
                "payload.streamid": {
                    "$operator": {
                        "in": streamIds
                    }
                },
                "payload.eventDateTime": {
                    "$operator": {
                        ">": {
                            "$date": fromDate
                        },
                        "<": {
                            "$date": toDate
                        }
                    }
                },
                "payload.actionTags": {
                    "$operator": {
                        "all": actionTags
                    }
                },
                "payload.objectTags": {
                    "$operator": {
                        "all": objectTags
                    }
                }
            },
            "projectionSpec": {
                "payload.eventDateTime": "date",
                "payload.properties": "properties"
            },
            "orderSpec": {}
        }
    };


    var operation_string = params.operation.split('(');
    var operation = operation_string[0];
    var query = {};
    query["$" + operation] = {};

    //Todo: FIXME(in platform), ordering of the hash matters :(
    if ("count" !== operation) {
        var operation_field = operation_string[1].slice(0, -1);
        query["$" + operation]["field"] = {
            "name": "properties." + operation_field
        };
    }

    query["$" + operation]["data"] = groupQuery;
    query["$" + operation]["filterSpec"] = {};
    query["$" + operation]["projectionSpec"] = {
        "resultField": resultField
    };

    return query;
};

//v1/streams/{{streamId}}/events/{{ambient}}/{{sample}}/{{avg/count/sum}}({{:property}})/daily/{{barchart/json}}
app.get("/v1/streams/:streamId/events/:objectTags/:actionTags/:operation/:period/type/json"
    , validateRequest.validateDateRange
    , validateRequest.validateStreamIdAndReadToken
    , function (req, res) {
        console.log("validating");

        var query = getQueryForVisualizationAPI([req.params.streamId], req.params, req.query.from, req.query.to);
        platformService
            .aggregate({
                spec: JSON.stringify(query)
            })
            .then(function (response) {
                console.log("trying to transform events");
                res.send(transformPlatformDataToQDEvents(response[0]));
            }).catch(function (error) {
                console.log("an error occurred retrieving events: " + error);
                res.status(404).send("Oops! Some error occurred.");
            });
    });

var authorizeUser = function (req, res, next) {
    var shareToken = req.query.shareToken;
    var encodedUsername = req.headers.authorization;
    if (shareToken && shareToken !== 'undefined') {
        // TODO remove barchart hardcoded renderType
        var graphUrl = "/v1/users/" + req.param("username") + "/events/" +
            req.param("objectTags") + "/" + req.param("actionTags") + "/" +
            req.param("operation") + "/" + req.param("period") + "/barchart";

        validateShareTokenAndGraphUrl(req.query.shareToken, graphUrl)
            .then(function () {
                req.forUsername = req.param("username");
                next();
            }).catch(function (err) {
                console.log("Error is", err);
                res.send(400, "Invalid input");
            });
    } else if (encodedUsername && encodedUsername !== 'undefined') {
        validEncodedUsername(encodedUsername)
            .then(function () {
                req.forUsername = req.query.forUsername;
                next();
            });
    } else {
        console.log("Error - bad request. either shareToken or autorization required.");
        res.send(400, "bad request. either shareToken or autorization required.");
    }
};

app.get("/v1/users/:username/events/:objectTags/:actionTags/:operation/:period/type/json"
    , authorizeUser
    , validateRequest.validateDateRange
    , function (req, res) {
        getStreamIdForUsername(req.headers.authorization, req.forUsername)
            .then(function (streams) {
                var streamIds = _.map(streams, function (stream) {
                    return stream.streamid;
                });
                var query = getQueryForVisualizationAPI(streamIds, req.params, req.query.from, req.query.to);
                return {
                    spec: JSON.stringify(query)
                }
            })
            .then(platformService.aggregate)
            .then(function (response) {
                res.send(transformPlatformDataToQDEvents(response[0]));
            }).catch(function (error) {
                console.log("Error is", error);
                res.status(404).send("Oops! Some error occurred.");
            });
    });

var findGraphUrl = function (graphUrl) {
    var deferred = q.defer();
    var query = {graphUrl: graphUrl};

    mongoRespository.findOne('comments', query)
        .then(function (chartComments) {
            if (chartComments) {
                deferred.resolve(chartComments);
            } else {
                deferred.resolve();
            }
        }, function (err) {
            deferred.reject(err);
        });

    return deferred.promise;
};

var updateChartComment = function (chartComment) {
    var deferred = q.defer();
    var query = {graphUrl: chartComment.graphUrl};
    var commentToInsert = {
        "$push": {
            "comments": chartComment.comment
        }
    };
    mongoRespository.update('comments', query, commentToInsert)
        .then(function () {
            deferred.resolve();
        }, function (err) {
            deferred.reject(err);
        });

    return deferred.promise;
};

var getCommentsForChart = function (graph, dateRange) {

    graph.dataPointDate = {"$gte": new Date(dateRange.from), "$lt": new Date(dateRange.to)};
    var deferred = q.defer();

    var transform = function (documents) {
        return _.map(documents, function (data) {
            var dataPointDate = moment.utc(data.dataPointDate).format("YYYY-MM-DD");
            var allAvatars = [];
            var comments = _.map(data.comments, function (comment) {
                allAvatars.push(comment.avatarUrl);
                return {
                    text: comment.text,
                    avatarUrl: comment.avatarUrl
                };
            });
            var avatars = _.uniq(allAvatars);
            return {dataPointDate: dataPointDate, avatars: avatars, comments: comments};
        });
    };

    mongoRespository.find('comments', graph)
        .then(function (chartComments) {
            deferred.resolve(transform(chartComments));
        }, function (err) {
            deferred.reject("Error occurred for getCommentsForChart");
        });
    return deferred.promise;
};

// Get comments for the graph url
app.get("/v1/comments"
    , validateRequest.validateDateRange
    , function (req, res) {
        var graph = {
            username: req.query.username,
            objectTags: req.query.objectTags,
            actionTags: req.query.actionTags,
            operation: req.query.operation,
            period: req.query.period,
            renderType: req.query.renderType,
        };
        var dateRange = {
            from: req.query.from,
            to: req.query.to
        }
        getCommentsForChart(graph, dateRange).then(function (comments) {
            res.send(comments);
        });
    });

app.get("/v1/user/:username/exists", function (req, res) {
    var username = req.param("username");
    var query = {
        "username": username.toLowerCase()
    };
    mongoRespository.findOne('users', query)
        .then(function (user) {
            if (!user) {
                res.status(404).send("");
            }
            res.status(200).send("");
        }, function (err) {
            res.status(500).send("");
        });
});

app.post("/v1/comments", function (req, res) {
    var encodedUsername = req.headers.authorization;
    var chartComment = req.body;
    chartComment.comment.timestamp = moment.utc().toDate();

    chartComment.comment.text = validator.escape(chartComment.comment.text); //escape html

    validEncodedUsername(encodedUsername, "", [])
        .then(function () {
            return findGraphUrl(chartComment.graphUrl);
        })
        .then(function (chartComments) {
            if (_.isEmpty(chartComments)) {
                chartComment.comments = [chartComment.comment];
                delete chartComment.comment;
                chartComment.dataPointDate = moment.utc(chartComment.dataPointDate, "YYYY-MM-DD").toDate();
                return mongoRespository.insert('comments', chartComment);
            }
            else {
                return updateChartComment(chartComment);
            }
        })
        .then(function () {
            res.status(200).send("ok");
        })
        .catch(function (err) {
            console.error("Error in post comment", err);
            res.status(500).send("Internal server error");
        });
});

app.get("/v1/helptext/:topic", function (req, res) {
    var topic = req.param("topic");
    var filepath = "helptexts/" + topic + ".txt";

    fs.readFile(filepath, 'utf8', function (err, data) {
        if (err) {
            res.send(400, "Error occurred")
        }
        res.send({helptext: data})
    });
});

app.get('/v1/app', function (req, res) {
    //dont let customers access this
    if (!req.query.token || process.env.DEV_TOKEN !== req.query.token) {
        res.send(400, "I am sorry :( You can't access this page.");
    }

    mongoRespository.find('registeredApps', {})
        .then(function (data) {
            res.send(data);
        });
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

