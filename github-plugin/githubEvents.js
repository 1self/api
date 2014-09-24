//var _ = require("underscore");
//var github = require('octonode');
var mongo
var q = require('q');

exports.getGithubEvents = function (githubUsername, accessToken) {
    var deferred = q.defer();
    deferred.resolve({githubUsername: githubUsername, accessToken: accessToken});
    return deferred.promise;
};
