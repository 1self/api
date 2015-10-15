/// <reference path="typings/express/express.d.ts" />

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
var morgan = require('morgan');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var fs = require('fs');
var validateRequest = require("./validateRequest");
var validator = require('validator');
var mongoRepository = require('./mongoRepository.js');
var eventRepository = require('./eventRepository.js');
var platformService = require('./platformService.js');
var scopedLogger = require('./scopedLogger');
var conceal = require('concealotron');

var CONTEXT_URI = process.env.CONTEXT_URI;
var LOGGING_DIR = process.env.LOGGINGDIR;

var filename = LOGGING_DIR + 'webapp.log';
var logger = require('winston');
logger.add(logger.transports.File, { filename: filename, level: 'debug', json: false });
logger.error("Errors will be logged here");
logger.warn("Warns will be logged here");
logger.info("Info will be logged here");
logger.debug("Debug will be logged here");

process.on('uncaughtException', function(err) {
  logger.error('Caught exception: ' + err);
  throw err;
});

var app = express();
app.locals.CARD_APP = process.env.CARD_APP;
logger.info("card app is :", process.env.CARD_APP);

app.use(morgan());

// local variables to be used by requests etc.
app.locals.contextUri = process.env.CONTEXT_URI;

logger.debug("event database is :", process.env.EVENTDBURI);

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

app.logger = logger;

app.use(bodyParser.urlencoded({
    limit: '100mb',
    extended: true
}));

app.use(bodyParser.json({
    limit: '100mb'
}));

app.engine('html', swig.renderFile);
app.use(express.static(path.join(__dirname, 'website/public')));
app.use('/card-stack', express.static('website/card-stack'));
app.use('/profile', express.static('website/profile'));
app.set('views', __dirname + '/website/views');
app.set('view engine', 'html');
/* app.set('view cache', false);
 swig.setDefaults({
 cache: false
 });*/

require('./oAuth')(app);

app.all('*', function (req, res, next) {
    var allowOrigin = req.headers.origin;
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Origin', allowOrigin);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
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

var validateEncodedUsername = function (encodedUsername, username) {
    var deferred = q.defer();
    var query = typeof username === 'undefined' ? {
        "encodedUsername": encodedUsername
    } : {
        "encodedUsername": encodedUsername,
        "username": username
    };

    mongoRepository.findOne('users', query)
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
    mongoRepository.findOne('users', query, projection)
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

var authenthicateWriteTokenMiddleware = function (req, res, next) {
    var writeToken = req.headers.authorization;
    var query = {
        streamid: req.params.streamid
    };
    
    mongoRepository.findOne('stream', query)
        .then(function (stream) {
            if (stream === null || stream.writeToken !== writeToken) {
                res.status(401).send()
            } else {
                next();
            }
        });
};

var authenticateWriteToken = function (writeToken, id) {
    var deferred = q.defer();
    var query = {
        streamid: id
    };
    mongoRepository.findOne('stream', query)
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

var saveEvent = function (req, res) {
        var eventToInsert = {};
        var payload = req.event;

        payload.eventDateTime = new Date(payload.eventDateTime.$date);
        payload.eventLocalDateTime = new Date(payload.eventLocalDateTime.$date);
	
        eventToInsert.event = {};
        eventToInsert.event.createdOn = new Date();
        eventToInsert.event.id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });

        eventToInsert.payload = payload;
        eventRepository.insert('oneself', [eventToInsert])
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
    mongoRepository.count('users', {})
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

app.get('/', function (request, response) {
    response.redirect('/timeline');
});

app.get('/health', function (request, response) {
    response.send("I'm alive");
});

app.get('/users_count', function (req, res) {
    mongoRepository.count('users', {}).then(function (count) {
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
    mongoRepository.find('users', {
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

    mongoRepository.findOne('registeredApps', query)
        .then(function (result) {
            if (!result) {
                deferred.reject(
                    {
                        error: 401,
                        message: 'unauthorized app'
                    });
            } else {
                deferred.resolve();
            }
        }, function (err) {
            deferred.reject(
                {
                    error: 500,
                    messages: err
                });
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

var getIntegration = function(req, res, next){
    var query = {
        urlName: req.params.name
    };

    mongoRepository.findOne('registeredApps', query)
    .then(function(integrationDoc){
        if(integrationDoc){
            delete integrationDoc._id;
            delete integrationDoc['app-id'];
            delete integrationDoc['app-secret'];
            req.integration = integrationDoc;
            next();
        }
        else{
            logger.debug('no integration with that name');
            res.status(404).send('no integration with that name');
        }
    })
    .catch(function(error){
        logger.debug('error trying to get integration, ', [req.params.name, error]);
        res.status(500).send(error);
    })
    .done();
};

var sendIntegration = function(req, res, next){
    res.status(200).send(req.integration);
};

app.get('/v1/integrations/:name', 
    getIntegration, 
    sendIntegration);

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
        .then(function (stream) {
            return q.Promise(function(resolve, reject){
                if(req.session.username){
                    util.findUser(req.session.username)
                    .then(function(user){
                        return util.linkStreamToUser(user, stream.streamid);   
                    })
                    .then(function(){
                        resolve(stream);
                    })
                    .catch(function(error){
                        logger.error(appId + ': error while registering stream, error ' + error);
                        reject(error);
                    })
                }
                else{
                    resolve(stream);
                }
            })
        })
        .then(function (stream) {
            delete stream._id;
            delete stream.appId;
            res.send(stream);
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
    var username = req.params.username;
    var skipCount = parseInt(req.query.skip) || 0;
    var limitCount = parseInt(req.query.limit) || 50; // by default show only 50 events per page

    var encodedUsername = req.headers.authorization;
    validateEncodedUsername(encodedUsername, username)
        .then(function () {
            return getStreamIdForUsername(encodedUsername, req.query.forUsername);
        })
        .then(function (streams) {
            return getEventsForStreams(streams, skipCount, limitCount);
        })
        .then(function (events) {
            var streamIds = findUniqueStreamIdsFromEvents(events);
            var fetchIconUrlFromApp = function (streamId) {
                return mongoRepository.findOne('stream', {streamid: streamId}, {appId: 1})
                    .then(function (stream) {
                        return mongoRepository.findOne('registeredApps', {appId: stream.appId}, {iconUrl: 1})
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
    mongoRepository.findOne("users", query)
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
        if(err.error){
            res.status(err.error).send(err.message);
        }
        else{
            res.status(400).send(err);
        }
    });
});

var doNotAuthorize = function(req, res, next){
    logger.debug('do not authorise');
    next();
}

var getCards = function(req, res, next){
    logger.debug('starting getCards');
    util.findUser(req.params.username)
    .then(function(user){
        return util.getCards(user, req.query.from);
    })
    .then(function(cards){
        res.cards = cards;
        next();
    })
    .catch(function(err){
        res.status(500).send(err);
    });
}

var getCardsByUserId = function(req, res, next){
    logger.debug('starting getCardsByUserId');
    util.findUserById(req.token.userId)
    .then(function(user){
        return util.getCards(user, req.query.from);
    })
    .then(function(cards){
        res.cards = cards;
        next();
    })
    .catch(function(err){
        res.status(500).send(err);
    });
}

_.mixin({

  // Get/set the value of a nested property
  deep: function (obj, key, value) {

    var keys = key.replace(/\[(["']?)([^\1]+?)\1?\]/g, '.$2').replace(/^\./, '').split('.'),
        root,
        i = 0,
        n = keys.length;

    // Set deep value
    if (arguments.length > 2) {

      root = obj;
      n--;

      while (i < n) {
        key = keys[i++];
        obj = obj[key] = _.isObject(obj[key]) ? obj[key] : {};
      }

      obj[keys[i]] = value;

      value = root;

    // Get deep value
    } else {
      while ((obj = obj[keys[i++]]) != null && i < n) {};
      value = i < n ? void 0 : obj;
    }

    return value;
  }

});

var filterCards = function(req, res, next){
    if(res.cards === undefined){
        res.cards = [];
        next();
        return;
    }
    var username = req.user ? req.user.username : req.params.username;
    logger.debug([username, "filtercards", "starting"].join(': '));
    var timingInfo = {};
    timingInfo.startMoment = moment();
    var stdDevFilter;
    if(req.query.minStdDev && req.query.maxStdDev){
        stdDevFilter = function(card){
            return card.type === 'date' || card.sampleCorrectedStdDev > req.query.minStdDev && card.sampleCorrectedStdDev < req.query.maxStdDev;
        }
    }
    else if(req.query.minStdDev)
    {
        stdDevFilter = function(card){
            return card.type === 'date' || card.sampleCorrectedStdDev > req.query.minStdDev;
        }   
    }

    // if(filterFunc){
    //     res.cards = _.filter(res.cards, filterFunc);
    // }
    timingInfo.totalCards = res.cards.length;

    if(req.query.extraFiltering)
    {
        var grouped = _(res.cards).groupBy(function(card){
            var cardType = card.type === 'date' ? '_date' : card.type;
            return card.cardDate + '/' + card.type;
        });

        var  cards = {};

        var addToCards = function(card){
            card.id = card._id;
            var positionName = [card.type, card.objectTags.join(','), card.actionTags.join(','),card.propertyName].join('.');
            if(cards[positionName] === undefined){
                cards[positionName] = [];
            }

            if(cards[positionName][card.position] === undefined){
                cards[positionName][card.position] = [];
            }

            // if(positionName === 'bottom10.computer,git,github,software,source control.commit.line-changes.sum.file-types.dev'){
            //     debugger;
            // }

            cards[positionName][card.position].push(card);
        }
        
        var groupedAndSorted = _(grouped).mapObject(function(value, key){
            var splits = key.split('/');
            // if(key === "2015-07-25/bottom10"){
            //     debugger;
            // }
            var sortedCardsForDay = _(value).reduce(function(memo, card){
                if(card.propertyName !== undefined){
                    _.deep(memo, [card.objectTags.join(','), card.actionTags.join(','), card.propertyName].join('/') + '.__card__', card);
                }

                return memo;
            }, {})

            var addBranch = function(node, depth){
               
                var candidateCard = node['__card__'];
                if(candidateCard !== undefined){
                    var daysDiff = (moment() - moment(candidateCard.cardDate)) / 1000 / 60 / 60 / 24;
                    candidateCard.weight = (1.0/depth) * Math.pow(0.99,daysDiff);
                    candidateCard.depth = depth;
                    
                    addToCards(candidateCard);
                    var topLevelNode = candidateCard

                    _.each(_.keys(node), function(nodeKey){
                        if(nodeKey !== '__card__'){
                            addBranch(node[nodeKey], depth +1);
                        }
                    });
                }
                else{
                    _.each(_.keys(node), function(nodeKey){
                        addBranch(node[nodeKey], depth +1);
                    });
                }
            };

            addBranch(sortedCardsForDay, 0);
        });

        var findFirstNode = function(node){
            var result = [];

            var candidateCard = node['__card__'];
            if(candidateCard !== undefined){
                result.push(candidateCard);
            }
            else{
                _.each(_.keys(node), function(nodeKey){
                    result.push(findFirstNode(node[nodeKey]));
                });
            }

            return result;
        };

        var readCardsFilter = function(card){
            return card.type !== 'date' && card.read === undefined || card.read === false;
        };

        var filteredPositions = _.chain(cards)
        .map(function(v, k){
            return _.chain(v)
            .filter(Boolean)
            .first()
            .sortBy('cardDate')
            .sortBy('sortingValue')
            .value()[0];
        })
        
        .reduce(function(memo, card){
                if(card.propertyName !== undefined){
                    _.deep(memo, [card.type, card.objectTags.join(','), card.actionTags.join(','), card.propertyName].join('/') + '.__card__', card);
                }

                return memo;
            }, {})
        .map(function(cardBranch){
            return findFirstNode(cardBranch);
        })
        .flatten()
        .filter(readCardsFilter)
        //.filter(stdDevFilter)
        .groupBy(function(card){
             return card.cardDate;
             })
        
        .map(function(value, key){
            var dateCard = {
                type: 'date',
                cardDate: key
            }
            return [dateCard, value];
        })
        .flatten()
        .sortBy(function(card){
            return card.cardDate;
        })
        
        .value();

        if(res.user === undefined){
            res.user = {};
        }

        res.cards = filteredPositions;
        timingInfo.filteredCards = res.cards.length;
    }

    timingInfo.endMoment = moment();
    timingInfo.elapsed = (timingInfo.endMoment - timingInfo.startMoment) / 1000;
    delete timingInfo.startMoment;
    delete timingInfo.endMoment;
    logger.debug([username, 'filterCards'].join(': '), 'timing info', timingInfo);

    next();
};

var sendCards = function(req, res, next) {
    res.status(200).send(res.cards);
};

var sendCard = function(req, res, next) {
    res.status(200).send(res.card);
};

var extractCardDetails = function(req, res, next){
    req.card = req.body;
    req.card._id = req.params.cardId;
    next();
};

var addUserIdToCard = function(req, res, next){
    req.card.userId = req.token.userId;
    next();
};

var updateCardInDb = function(req, res, next) {
    util.setCard(req.card)
    .then(function(card){
        res.card = card;
        next();
    })
    .catch(function(error){
        if(error === 'card id not found'){
            res.status(404).send(error);
        }
        res.status(500).send(error);
    });
};

var getUser = function(req, res, next){
    util.findUser(req.params.username)
    .then(function(user){
        req.user = user;
        next();
    })
    .catch(function(error){
        res.status(500).send(error);
    });
};

var profileCardRead = function(req, res, next){
    if(req.winstonProfile === undefined){
        req.winstonProfile = 'cardRead' + req.params.cardId;
    }

    logger.profile(req.winstonProfile);
    next();
};

// /v1/users/:username/cards/:cardId/"
app.patch('/v1/users/:username/cards/:cardId',
    profileCardRead,
    doNotAuthorize,
    extractCardDetails,
    updateCardInDb,
    profileCardRead,
    sendCard);


app.get('/v1/users/:username/cards',
    doNotAuthorize,
    getCards,
    filterCards,
    sendCards);

app.patch('/v1/me/cards/:cardId',
    app.locals.requireToken,
    profileCardRead,
    extractCardDetails,
    addUserIdToCard,
    updateCardInDb,
    profileCardRead,
    sendCard);

app.get('/v1/me/cards',
    app.locals.requireToken,
    getCardsByUserId,
    filterCards,
    sendCards);

var getIntegrationAction = function(type){
    var result = '';
    if(type === 'hosted'){
        result = 'Connect';
    }
    else if(type === 'downloadable-extension'){
        result = 'Download';
    }
    else{
        result = 'error';
    }

    return result;
};

var convertDbFields = function(user){
    return function(integration){
        var result = {
            serviceName: integration.title,
            identifier: integration.urlName,
            categories: integration.categories,
            shortDescription: integration.shortDesc,
            longDescription: integration.longDesc2,
            integrationAction: getIntegrationAction(integration.type),
            integrationUrl: integration.integrationUrl,
            integrationType: integration.type,
            foregroundColor: integration.fgColor,
            backgroundColor: integration.bgColor,
            iconUrl: integration.iconUrl,
            instructions: integration.instructions2,
            hasConnected: user.integrationMap[integration.appId] !== undefined
        };

        return result;
    };
};

var mapCategory = function(i) {
    return i.categories.map(function(c){
        var result = {};
        result.category = c;
        result.integrations = i;
        return result;
    });
};

var convertCategoryArrayToMap = function(user){
    user.integrationMap = {};
    if(user.integrations === undefined){
        return;
    }
    
    user.integrations.forEach(function(i){
        user.integrationMap[i] = true;
    });
};

var getIntegrations = function(req, res, next){
    var logger = scopedLogger.logger(conceal(req.token.userId.toString()), req.app.logger);
    logger.silly('getting integrations');

    var getIntegrationsFromDb = function(){
        var query = {
            approved: true,
            active: true
        };

        logger.silly('getting integrations, ', query);
        return mongoRepository.find('registeredApps', query);
    };

    

    var getUser = function(integrations) {
        var userQuery = {
            _id: req.token.userId
        };

        var projection = {
            integrations: true
        };

        logger.silly('getting user, ', userQuery);

        return mongoRepository.findOne('users', userQuery, projection)
        .then(function(userDoc){
            logger.silly('got db user', conceal(userDoc));
            userDoc.allIntegrations = integrations;
            return userDoc;
        });
    };

    var joinUserToIntegrations = function(user){
        convertCategoryArrayToMap(user);

        logger.silly('joining user to integrations, ', user);

        var result = _.chain(user.allIntegrations)
        .map(convertDbFields(user))
        .map(mapCategory)
        .flatten()
        .reduce(function(memo, integration){
            if(memo[integration.category] === undefined){
                memo[integration.category] = [];
            }

            memo[integration.category].push(integration.integrations);
            return memo;
        }, {})
        //.groupBy('category')
        .mapObject(function(val, key){
             return {
                categoryName: key,
                integrations: val
            };
        })
        .values()
        //.keys(function())
        .value();

        return result;
    };

    var addUserIntegrationsToResponse = function(userIntegrations){
        res.userIntegrations = userIntegrations;
        logger.silly('adding userIntegrations to response, ', res.userIntegrations);
        next();
    }
    
    getIntegrationsFromDb()
    .then(getUser)
    .then(joinUserToIntegrations)
    .then(addUserIntegrationsToResponse)
    .catch(function(error){
        logger.error('error occurred', error);
    })
    .done();
}

var sendIntegrations = function(req, res, next){
    var logger = scopedLogger.logger(conceal(req.token.userId.toString()), req.app.logger);
    logger.debug('retrieved user integrations, length', res.userIntegrations.length);
    res.status(200).send(res.userIntegrations);
}

var timeUserIntegrationsPerformance = function(req, res, next){
    if(req.performanceProfile === undefined){
        req.performanceProfile = ('userIntegrations' + new Date().toISOString());
        logger.debug('starting timing, ', req.performanceProfile);
    }
    else{
        logger.debug('stopping timing, ', req.performanceProfile);   
    }

    req.app.logger.profile(req.performanceProfile);
    next();
};

app.get('/v1/me/integrations',
    timeUserIntegrationsPerformance,
    app.locals.requireToken,
    getIntegrations,
    timeUserIntegrationsPerformance,
    sendIntegrations);

var endSession = function(req, res, next){
    var logger = scopedLogger.logger(req.session.username, req.app.logger);
    if(req.query.redirect_uri === undefined){
        res.status(404).send('you must send a rediect_uri');
        logger.debug('end session was not supplied a redirect_uri');
        return;
    }

    req.session.destroy(function (err) {
        if(err){
            logger.error(err);
        }
        else{
            res.redirect(req.query.redirect_uri);
        }            
    });
};

app.get('/v1/me/logout',
    endSession);

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

var publishEvent = function(req, res, next){
    redisClient.publish("events", JSON.stringify(req.event));
    next();
}

var addDateTime = function(req, res, next){
    var dateInfo = formatEventDateTime(req.event.dateTime);
    req.event.eventDateTime = dateInfo.eventDateTime;
    req.event.eventLocalDateTime = dateInfo.eventLocalDateTime;
    req.event.offset = dateInfo.offset;
    next();
}

var addStreamId = function(req,res, next){
    req.event.streamid = req.params.streamid;
    next();
}

var extractEvent = function(req, res, next){
    req.event = req.body;
    next(); 
}

app.post('/stream/:streamid/event', 
    extractEvent,
    authenthicateWriteTokenMiddleware,
    addStreamId,
    addDateTime,
    publishEvent,
    saveEvent);


app.post('/v1/streams/:streamid/events',
    extractEvent,
    authenthicateWriteTokenMiddleware,
    addStreamId,
    addDateTime,
    publishEvent,
    saveEvent);

var authenticateReadToken = function(req, res, next){
    var query = {
        streamid: req.params.streamId,
        readToken: req.token
    };

    mongoRepository.findOne('stream', query)
    .then(function(stream){
        if(stream){
            next();
        }
        else{
            res.status(401).send('authorization is invalid for this stream');    
        }
    })
    .catch(function(){
        res.status(401).send('authorization is invalid for this stream');
    });
}

var createScopedToken = function(req, res, next){
    util.generateToken()
    .then(function (tokenBytes) {
        var scope = req.body;

        var permission = {
            token: tokenBytes,
            streamId: req.params.streamId,
            scope: scope
        };

        res.token = permission;
        next();
    })
    .catch(function(error){
        res.status(500).send('An error occurred generating the token');
    });
}

var persistScopedToken = function(req, res, next){
    mongoRepository.insert('streamscopedreadtoken', res.token)
    .then(function () {
        delete res.token._id;
        next();
    })
    .catch(function (error) {
        res.status(500).send('couldnt save the token to the database');
    });
}

var serveScopedToken = function(req, res, next){
    res.status(200).send(res.token);
}

parseTokenFromAuthorization = function (req, res, next) {
    var token = req.query.token;

    if (token === undefined) {
        var auth = req.headers.authorization;
        var auth = auth.split("Basic ");
        if (auth[0] === "") {
            token = auth[1];
        } else {
            token = auth[0];
        }
    }

    req.token = token;
    next();
};

// in order to create tokens to read events you 
// must prove that you are the stream owner. This is done 
// with the master readToken. From there scoped tokens can 
// be created
app.post('/v1/streams/:streamId/readtokens',
    parseTokenFromAuthorization,
    authenticateReadToken,
    createScopedToken,
    persistScopedToken,
    serveScopedToken);

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
    if (typeof datetime !== 'undefined' && !endsWith(datetime, "Z")) {
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
    console.log(streamId + ": getting latest sync field");
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
            console.log([streamId, result[0].payload.latestSyncField].join(": "));
            deferred.resolve(result[0].payload.latestSyncField);
        }, function (err) {
            deferred.reject(err);
        });
    return deferred.promise;
};

var saveBatchEvents = function (myEvents, stream) {
    console.log(stream.streamid + ": saving batch events");
    var deferred = q.defer();
    var myEventsWithPayload = _.map(myEvents, function (payload) {
        var result = {};

        payload.eventDateTime = new Date(payload.eventDateTime.$date);
        payload.eventLocalDateTime = new Date(payload.eventLocalDateTime.$date);
        
        // some integrations send up a numeric id rather than a date
        if(payload.latestSyncField && payload.latestSyncField.$date){
            payload.latestSyncField = new Date(payload.latestSyncField.$date);
        }

        result.event = {};
        result.event.createdOn = new Date();
        result.event.id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });

        result.payload = payload;
        return result;
    });

    var responseBody = undefined;
    logger.debug([stream.streamid, "batch received, inserting into event repo"].join(":"));
    eventRepository.insert('oneself', myEventsWithPayload)
        .then(function (result) {
            console.log([stream.streamid, "batch events successfully sent to platform service"].join(": "));
            responseBody = result;
            return getLatestSyncField(stream.streamid)
                .then(function (latestSyncField) {
                    return updateLatestSyncField(stream.streamid, latestSyncField);
                });
        })
        .then(function () {
            deferred.resolve(responseBody)
        }, function (err) {
            console.log([stream.streamid, "batch event save failed", err].join(": "));
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
    mongoRepository.update('stream', query, updateObject)
        .then(function () {
            deferred.resolve(updateObject);
        }, function (err) {
            deferred.reject(err);
        });
    return deferred.promise;
};

var saveBatch = function (req, res) {
    var writeToken = req.headers.authorization;
    authenticateWriteToken(writeToken, req.params.streamid)
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

var publishBatch = function( req, res, next) {
    _.forEach(req.body, function(event){
        event.streamid = req.params.streamid;

        var dateInfo = formatEventDateTime(event.dateTime);
        event.eventDateTime = dateInfo.eventDateTime;
        event.eventLocalDateTime = dateInfo.eventLocalDateTime;
        event.offset = dateInfo.offset;

        if(event.properties === undefined){
            event.properties = {};
        }
        redisClient.publish("events", JSON.stringify(event));
    });

    next();
}
app.post('/stream/:streamid/batch'
    , publishBatch
    , saveBatch);

app.post('/v1/streams/:streamid/events/batch'
    , validateRequest.validate
    , publishBatch
    , saveBatch);

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
    validateEncodedUsername(encodedUsername)
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
    validateEncodedUsername(encodedUsername)
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
    validateEncodedUsername(encodedUsername)
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
    validateEncodedUsername(encodedUsername)
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

var getEventParams = function (event) {
    var eventSplit = event.split("/");
    return {
        "objectTags": eventSplit[0],
        "actionTags": eventSplit[1],
        "operation": eventSplit[2]
    };
};

// /v1/users/:username/correlate/:period/.json?firstEvent=:objectTags/:actionTags/:operation&secondEvent=:objectTags/:actionTags/:operation
    app.get('/v1/users/:username/correlate/:period/type/.json',  validateRequest.validateDateRange, function (req, res) {
        var firstEvent = req.query.firstEvent;
        var secondEvent = req.query.secondEvent;
        var fromDate = req.query.from;
        var toDate = req.query.to;
        var username = req.params.username;

        var firstEventParams = getEventParams(firstEvent);
        var secondEventParams = getEventParams(secondEvent);
        firstEventParams.period = req.params.period;
        secondEventParams.period = req.params.period;

        var encodedUsername = req.headers.authorization;
        validateEncodedUsername(encodedUsername, username)
            .then(function () {
                return getStreamIdForUsername(encodedUsername);
            })
            .then(function (streams) {
                var streamids = _.map(streams, function (stream) {
                    return stream.streamid;
                });
                var firstEventQuery = getQueryForVisualizationAPI(streamids, firstEventParams, fromDate, toDate, "value1");
                var secondEventQuery = getQueryForVisualizationAPI(streamids, secondEventParams, fromDate, toDate, "value2");
                var query = {
                    "spec": JSON.stringify([firstEventQuery, secondEventQuery]),
                    "merge": true
                };
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
    var username = req.param("username");

    if (shareToken && shareToken !== 'undefined') {
        // TODO remove barchart hardcoded renderType
        var graphUrl = "/v1/users/" + username + "/events/" +
            req.param("objectTags") + "/" + req.param("actionTags") + "/" +
            req.param("operation") + "/" + req.param("period") + "/barchart";

        util.validateShareTokenAndGraphUrl(req.query.shareToken, graphUrl)
            .then(function () {
                req.forUsername = username;
                next();
            }).catch(function (err) {
                console.log("Error is", err);
                res.send(400, "Invalid input");
            });
    } else if (encodedUsername && encodedUsername !== 'undefined') {
        validateEncodedUsername(encodedUsername)
            .then(function () {
                req.forUsername = req.query.forUsername;
                next();
            });
    } else {
        console.log("Error - bad request. either shareToken or autorization required.");
        res.send(400, "bad request. either shareToken or autorization required.");
    }
};

var getRollup = function(req, res, next){
    if(req.params.period === 'day'){
        util.getRollupByDay(req.user._id, req.params.objectTags.split(','), req.params.actionTags.split(','), req.params.operation, req.params.property, req.query.to)
        .then(function(rollups){
            req.rollups = {};
            req.rollups.data = rollups;
            req.rollups.property = req.params.property;
            next();
        })
        .catch(function(error){
            res.status(500).send(error);
        });
    }
    else{
        req.rollups = [];
        next();
    }
}

var sendRollup = function(req, res, next){
    res.status(200).send(req.rollups);
}

var addUnit = function(req, res, next){
    if(req.rollups.property === 'duration'){
        req.rollups.unit = 's';
    }
    next();
};

app.get("/v1/users/:username/rollups/:period/:objectTags/:actionTags/:property/.json"
    , doNotAuthorize // authorize before putting onto production!
    , getUser
    , getRollup
    , addUnit
    , sendRollup);

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

    mongoRepository.findOne('comments', query)
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
    mongoRepository.update('comments', query, commentToInsert)
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

    mongoRepository.find('comments', graph)
        .then(function (chartComments) {
            deferred.resolve(transform(chartComments));
        }, function (err) {
            deferred.reject("Error occurred for getCommentsForChart");
        });
    return deferred.promise;
};

// Get comments for the graph url
// /v1/comments?username=:username&objectTags=:objectTags&actionTags=:actionTags&operation=:operation&period=:period&renderType=:renderType&from=:from&to=:to
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
        };
        getCommentsForChart(graph, dateRange).then(function (comments) {
            res.send(comments);
        });
    });

app.get("/v1/user/:username/exists", function (req, res) {
    var username = req.param("username");
    var query = {
        "username": username.toLowerCase()
    };
    mongoRepository.findOne('users', query)
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

    validateEncodedUsername(encodedUsername)
        .then(function () {
            return findGraphUrl(chartComment.graphUrl);
        })
        .then(function (chartComments) {
            if (_.isEmpty(chartComments)) {
                chartComment.comments = [chartComment.comment];
                delete chartComment.comment;
                chartComment.dataPointDate = moment.utc(chartComment.dataPointDate, "YYYY-MM-DD").toDate();
                return mongoRepository.insert('comments', chartComment);
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

    mongoRepository.find('registeredApps', {})
        .then(function (data) {
            res.send(data);
        });
});

app.options('*', function (request, response) {
    var allowOrigin = request.headers.origin;
    response.header('Access-Control-Allow-Origin', allowOrigin);
    response.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH');
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

