var mongoRepository = require('./mongoRepository.js');
var eventRepository = require('./eventRepository.js');
var Q = require('q');
var moment = require("moment");
var platformService = require('./platformService.js');

var appIds = ["app-id-9adce70ae3ef5c4c8389910b9abb95b1", //github
    "app-id-07be2f65eccd23895b75313a1eb8283b", //lastfm
    "app-id-tw4f3dsd91d9a3e715ff98bb9eedbd0a", //twitter
    "app-id-gf4f3dsd93d9a3e715ff98bb9eedbd0a", //google fit
    "app-id-fsq9954f966461936d47b7b4ba1e6f2e", //Four Square
    "app-id-1bb5f1c77f0df722a9b1bc650a41988a", //Instagram
    "app-id-hn80883506c93b80dcf2c3780d223eaa", //Hacker News
    "app-id-st39ec18b3ad1dc3f3783f856c033418", //Strava
    "app-id-rtbbd9175a69edbc4lol5d2747b638a7"]; //Rescue time

var findStreamsForAppIds = function (appIds) {
    var query = {
        "appId": {
            "$in": appIds
        }
    };
    var projection = {
        "streamid": 1
    };
    return mongoRepository.find("stream", query, projection)
        .then(function (streams) {
            return _.forEach(streams, function (stream) {
                return stream.streamid;
            });
        });
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

findStreamsForAppIds(appIds)
    .then(function (streamIds) {
        _.forEach(streamIds, function(streamId){
            var query = {
                "payload.streamid": streamId,
                "event.createdOn": {
                    "$gt": moment("2015-03-13T00:00:00.000Z").toISOString()
                }
            };
            return eventRepository.remove("oneself",query)
                .then(function(noOfEventsRemoved){
                    console.log("No Of Events Removed: ", noOfEventsRemoved);
                    return getLatestSyncField(streamId);
                })
                .then(function(latestSyncField){
                    return updateLatestSyncField(streamId, latestSyncField)
                })
        })
    });