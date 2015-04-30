var mongoRepository = require('./mongoRepository.js');
var Q = require('q');
var _ = require("underscore");

var findAppsFor = function(username){
        console.log("Quering data for user: " + username);

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
        console.log("Collecting streams for: " + user.username);
        var deferred = Q.defer();
        var listOfStreamsIds = [];
        user.streams.forEach(function(stream){
                listOfStreamsIds.push(stream.streamid);
        });

        deferred.resolve(listOfStreamsIds);
        return deferred.promise;
};

var retrieveStreams = function(arrayOfStreamIds){
        console.log("Retrieving stream objects...");
        return mongoRepository.find('streams', {
                'streamid': {$in: arrayOfStreamIds}
        });
};

var getRegisteredApps = function(listOfAppIds){
        console.log("Retrieving registered apps.....");
        return mongoRepository.find('registeredApps', {
                'appId': {$in: listOfAppIds}
        });
};

var collectAppIds = function(streams){
        console.log("Collecting appsIds from streams...");
        var deferred = Q.defer();
        var listOfAppIds = [];
        streams.forEach(function(stream){
                listOfAppIds.push(stream.appId);
        });

        deferred.resolve(listOfAppIds);
        return deferred.promise;
};

var drawMap = function(streams, apps){
        console.log("Drawing map");
        var deferred = Q.defer();
        streams.forEach(function(stream){
                var app = _.find(apps, function(app) { return app.appId == stream.appId; });
                console.log(app.appName + "   "  + stream.streamid);
        });
        
        deferred.resolve(true);
        return deferred.promise;
};

findAppsFor("devaroop");

