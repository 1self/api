//var _ = require("underscore");
//var github = require('octonode');
var q = require('q');

module.exports = function (mongoRepository) {
    this.mongoRepository = mongoRepository;

    var fetchUserDetails = function (githubUsername) {
        var deferred = q.defer();
        mongoRepository.findByGithubUsername(githubUsername)
            .then(function(userRecord){
                if(userRecord){
                    deferred.resolve(userRecord);
                }
                else {
                    registerStream()
                        .then(function(streamDetails){
                            mongoRepository.insert(githubUsername, streamDetails)
                        })
                }
            });
    };
    var fetchGithubPushEvents = function (githubUsername) {
    };
    var filterEventsToBeSent = function (githubUsername) {
    };
    var convertEventsToQDFormat = function (githubUsername) {
    };
    var sendEventsToQD = function (githubUsername) {
    };

    this.sendGithubEvents = function (githubUsername, accessToken) {
        /*fetchUserDetails(githubUsername)
            .then(fetchGithubPushEvents)
            .then(filterEventsToBeSent)
            .then(convertEventsToQDFormat)
            .then(sendEventsToQD);*/

        var deferred = q.defer();
        console.log("Got mongo repo in github events :  " + this.mongoRepository);
        deferred.resolve({githubUsername: githubUsername, accessToken: accessToken});
        return deferred.promise;
    };

};
