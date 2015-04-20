var mongoRepository = require('./mongoRepository.js');
var eventRepository = require('./eventRepository.js');
var Q = require('q');
var moment = require("moment");
var platformService = require('./platformService.js');

var appIds = ["app-id-9adce70ae3ef5c4c8389910b9abb95b1", //github
    "app-id-07be2f65eccd23895b75313a1eb8283b", //lastfm
    "app-id-tw4f3dsd91d9a3e715ff98bb9eedbd0a", //twitter
    "app-id-gf4f3dsd93d9a3e715ff98bb9eedbd0a"]; //Google Fit

var findStreamsForAppIds = function (appIds) {

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
            if (_.isEmpty(result)) {
                deferred.resolve();
            }
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

var query = {
    "appId": {
        "$in": appIds
    }
};
var projection = {};

mongoRepository.find("stream", query, projection)
    .then(function (streams) {
        _.forEach(streams, function (stream) {
            var query = {
                "payload.streamid": stream.streamid,
                "event.createdOn": {
                    "$gt": moment("2015-03-13T00:00:00.000Z").toISOString()
                }
            };
            return eventRepository.remove("oneself", query)
                .then(function (noOfEventsRemoved) {
                    console.log("No Of Events Removed: ", noOfEventsRemoved);
                    return getLatestSyncField(streamId);
                })
                .then(function (latestSyncField) {
                    if (_.isEmpty(latestSyncField)) {
                        if (stream.appId === "app-id-tw4f3dsd91d9a3e715ff98bb9eedbd0a") {
                            latestSyncField = "00000000";
                        }
                        else if(stream.appId === "app-id-gf4f3dsd93d9a3e715ff98bb9eedbd0a"){
                            latestSyncField = null;
                        }
                        else {
                            latestSyncField = new Date(1970,1,1).toISOString();
                        }
                    }
                    return updateLatestSyncField(streamId, latestSyncField)
                })
        });
    });