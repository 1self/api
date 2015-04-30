// Way to run:
//change username as necessary at line "89"
//run with DBURI=<Your db URI> node _username_application_map.js

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
			console.log("Streams found: " + streamsList.length);
                        streams = streamsList;
                        return collectAppIds(streams);
                })
                .then(getRegisteredApps)
                .then(function(apps){
			console.log("Apps found: " + apps.length)
                        return drawMap(streams, apps);
                })
                .then(function(){
                        console.log("Jhala");
                        process.exit(0);
                });
};

var collectStreams = function(user){
	user = user[0];
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
        console.log("Retrieving stream objects from array: " + arrayOfStreamIds);
        return mongoRepository.find('stream', {
                'streamid': {"$in": arrayOfStreamIds}
        });
};

var getRegisteredApps = function(listOfAppIds){
        console.log("Retrieving registered apps.....");
        return mongoRepository.find('registeredApps', {
                'appId': {"$in": listOfAppIds}
        });
};

var collectAppIds = function(streams){
        console.log("Collecting appsIds from streams...");
        var deferred = Q.defer();
        var listOfAppIds = [];
        streams.forEach(function(stream){
                listOfAppIds.push(stream.appId);
        });

	console.log("List of appids: " + listOfAppIds);
        deferred.resolve(listOfAppIds);
        return deferred.promise;
};

var drawMap = function(streams, apps){
        console.log("Drawing map");
        var deferred = Q.defer();
        streams.forEach(function(stream){
		if(stream.appId !== undefined){
                        var app = _.find(apps, function(app) {return app.appId === stream.appId; });
                        console.log("Name: " + app.appName + "   "  +  "     Title: " + app.title + "     AppId: " + app.appId + "    StreamId: " + stream.streamid);
                }
        });
        
        deferred.resolve(true);
        return deferred.promise;
};


findAppsFor("devaroop");
