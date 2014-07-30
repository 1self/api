var _ = require("underscore");
var github = require('octonode');
var client = github.client("ee4765589a75677839333a08deb224a61fcd1a8c");
client.get('/users/anildigital', {}, function(err, status, body, headers) {
  // console.log("got clilent : " + JSON.stringify(body));
});
var ghuser = client.user('anildigital');

var commitUrlsToFetchArray = []

var q = require('q');

var getPushEventsForUserForPage = function(page){
  var deferred = q.defer();
  ghuser.events(1,['PushEvent'], function(err, pushEvents) {
    if (err) {
      console.log("err " + err);
      deferred.reject(err);
    } else {
      deferred.resolve(pushEvents);
    }
  });
  return deferred.promise;  
}

var promiseArray = []
var pages = _.range(1, 11); // github support only 10 pages with 30 events per page.

_.each(pages, function(page){
  promiseArray.push(getPushEventsForUserForPage(page))
})


var singleEventTemplate = {
    "event": {
        "createdOn": {
            "$date": "2014-07-29T12:24:01.000Z"
        }
    },
    "payload": {
        "actionTags": [
            "Develop",
            "PushEvent"
        ],
        "dateTime": "${gh.createdAt}",
        "source": "GitHub",
        "version": "0.0.1.beta1",
        "objectTags": [
            "Computer",
            "Software"
        ],
        "streamid": "AJLIEHWVOGTYZTWO",
        "properties": {
        },
        "serverDateTime": {
            "$date": "2014-07-29T12:24:01.000Z"
        }
    }
}


var all_promises = q.all(promiseArray);

var pushEventTransformer = function(pageEvents) {
  _.each(pageEvents, function(singleEvent) {
    console.log(singleEvent.created_at)
  });
}

all_promises.then(function(events){
  //console.log("Events length is", JSON.stringify(events))
  // _.each(events, function(e){
    pushEventTransformer(events[0])
  // })
})





