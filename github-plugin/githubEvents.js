//var _ = require("underscore");
//var github = require('octonode');
var q = require('q');

module.exports = function (mongoRepository) {
    this.mongoRepository = mongoRepository;

    this.getGithubEvents = function (githubUsername, accessToken) {
        var deferred = q.defer();
        console.log("Got mongo repo in github events :  " + this.mongoRepository);
        deferred.resolve({githubUsername: githubUsername, accessToken: accessToken});
        return deferred.promise;
    };

};
