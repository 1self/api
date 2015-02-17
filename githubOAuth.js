var request = require("request");
var passport = require('passport');
var githubStrategy = require('passport-github').Strategy;
var q = require("q");
var _ = require("underscore");
var GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
var GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
var CONTEXT_URI = process.env.CONTEXT_URI;
var encoder = require("./encoder");
var sessionManager = require("./sessionManagement");

var SignupModule = require("./modules/signupModule.js");
var LoginModule = require("./modules/loginModule.js");
var IntentManager = require('./modules/intentManager.js');
var mongoRepository = require('./mongoRepository.js');

module.exports = function (app) {

    var handleGithubCallbackWithIntent = function (req, res) {
        var githubUser = req.user.profile;

        var isEmpty = function (user) {
            return !user;
        };

        var isNotEmpty = function (user) {
            return !!user;
        };

        var setSessionData = function (user) {
            var deferred = q.defer();
            sessionManager.setSession(req, res, user);
            deferred.resolve();
            return deferred.promise;
        };

        var checkUserPresent = function (userQuery) {
            var deferred = q.defer();
            mongoRepository.findOne('users', userQuery)
                .then(function (user) {
                    deferred.resolve(user);
                });
            return deferred.promise;
        };

        var validateUserAction = function (user) {
            var deferred = q.defer();
            if ((req.session.auth === 'github.login') && isEmpty(user)) {
                deferred.reject("invalid_username");
            } else {
                deferred.resolve(user);
            }
            return deferred.promise;
        };

        var checkSignupWithExistingAuth = function(user) {
            var deferred = q.defer();
            if (!(_.isEmpty(req.session.oneselfUsername)) && isNotEmpty(user)){
                deferred.reject("auth_exists_cant_signup");
            } else {
                deferred.resolve(user);
            }
            return deferred.promise;
        };

        var doAuth = function (user) {
            var deferred = q.defer();

            if (isEmpty(user)) {
                console.log("auth process is signup");
                SignupModule.signup(req, res).then(function (userRecord) {
                    deferred.resolve(userRecord);
                });
            }
            else {
                console.log("auth process is login");
                LoginModule.login(req, res).then(function () {
                    deferred.resolve(user);
                });
            }
            return deferred.promise;
        };

        var userQuery = {
            "githubUser.username": githubUser.username
        };

        console.log("User query is ",userQuery);

        checkUserPresent(userQuery)
            .then(validateUserAction)
            .then(checkSignupWithExistingAuth)
            .then(doAuth)
            .then(setSessionData)
            .then(function () {
                IntentManager.process(req.session.intent, req, res);
            }).catch(function (errorCode) {
                console.log("ERROR CODE IS,", errorCode);
                IntentManager.handleError(errorCode, req, res);
            });
    };

    passport.serializeUser(function (user, done) {
        done(null, user);
    });

    passport.deserializeUser(function (obj, done) {
        done(null, obj);
    });

    passport.use(new githubStrategy({
            clientID: GITHUB_CLIENT_ID,
            clientSecret: GITHUB_CLIENT_SECRET,
            callbackURL: CONTEXT_URI + "/auth/github/callback"
        },
        function (accessToken, refreshToken, profile, done) {
            var githubProfile = {
                profile: profile,
                accessToken: accessToken
            };
            return done(null, githubProfile);
        }
    ));
    app.use(passport.initialize());
    app.use(passport.session());

    app.get('/auth/github', passport.authenticate('github', {
        scope: 'user:email'
    }));

    app.get('/auth/github/callback', passport.authenticate('github', {
        failureRedirect: CONTEXT_URI + '/signup'
    }), handleGithubCallbackWithIntent);
};
