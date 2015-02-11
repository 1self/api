var request = require("request");
var passport = require('passport');
var q = require('q');
var CONTEXT_URI = process.env.CONTEXT_URI;
var mongoRepository = require('../mongoRepository.js');
var encoder = require("../encoder");
var sessionManager = require("../sessionManagement");

var LoginModule = function () {
};

LoginModule.prototype.login = function (req, res) {
    var deferred = q.defer();

    var githubUser = req.user.profile;

    var byGitHubUsername = {
        "githubUser.username": githubUser.username
    };

    var redirect = function (user, url) {
        console.log("And CONTEXT URI IS ->", CONTEXT_URI);
        res.redirect(CONTEXT_URI + url + "?username=" + user.username);
    };

    var findUser = function (byGitHubUsername) {
        var deferred = q.defer();
        mongoRepository.findOne('users', byGitHubUsername)
            .then(function (user) {
                deferred.resolve(user);
            });
        return deferred.promise;
    }

    var doLogin = function () {
        var setSessionData = function (user) {
            var deferred = q.defer();
            sessionManager.setSession(req, user)
            deferred.resolve(user);
            return deferred.promise;
        }

        //
        //var loginComplete = function (user) {
        //    if (req.session.redirectUrl) {
        //        var redirectUrl = req.session.redirectUrl;
        //        delete req.session.redirectUrl;
        //        if (redirectUrl.match("/v1/streams")) {
        //            var tokenisedUrl = redirectUrl.split("/");
        //            tokenisedUrl[2] = "users";
        //            tokenisedUrl[3] = req.session.username;
        //            redirectUrl = tokenisedUrl.join("/");
        //        }
        //        res.cookie('_eun', req.session.encodedUsername);
        //        res.redirect(redirectUrl);
        //    } else {
        //        redirect(user, "/dashboard");
        //    }
        //};

        findUser(byGitHubUsername)
            .then(setSessionData)
            .then(function () {
                deferred.resolve();
            }).catch(function (error) {
                console.log("Error occurred", error);
            })
    }

    doLogin();

    return deferred.promise;
};


module.exports = new LoginModule();
