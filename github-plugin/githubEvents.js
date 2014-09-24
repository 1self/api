//var _ = require("underscore");
//var github = require('octonode');

var Q = require('q');
module.exports = function (mongoRepository) {

    var fetchUserDetails = function (githubUsername, accessToken) {
        return mongoRepository.findByGithubUsername(githubUsername)
            .then(function (user) {
                return {user: user, accessToken: accessToken};
            })
    };
    var getGithubPushEventsPerPage = function (page, user) {
        var githubUsername = user.githubUsername;

        var user_api_url = "/users/" + githubUsername;
        var client = github.client(githubAccessToken);
        client.get(user_api_url, {}, function (err, status, body, headers) {
        });
        var ghuser = client.user(githubUsername);

        var deferred = Q.defer();
        ghuser.events(page, ['PushEvent'], function (err, pushEvents) {
            if (err) {
                console.log("err " + err);
                deferred.reject(err);
            } else {
                deferred.resolve(pushEvents);
            }
        });
        return deferred.promise;
    };
    var fetchGithubPushEvents = function (user) {
        var deferred = Q.defer();
        var pages = _.range(1, 11);
        var promiseArray = _.map(pages, function (page) {
            return getGithubPushEventsPerPage(page, user);
        });
        deferred.resolve(_.flatten(Q.all(promiseArray)));
        return deferred.promise;
    };
    var filterEventsToBeSent = function (githubUsername) {
    };
    var convertEventsToQDFormat = function (githubUsername) {
    };

    var sendEventsToQD = function (githubUsername) {
    };
    this.sendGithubEvents = function (githubUsername, accessToken) {

        fetchUserDetails(githubUsername, accessToken)
            .then(fetchGithubPushEvents)
            .then(filterEventsToBeSent)
            .then(convertEventsToQDFormat)
            .then(sendEventsToQD);

        var deferred = Q.defer();
        console.log("Got mongo repo in github events :  " + this.mongoRepository);
        deferred.resolve({githubUsername: githubUsername, accessToken: accessToken});
        return deferred.promise;
    };

};
