var _ = require("underscore");
var github = require('octonode');
var q = require('q');
var requestModule = require('request');
var crypto = require('crypto');
var commitUrlsToFetchArray = [];
var promiseArray = []
var platformUri = process.env.PLATFORM_BASE_URI;
// github support only 10 pages with 30 events per page.
var sharedSecret = process.env.SHARED_SECRET;

var mongoDbConnection = require('./lib/connection.js');

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
    var client = github.client("ee4765589a75677839333a08deb224a61fcd1a8c");
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
    })
        return qdEvents;
}

var storeLastEventDate = function(latestDateEvent, username) {
    console.log("latestDateEvent is", JSON.stringify(latestDateEvent));
    console.log("username is", username);

    mongoDbConnection(function(qdDb) {
        qdDb.collection("users", function(err, collection) {
            collection.update({"username" : username},
                              { $set: { "lastGitHubEventDate":  latestDateEvent.dateTime }},
                              { upsert: true }, function(error, data) {
                                  if(error) { 
                                      console.log(error);
                                  } else {
                                      console.log("Update success", data);
                                  }
                              });
        }
                       ) 
    });
}


var filterEvents = function(allEvents, lastEventDate) {
    return _.filter(allEvents, function(event) {
        return true; // event.created_at > lastEventDate
    });
}

var getLatestDateEvent = function(events) {
    var sortedEvents = _.chain(events).sortBy(function(event){
        return  event.dateTime;
    }).reverse().value();

    return sortedEvents[0]    
}
var sendEventsToPlatform = function(myEvents) {
    var deferred = q.defer();
    var encryptedPassword = encryptPassword();
    var myEventsWithPayload = []
    _.each(myEvents, function(myEvent) {
        myEventsWithPayload.push({
            'payload': myEvent
        })
    })
        var options = {
            url: platformUri + '/rest/events/batch',
            auth: {
                user: "",
                password: encryptedPassword
            },
            json: myEventsWithPayload
        };
    requestModule.post(options,
                       function(error, response, body) {
                           if (!error && response.statusCode == 200) {
                               deferred.resolve(myEvents);
                           } else {
                               // res.status(500).send("Database error");
                           }
                       })
    return deferred.promise;
}

// fetch github events

// filter github events(check if events already present in platform)

// transform to oneself events

// send events to pt in loop 

// get events from pt

exports.fetchGitEvents = function(githubUsername, username) {
    var pages = _.range(1, 11);
    var promiseArray = [];

    _.each(pages, function(page) {
        promiseArray.push(getPushEventsForUserForPage(page, githubUsername))
    });
    // get lastEventDate from db
    var lastEventDate = "";

    return q.all(promiseArray)
        .then(_.flatten)
        .then(function(allEvents) {
            return filterEvents(allEvents, lastEventDate)
        })
        .then(transformToQdEvents)
        .then(sendEventsToPlatform)
        .then(getLatestDateEvent)
        .then(function(latestDateEvent) {
            return storeLastEventDate(latestDateEvent, username) }
             )
        .catch(function(error) {
            console.log("Error is", error.stack)
        });
}
