var request = require("request");
var passport = require('passport');
var q = require('q');
var mongoRepository = require('../mongoRepository.js');
var encoder = require("../encoder");
var githubService = require("../services/githubService.js");
var CreditUserSignup = require('./creditUserSignup.js');

var SignupModule = function () {
};

SignupModule.prototype.signup = function (req, res) {
    var deferredOuter = q.defer();
    var githubUser = req.user.profile;


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
            if (error === "user_exists") {
                res.send(400, "User already exists for the passed auth details");
            } else {
                res.send(400, "Invalid request");
            }
        };

        var encodeUsername = function (oneselfUsername) {
            console.log("3\n")
            var deferred = q.defer();
            deferred.resolve(encoder.encodeUsername(oneselfUsername));
            return deferred.promise;
        };

        var signupComplete = function (userRecord) {
            deferredOuter.resolve(userRecord);
        };

        var checkIfNewUser = function (user) {
            console.log("2\n")

            var deferred = q.defer();
            if (isNewUser(user)) {
                deferred.resolve(oneselfUsername);
            } else {
                deferred.reject("user_exists");
            }
            return deferred.promise;
        };

        var insertUser = function (userRecord) {
            var deferred = q.defer();
            mongoRepository.insert('users', userRecord);
            deferred.resolve(userRecord);
            return deferred.promise;
        };

        var creditUserSignup = function (userRecord) {
            var deferred = q.defer();
            CreditUserSignup.creditUserSignUpToApp(userRecord.oneselfUsername, req.session.redirectUrl).then(function () {
                deferred.resolve(userRecord);
            });
            return deferred.promise;
        };

        var createUser = function (encUserObj) {
            var deferred = q.defer();
            console.log("4\n")
            githubService.fetchGithubUserEmails(req.user.accessToken)
                .then(function (userEmails) {
                    for (var i in userEmails) {
                        githubUser.emails.push(userEmails[i]);
                    }
                    var userEntry = {
                        githubUser: githubUser,
                        registeredOn: new Date(),
                        username: oneselfUsername,
                        encodedUsername: encUserObj.encodedUsername,
                        salt: encUserObj.salt
                    };
                    deferred.resolve(userEntry);
                }).catch(function (error) {
                    deferred.reject(error);
                })

            return deferred.promise;
        };

        var byGitHubUsername = {
            "githubUser.username": githubUser.username
        };

        findUser(byGitHubUsername)
            .then(checkIfNewUser)
            .then(encodeUsername)
            .then(createUser)
            .then(insertUser)
            .then(creditUserSignup)
            .then(signupComplete)
            .catch(handleError);
    }

    doSignup();

    return deferredOuter.promise;
}

module.exports = new SignupModule();
