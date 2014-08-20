var _ = require("underscore");
var github = require('octonode');
var q = require('q');
var request = require('request');
var crypto = require('crypto');
var platformUri = process.env.PLATFORM_BASE_URI;
var sharedSecret = process.env.SHARED_SECRET;
var mongoDbConnection = require('./lib/connection.js');
var moment = require("moment");
var user;
var githubAccessToken;
var encryptPassword = function() {
    var encryptedPassword;
    if (sharedSecret) {
        var tokens = sharedSecret.split(":");
        var encryptionKey = tokens[0];
        var password = tokens[1];
        var iv = new Buffer('');
        var key = new Buffer(encryptionKey, 'hex'); //secret key for encryption
        var cipher = crypto.createCipheriv('aes-128-ecb', key, iv);
        encryptedPassword = cipher.update(password, 'utf-8', 'hex');
        encryptedPassword += cipher.final('hex');
    }
    return encryptedPassword;
};

var getPushEventsForUserForPage = function(page, user) {
    var githubUsername = user.githubUser.username;

    var user_api_url = "/users/" + githubUsername;
    var client = github.client(githubAccessToken);
    client.get(user_api_url, {}, function(err, status, body, headers) {
    });
    var ghuser = client.user(githubUsername);

    var deferred = q.defer();
    ghuser.events(page, ['PushEvent'], function(err, pushEvents) {
        if (err) {
            console.log("err " + err);
            deferred.reject(err);
        } else {
            deferred.resolve(pushEvents);
        }
    });
    return deferred.promise;
};

function clone(a) {
    return JSON.parse(JSON.stringify(a));
}

var singleEventTemplate = {
    "actionTags": [
        "Github",
        "Push"
    ],
    "source": "GitHub",
    "objectTags": [
        "Computer",
        "Software",
        "Source Control"
    ],
    "streamid": "",
    "properties": {}
};

var transformToQdEvents = function(events, streamid) {
    var qdEvents = [];
    _.each(events, function(event) {
        var qdEvent = clone(singleEventTemplate);
        qdEvent.streamid = streamid;
        qdEvent.eventDateTime =  {
            "$date": moment(event.created_at).format()
        };   
        qdEvents.push(qdEvent);
    });
    console.log("4. Transformed to QD Events", qdEvents.length);

    return qdEvents;
};

var storeLastEventDate = function(latestGitHubEvent, user) {
    var username = user.username;
    console.log("7a. storeLastEventDate", JSON.stringify(latestGitHubEvent));

    if (latestGitHubEvent !== undefined) {
        var latestGitHubEventDb = new Date(latestGitHubEvent.eventDateTime["$date"]);
        mongoDbConnection(function(qdDb) {
            qdDb.collection("users", function(err, collection) {
                collection.update({
                    "username": username
                }, {
                    $set: {
                        "latestGitHubEventDate": latestGitHubEventDb
                    }
                }, {
                    upsert: true
                }, function(error, data) {
                    if (error) {
                        console.log(error);
                    } else {
                        console.log("7b. storeLastEventDate");
                        console.log("Update success", data);
                    }
                });
            });
        });
    }
};


var filterEvents = function(allEvents, latestGitHubEventDate) {
    console.log("3a. filterEvents latestGitHubEventDate", latestGitHubEventDate);

    var filteredEvents = _.filter(allEvents, function(event) {
        if (latestGitHubEventDate !== undefined) {
            console.log("3b. filterEvents last event date should not be undefined", latestGitHubEventDate);
            return moment(event.created_at) > moment(latestGitHubEventDate.toISOString())
        } else {
            console.log("3b. filterEvents last event date should be undefined", latestGitHubEventDate);
            return true;
        }
    });
    console.log("FilterEvents greater than latestGitHubEventDate : " + JSON.stringify(filteredEvents));
    return filteredEvents;
    // console.log("Filtered events : ", filteredEvents);
};

var getLatestGithubEvent = function(events) {
    console.log("6a. getLatestGithubEvent is", events.length);
    var sortedEvents = _.chain(events).sortBy(function(event) {
        return event.eventDateTime["$date"];
    }).reverse().value();

    console.log("6b. getLatestGithubEvent is", events.length);

    return sortedEvents[0];
};

var sendEventsToPlatform = function(myEvents) {
    var deferred = q.defer();
    var encryptedPassword = encryptPassword();
    var myEventsWithPayload = [];
    console.log("Event sent to platform : " + JSON.stringify(myEvents));
    _.each(myEvents, function(myEvent) {
        myEventsWithPayload.push({
            'payload': myEvent
        });
    });
    console.log("5. a myEventsWithPayload size is ", myEventsWithPayload.length);
    var options = {
        url: platformUri + '/rest/events/batch',
        auth: {
            user: "",
            password: encryptedPassword
        },
        json: myEventsWithPayload
    };
    request.post(options,
        function(error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log("5. b Events logged is ");
                deferred.resolve(myEvents);
            } else {
                console.log(error);
                deferred.reject("DB error");
            }
        });
    return deferred.promise;
};

var getGithubPushEventsFromService = function(promiseArray) {
    console.log("2. returning q.all promiseArray");
    return q.all(promiseArray);
};

var getFilteredEvents = function(allEvents) {
    return filterEvents(allEvents, user.latestGitHubEventDate);
};

var getUserInfoFromStreamId = function(streamid) {

    var deferred = q.defer();
    var streamIdQuery = {
        "streams": {
            $elemMatch: {
                "streamid": streamid
            }
        }
    };
    mongoDbConnection(function(qdDb) {
        qdDb.collection("users", function(err, collection) {
            collection.findOne(streamIdQuery, function(err, data) {
                if (err) {
                    deferred.reject(error);
                } else {
                    user = data;
                    deferred.resolve(data);
                }
            });
        });
    });
    return deferred.promise;
};

var createPromiseArray = function() {
    var promiseArray = [];
    var deferred = q.defer();
    var pages = _.range(1, 11);
    _.each(pages, function(page) {
        promiseArray.push(getPushEventsForUserForPage(page, user));
    });
    deferred.resolve(promiseArray);
    return deferred.promise;
};

exports.getGithubPushEvents = function(streamid, accessToken) {
    deferred = q.defer();

    githubAccessToken = accessToken;

    getUserInfoFromStreamId(streamid)
        .then(createPromiseArray)
        .then(getGithubPushEventsFromService)
        .then(_.flatten)
        .then(getFilteredEvents)
        .then(function(filteredEvents) {
            return transformToQdEvents(filteredEvents, streamid)
        })
        .then(sendEventsToPlatform)
        .then(getLatestGithubEvent)
        .then(function(latestGitHubEvent) {
            storeLastEventDate(latestGitHubEvent, user);
            deferred.resolve();
        })
        .catch(function(error) {
            console.log("Error is", error.stack);
            deferred.reject();
        });
    return deferred.promise;
};
