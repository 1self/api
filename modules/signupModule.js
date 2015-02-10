var request = require("request");
var passport = require('passport');
var q = require('q');
var CONTEXT_URI = process.env.CONTEXT_URI;
var mongoRepository = require('../mongoRepository.js');
var encoder = require("../encoder");
var githubService = require("../services/githubService.js");

var SignupModule = function () {
};

SignupModule.prototype.signup = function (req, res) {
    var githubUser = req.user.profile;

    var byGitHubUsername = {
        "githubUser.username": githubUser.username
    };

    //var redirect = function (user, url) {
    //    console.log("And CONTEXT URI IS ->", CONTEXT_URI);
    //    res.redirect(CONTEXT_URI + url + "?username=" + user.username);
    //};

    var findUser = function (byGitHubUsername) {
        console.log("1\n")
        var deferred = q.defer();
        mongoRepository.findOne('users', byGitHubUsername)
            .then(function (user) {
                deferred.resolve(user);
            });
        return deferred.promise;
    }

    var doSignup = function () {

        var oneselfUsername = req.session.oneselfUsername;
        var isNewUser = function (user) {
            return !user;
        };

        var handleError = function (error) {
            console.log("6\n")
            console.log(error);
            res.send(400, "Invalid request");
        };

        var encodeUsername = function (oneselfUsername) {
            console.log("3\n")
            var deferred = q.defer();
            deferred.resolve(encoder.encodeUsername(oneselfUsername));
            return deferred.promise;
        };

        var signupComplete = function () {
            console.log("5\n")
            res.redirect("/signup_complete");
        };

        var checkIfNewUser = function (user) {
            console.log("2\n")

            var deferred = q.defer();
            if (isNewUser(user)) {
                deferred.resolve(oneselfUsername);
            } else {
                deferred.reject("User already exists")
            }
            return deferred.promise;
        }

        var createUser = function (encUserObj) {
            var deferred = q.defer();
            console.log("4\n")
            githubService.fetchGithubUserEmails(req.user.accessToken)
                .then(function (userEmails) {
                    for (var i in userEmails) {
                        githubUser.emails.push(userEmails[i]);
                    }
                    return {
                        githubUser: githubUser,
                        registeredOn: new Date(),
                        username: oneselfUsername,
                        encodedUsername: encUserObj.encodedUsername,
                        salt: encUserObj.salt
                    };
                }, function (err) {
                    console.log("Error occurred", err);
                    res.status(500).send("Could not fetch email addresses for user.");
                }).then(function (githubUserRecord) {
                    mongoRepository.insert('users', githubUserRecord);
                    deferred.resolve();
                })
            return deferred.promise;
        };

        findUser(byGitHubUsername)
            .then(checkIfNewUser)
            .then(encodeUsername)
            .then(createUser)
            .then(signupComplete)
            .catch(handleError);
    }

    doSignup();
}

module.exports = new SignupModule();
