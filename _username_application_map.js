var mongoRepository = require('./mongoRepository.js');
var Q = require('q');
var _ = require("underscore");

var findAppsFor = function(username){
        var streams = [];
        
        mongoRepository.find('users', {
                'username': username
        })
                .then(collectStreams)
                .then(retrieveStreams)
                .then(function(streamsList){
                        streams = streamsList;
                        return collectAppIds(streams);
                })
                .then(getRegisteredApps)
                .then(function(apps){
                        return drawMap(streams, apps);
                })
                .then(function(){
                        console.log("Jhala");
                });
};

var collectStreams = function(user){
        var deferred = Q.defer();
        var listOfStreamsIds = [];
        user.streams.forEach(function(stream){
                listOfStreamsIds.push(stream.streamid);
        });

        deferred.resolve(listOfStreamsIds);
        return deferred.promise;
};

var retrieveStreams = function(arrayOfStreamIds){
        return mongoRepository.find('streams', {
                'streamid': {$in: arrayOfStreamIds}
        });
};

var getRegisteredApps = function(listOfAppIds){
        return mongoRepository.find('registeredApps', {
                'appId': {$in: listOfAppIds}
        });
};

var collectAppIds = function(streams){
        var deferred = Q.defer();
        var listOfAppIds = [];
        streams.forEach(function(stream){
                listOfAppIds.push(stream.appId);
        });

        deferred.resolve(listOfAppIds);
        return deferred.promise;
};

var drawMap = function(streams, apps){
        var deferred = Q.defer();
        streams.forEach(function(stream){
                var app = _.find(apps, function(app) { return app.appId == stream.appId; });
                console.log(app.appName + "   "  + stream.streamid);
        });
        
        deferred.resolve(true);
        return deferred.promise;
};

findAppsFor("devaroop");

