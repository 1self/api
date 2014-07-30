var _ = require("underscore");
var github = require('octonode');
var q = require('q');

var commitUrlsToFetchArray = [];
var promiseArray = []
    // github support only 10 pages with 30 events per page.

var getPushEventsForUserForPage = function(page, username) {

    var user_api_url = "/users/" + username;
    var client = github.client("ee4765589a75677839333a08deb224a61fcd1a8c");
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
    "properties": {
    }
}


// var transformPushEventToQD = function(pageEvents,qd_events) {

//     _.each(pageEvents, function(pushEvent) {
//         qd_events.push(pushEvent.createdAt)
//     });

// }

// var transformToQdEvents = function(allEvents) {
//     var qdEvents = [];

//     console.log("All events size is", allEvents.length)

//     var getPageEvents = function(pageEvents) {
//         var getQDEvents = function(pushEvents) {
//             _.each(pushEvents, function(event) {
//                var qdEvent = clone(singleEventTemplate);
//                qdEvent.dateTime = event.created_at;
//                qdEvents.push(qdEvent);
//             })
//         }
//         _.each(allEvents, function(pushEvents) {
//             getQDEvents(pushEvents)
//         });
//     }

//     _.each(allEvents, function(pageEvents) {
//         getPageEvents(pageEvents)
//     });

//     return qdEvents;
// }


var transformToQdEvents = function(allEvents) {
    var qdEvents = [];
     _.each(allEvents, function(event) {
       var qdEvent = clone(singleEventTemplate);
       qdEvent.dateTime = event.created_at;
       qdEvents.push(qdEvent);
    })
    return qdEvents;
}


var filterEvents = function(allEvents, lastEventDate){
    return _.filter(allEvents, function(event){ 
        return true;// event.created_at > lastEventDate
    });
}

// fetch github events

// filter github events(check if events already present in platform)

// transform to oneself events

// send events to pt in loop 

// get events from pt

exports.fetchGitEvents = function(username) {
    var pages = _.range(1, 11);
    var promiseArray = [];

    _.each(pages, function(page) {
        promiseArray.push(getPushEventsForUserForPage(page, username))
    });
    // get lastEventDate from db
    var lastEventDate = "";

    return q.all(promiseArray)
    .then(_.flatten)
    .then(function(allEvents) { return filterEvents(allEvents, lastEventDate) })
    .then(transformToQdEvents)
    //then send to platforms 
    //then store lastEventDate
    .catch(function(error) {
        console.log("Error is", error.stack)
    });
}