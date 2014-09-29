var _ = require("underscore");
var github = require('octonode');
var moment = require('moment');
var Q = require('q');

module.exports = function (mongoRepository, qdService) {
    var fetchUserDetails = function (githubUsername, accessToken) {
        return mongoRepository.findByGithubUsername(githubUsername)
            .then(function (user) {
                return {user: user, accessToken: accessToken};
            })
    };
    var getGithubPushEventsPerPage = function (page, userInfo) {
        var githubUsername = userInfo.user.githubUsername;

        var user_api_url = "/users/" + githubUsername;
        var client = github.client(userInfo.accessToken);
        client.get(user_api_url, {}, function (err, status, body, headers) {
        });
        var githubUser = client.user(githubUsername);

        var deferred = Q.defer();
        githubUser.events(page, ['PushEvent'], function (err, pushEvents) {
            if (err) {
                console.log("err " + err);
                deferred.reject(err);
            } else {
                deferred.resolve(pushEvents);
            }
        });
        return deferred.promise;
    };
    var fetchGithubPushEvents = function (userInfo) {
        var deferred = Q.defer();
        var pages = _.range(1, 11);
        var promiseArray = _.map(pages, function (page) {
            return getGithubPushEventsPerPage(page, userInfo);
        });
        Q.all(promiseArray)
            .then(_.flatten)
            .then(function (events) {
                userInfo.pushEvents = events;
                deferred.resolve(userInfo);
            });
        return deferred.promise;
    };
    var filterEventsToBeSent = function (userInfo) {
        var lastGithubSyncDate = userInfo.user.lastGithubSyncDate;
        var eventsToBeSent = function (event) {
            return moment(event.created_at).isAfter(lastGithubSyncDate);
        };
        userInfo.pushEvents = _.filter(userInfo.pushEvents, eventsToBeSent);
        return userInfo;
    };
    var convertEventsToQDFormat = function (userInfo) {
        var convertEventToQDFormat = function (event) {
            var clone = function (obj) {
                return JSON.parse(JSON.stringify(obj));
            };
            var singleEventTemplate = {
                "actionTags": [
                    "Github",
                    "Push"
                ],
                "source": "GitHub",
                "objectTags": [
                    "Computer",
                    "Software",
                    "Source Control"
                ],
                "streamid": "",
                "properties": {}
            };

            var qdEvent = clone(singleEventTemplate);
            qdEvent.streamid = userInfo.user.streamid;
            qdEvent.eventDateTime = {
                "$date": moment(event.created_at).format()
            };
            return qdEvent;
        };
        userInfo.pushEvents = _.map(userInfo.pushEvents, convertEventToQDFormat);
        return userInfo;
    };
    var sendEventsToQD = function (userInfo) {
        var deferred = Q.defer();
        if (_.isEmpty(userInfo.pushEvents)) {
            deferred.reject();
            return deferred.promise;
        }
        return qdService.sendBatchEvents(userInfo.pushEvents, userInfo.user.streamid, userInfo.user.writeToken)
            .then(function () {
                return userInfo;
            });
    };

    var updateLastGithubSyncDate = function (userInfo) {
        var sortedPushEvents = _.chain(userInfo.pushEvents).sortBy(function (event) {
            return event.eventDateTime["$date"];
        }).reverse().value();
        var findQuery = {
            githubUsername: userInfo.user.githubUsername
        };
        var updateQuery = {
            "lastGithubSyncDate": moment(sortedPushEvents[0].eventDateTime["$date"]).toDate()
        };
        return mongoRepository.update(findQuery, updateQuery);
    };

    this.sendGithubEvents = function (githubUsername, accessToken) {
        return fetchUserDetails(githubUsername, accessToken)
            .then(fetchGithubPushEvents)
            .then(filterEventsToBeSent)
            .then(convertEventsToQDFormat)
            .then(sendEventsToQD)
            .then(updateLastGithubSyncDate);
    };
};
