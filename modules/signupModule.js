var q = require('q');
var mongoRepository = require('../mongoRepository.js');
var encoder = require("../encoder");
var CreditUserSignup = require('./creditUserSignup.js');
var MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY;
var MAILCHIMP_LIST_ID = process.env.MAILCHIMP_LIST_ID;
var util = require('../util.js');
var _ = require('underscore');
var redis = require("redis");
var redisPublish = redis.createClient();


var SignupModule = function () {
};

SignupModule.prototype.startSignup = function(session){
        session.service = undefined;
        session.auth = 'signup';
    };

SignupModule.prototype.signingUpWithGithub = function(session) {
        session.service = 'github';

        // need to redo setting the auth type, since the user could
        // go to the login page, then go back to the signup page. Going
        // back to the signup page doesn't make a request to the server
        // which means session.auth ends up not being set.
        session.auth = 'signup';
    };

SignupModule.prototype.signingUpWithFacebook = function(session) {
        session.service = 'facebook';

        // need to redo setting the auth type, since the user could
        // go to the login page, then go back to the signup page. Going
        // back to the signup page doesn't make a request to the server
        // which means session.auth ends up not being set.
        session.auth = 'signup';
    };

SignupModule.prototype.getAuthService = function(session) {
        var result = '';
        if(session.service === 'github'){
            result = 'Github';
        }
        else if(session.service === 'facebook'){
            result =  'Facebook';
        }

        return result;
    };

SignupModule.prototype.getAuthServiceUrl = function(session) {
        var result = '';
        if(session.service === 'github'){
            result = 'http://github.com';
        }
        else if(session.service === 'facebook'){
            result = 'http://facebook.com';
        }

        return result;
    };

SignupModule.prototype.signup = function (user, req, res) {
    var deferredOuter = q.defer();
    //var redirect = function (user, url) {
    //    console.log("And CONTEXT URI IS ->", CONTEXT_URI);
    //    res.redirect(CONTEXT_URI + url + "?username=" + user.username);
    //};

    var findUser = function(data) {
        var deferred = q.defer();
        var by1selfUsername = {
            "username": data.username
        };
        mongoRepository.findOne('users', by1selfUsername)
            .then(function (user) {
                data.user = user;
                deferred.resolve(data);
            });
        return deferred.promise;
    };

    var doSignup = function () {
        var oneselfUsername = req.session.oneselfUsername;
        var handleError = function (error) {
            if(error === "user_exists"){
                res.redirect("/signupErrorUserExists");
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

        var checkIfUsernameExists = function (data) {
            var deferred = q.defer();
            if (data.user !== null) {
                deferred.reject("user_exists");
            } else {
                deferred.resolve(data.username);
            }
            return deferred.promise;
        };

        var insertUser = function (userRecord) {
            return mongoRepository.insert('users', userRecord);
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
                api.lists_subscribe(data, function (err) {
                    if (err) {
                        console.log("Error is", err);
                    }
                    deferred.resolve(user);
                });
            } catch (error) {
                console.log("Error occurred", error);
                deferred.reject(error);
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
                username: oneselfUsername.toLowerCase(),
                encodedUsername: encUserObj.encodedUsername,
                salt: encUserObj.salt,
                emailSettings: {
                    cards: {
                        frequency: 'weekly'
                    }
                }
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
            serviceProfileId : user.id,
            username: req.session.oneselfUsername
        };

        var sendNewUserEvent = function(userRecord){
            var message = {
                type: 'added',
                username: userRecord.username,
                _id: userRecord._id
            };

            // It's important that the publish of the event is done once the data has 
            // been written: downstream processing uses this message to know to reload 
            // the user. 
            redisPublish.publish('users', JSON.stringify(message));
            return userRecord;
        };
        
        findUser(byUsername)
            .then(checkIfUsernameExists)
            .then(encodeUsername)
            .then(createUser)
            .then(generateRegistrationToken)
            .then(insertUser)
            .then(subscribeToMailChimp)
            .then(creditUserSignup)
            .then(sendNewUserEvent)
            .then(signupComplete)
            .catch(handleError);
    };
    doSignup();
    return deferredOuter.promise;
};

module.exports = new SignupModule();
