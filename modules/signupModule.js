var request = require("request");
var passport = require('passport');
var q = require('q');
var mongoRepository = require('../mongoRepository.js');
var encoder = require("../encoder");
var githubService = require("../services/githubService.js");
var CreditUserSignup = require('./creditUserSignup.js');
var MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY;
var MAILCHIMP_LIST_ID = process.env.MAILCHIMP_LIST_ID;
var util = require('../util.js');
var _ = require('underscore');

var SignupModule = function () {
};

SignupModule.prototype.signup = function (user, req, res) {
    var deferredOuter = q.defer();
    //var redirect = function (user, url) {
    //    console.log("And CONTEXT URI IS ->", CONTEXT_URI);
    //    res.redirect(CONTEXT_URI + url + "?username=" + user.username);
    //};

    var findUser = function (byUsername) {
        var deferred = q.defer();
        mongoRepository.findOne('users', byUsername)
            .then(function (user) {
                deferred.resolve(user);
            });
        return deferred.promise;
    };

    var doSignup = function () {
        var oneselfUsername = req.session.oneselfUsername;
        var isNewUser = function (user) {
            return !user;
        };
        var handleError = function (error) {
            if (error === "user_exists") {
                res.send(400, "User already exists for the passed auth details");
            } else {
                res.send(400, "Invalid request");
            }
        };
        var encodeUsername = function (oneselfUsername) {
            var deferred = q.defer();
            deferred.resolve(encoder.encodeUsername(oneselfUsername));
            return deferred.promise;
        };
        var signupComplete = function (userRecord) {
            deferredOuter.resolve(userRecord);
        };
        var checkIfNewUser = function (user) {
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
        var subscribeToMailChimp = function (user) {
            var deferred = q.defer();
            var email;
            var MailChimpAPI = require('mailchimp').MailChimpAPI;
            var mailChimpAPIKey = MAILCHIMP_API_KEY;
            var primaryEmailRec = _.filter(user.profile.emails, function (rec) {
                return rec.primary;
            });
            email = _.isEmpty(primaryEmailRec)?user.profile.emails[0].value:primaryEmailRec[0].email;
            try {
                var api = new MailChimpAPI(mailChimpAPIKey, {version: '2.0'});
                var data = {
                    "id": MAILCHIMP_LIST_ID,
                    "email": {email: email},
                    "double_optin": false
                };
                api.lists_subscribe(data, function (err, result) {
                    if (err) {
                        console.log("Error is", err);
                    }
                    deferred.resolve(user);
                });
            } catch (error) {
                console.log("Error occurred", error);
                deferred.reject(error)
            }
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
            var userCreated = {
                profile: user,
                registeredOn: new Date(),
                username: oneselfUsername,
                encodedUsername: encUserObj.encodedUsername,
                salt: encUserObj.salt
            };
            return userCreated;
        };
        var generateRegistrationToken = function (userEntry) {
            return util.generateRegistrationToken()
                .then(function (registrationToken) {
                    userEntry.registrationToken = registrationToken;
                    return userEntry;
                });
        };
        var byUsername = {
            "profile.id": user.id
        };
        findUser(byUsername)
            .then(checkIfNewUser)
            .then(encodeUsername)
            .then(createUser)
            .then(generateRegistrationToken)
            .then(insertUser)
            .then(subscribeToMailChimp)
            .then(creditUserSignup)
            .then(signupComplete)
            .catch(handleError);
    };
    doSignup();
    return deferredOuter.promise;
};

module.exports = new SignupModule();
