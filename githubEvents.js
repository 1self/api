var _ = require("underscore");
var github = require('octonode');
var q = require('q');
var request = require('request');
var crypto = require('crypto');
var platformUri = process.env.PLATFORM_BASE_URI;
var sharedSecret = process.env.SHARED_SECRET;
var mongoDbConnection = require('./lib/connection.js');
var user;

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
        return encryptedPassword;
    }
};

var getPushEventsForUserForPage = function(page, username) {

    var user_api_url = "/users/" + username;
    var client = github.client("47ee81f239affd2a82f553328c014cc0dda37aea");
    //var client = github.client();    
    client.get(user_api_url, {}, function(err, status, body, headers) {
        // console.log("got clilent : " + JSON.stringify(body));
    });
    var ghuser = client.user(username);

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
}

function clone(a) {
    return JSON.parse(JSON.stringify(a));
}

var singleEventTemplate = {
    "actionTags": [
        "Develop",
        "PushEvent"
    ],
    "dateTime": "",
    "source": "GitHub",
    "objectTags": [
        "Computer",
        "Software"
    ],
    "streamid": "AJLIEHWVOGTYZTWO",
    "properties": {}
}

var transformToQdEvents = function(allEvents) {
    var qdEvents = [];
    _.each(allEvents, function(event) {
        var qdEvent = clone(singleEventTemplate);
        qdEvent.dateTime = event.created_at;
        qdEvents.push(qdEvent);
    });
    console.log("4. Transformed to QD Events", qdEvents.length);

    return qdEvents;
}

var storeLatestEventDate = function(latestGitHubEvent, username) {
    console.log("latestGitHubEvent is", JSON.stringify(latestGitHubEvent));
    console.log("username is", username);
    console.log("7a. storeLatestEventDate", JSON.stringify(latestGitHubEvent))

    if (latestGitHubEvent !== undefined) {
        mongoDbConnection(function(qdDb) {
            qdDb.collection("users", function(err, collection) {
                collection.update({
                    "username": username
                }, {
                    $set: {
                        "latestGitHubEventDate": latestGitHubEvent.dateTime
                    }
                }, {
                    upsert: true
                }, function(error, data) {
                    if (error) {
                        console.log(error);
                    } else {
                        console.log("7b. storeLatestEventDate")
                        console.log("Update success", data);
                    }
                });
            });
        });
    }
}


var filterEvents = function(allEvents, latestGitHubEventDate) {
    // console.log("All events before filtering : ", allEvents);
    console.log("3a. filterEvents", latestGitHubEventDate);

    var filteredEvents = _.filter(allEvents, function(event) {
        console.log("lastEvent Date in filter", latestGitHubEventDate)
        if (latestGitHubEventDate !== undefined) {
            console.log("3b. filterEvents last event date should not be undefined", latestGitHubEventDate);
            return event.created_at > latestGitHubEventDate
        } else {
            console.log("3b. filterEvents last event date should be undefined", latestGitHubEventDate);
            return true
        }
    });
    return filteredEvents;
    // console.log("Filtered events : ", filteredEvents);
};

var getLatestGithubEvent = function(events) {
    console.log("6a. getLatestGithubEvent is", events.length);
    var sortedEvents = _.chain(events).sortBy(function(event) {
        return event.dateTime;
    }).reverse().value();

    console.log("6b. getLatestGithubEvent is", events.length);

    console.log("SORTED EVENT is ", JSON.stringify(sortedEvents[0]))
    return sortedEvents[0];
};

var sendEventsToPlatform = function(myEvents) {
    var deferred = q.defer();
    var encryptedPassword = encryptPassword();
    var myEventsWithPayload = [];
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
                // res.status(500).send("Database error");
            }
        });
    return deferred.promise;
};

// fetch github events

// filter github events(check if events already present in platform)

// transform to oneself events

// send events to pt in loop 

// get events from pt

var getGithubPushEventsFromService = function(promiseArray) {
    console.log("2. returning q.all promiseArray");
    return q.all(promiseArray)
}

var getFilteredEvents = function(allEvents) {
    return filterEvents(allEvents, user.latestGitHubEventDate);
}

// var getLatestGithubEventDate = function(user) {
//     var deferred = q.defer();
//     deferred.resolve(user.latestGitHubEventDate)
//     return deferred.promise;
// }
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
                    console.log("User is getting set here ", user);
                    deferred.resolve(data);
                }
            })
        });
    });
    return deferred.promise;
}

var createPromiseArray = function(user) {
    var promiseArray = [];
    var deferred = q.defer();
    var pages = _.range(1, 11);
    console.log("User here is : ",user);
    _.each(pages, function(page) {
        promiseArray.push(getPushEventsForUserForPage(page, user.githubUser.username));
    });
    deferred.resolve(promiseArray);
    return deferred.promise;
};

exports.getGithubPushEvents = function(streamid) {

    return getUserInfoFromStreamId(streamid)
        .then(createPromiseArray)
        .then(getGithubPushEventsFromService)
        .then(_.flatten)
        .then(getFilteredEvents)
        .then(transformToQdEvents)
        .then(sendEventsToPlatform)
        .then(getLatestGithubEvent)
        .then(function(latestGitHubEvent) {
            return storeLatestEventDate(latestGitHubEvent, user.username);
        })
        .catch(function(error) {
            console.log("Error is", error.stack);
        });
};