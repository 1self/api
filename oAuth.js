var request = require("request");
var passport = require('passport');
var oAuthConfig = require('./oAuthConfig.js');
var githubStrategy = require('passport-github').Strategy;
var facebookStrategy = require('passport-facebook').Strategy;
var encoder = require("./encoder");
var sessionManager = require("./sessionManagement");
var _ = require("underscore");
var q = require("q");

var SignupModule = require("./modules/signupModule.js");
var LoginModule = require("./modules/loginModule.js");
var IntentManager = require('./modules/intentManager.js');
var mongoRepository = require('./mongoRepository.js');
var CONTEXT_URI = process.env.CONTEXT_URI;

module.exports = function (app) {
    var githubOAuth = oAuthConfig.getGithubOAuthConfig();
    var facebookOAuth = oAuthConfig.getFacebookOAuthConfig();

    var handleOAuthWithIntent = function (oAuthUser, req, res) {
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
            if ((req.session.auth === 'login') && isEmpty(user)) {
                deferred.reject("invalid_username");
            } else {
                deferred.resolve(user);
            }
            return deferred.promise;
        };
        var checkSignupWithExistingAuth = function (user) {
            var deferred = q.defer();
            if (!(_.isEmpty(req.session.oneselfUsername)) && isNotEmpty(user)) {
                deferred.reject("auth_exists_cant_signup");
            } else {
                deferred.resolve(user);
            }
            return deferred.promise;
        };
        var doAuth = function (user) {
            var deferred = q.defer();

            if (isEmpty(user)) {
                SignupModule.signup(oAuthUser,req, res).then(function (userRecord) {
                    deferred.resolve(userRecord);
                });
            }
            else {
                LoginModule.login(oAuthUser, req, res).then(function () {
                    deferred.resolve(user);
                });
            }
            return deferred.promise;
        };
        var userQuery = {
            "profile.id": oAuthUser.id
        };
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

    var handleFacebookCallback = function (req, res) {
        var facebookUser = req.user.profile;
        var accessToken = req.user.accessToken;
        req.session.facebookAccessToken = accessToken;
        oAuthConfig.getFacebookProfilePictureUrl(facebookUser.id, accessToken)
            .then(function (profilePicUrl) {
                facebookUser.avatarUrl = profilePicUrl;
                handleOAuthWithIntent(facebookUser, req, res);
            }, function (err) {
                res.status(500).send("Could not fetch profile picture for user.");
            });
    };

    var handleGithubCallback = function (req, res) {
        var githubUser = req.user.profile;
        var accessToken = req.user.accessToken;
        req.session.githubAccessToken = accessToken;
        githubUser.avatarUrl = githubUser._json.avatar_url;

        oAuthConfig.getGithubEmailAddresses(accessToken)
            .then(function (userEmails) {
                for (var i in userEmails) {
                    githubUser.emails.push(userEmails[i]);
                }
                handleOAuthWithIntent(githubUser, req, res);
            }, function (err) {
                res.status(500).send("Could not fetch email addresses for user.");
            });
    };

    passport.serializeUser(function (user, done) {
        done(null, user);
    });
    passport.deserializeUser(function (obj, done) {
        done(null, obj);
    });
    passport.use(new facebookStrategy({
            clientID: facebookOAuth.clientId,
            clientSecret: facebookOAuth.clientSecret,
            callbackURL: facebookOAuth.callbackUrl
        },
        function (accessToken, refreshToken, profile, done) {
            var facebookProfile = {
                profile: profile,
                accessToken: accessToken
            };
            return done(null, facebookProfile);
        }
    ));

    passport.use(new githubStrategy({
            clientID: githubOAuth.clientId,
            clientSecret: githubOAuth.clientSecret,
            callbackURL: githubOAuth.callbackUrl
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

    app.get('/auth/facebook',
        passport.authenticate('facebook', {scope: 'email'}),
        function (req, res) {
        });
    app.get('/auth/facebook/callback',
        passport.authenticate('facebook', {failureRedirect: CONTEXT_URI + '/signup'}),
        handleFacebookCallback);

    app.get('/auth/github', passport.authenticate('github', {
        scope: 'user:email'
    }));
    app.get('/auth/github/1self_website', function (req, res, next) {
        req.session.redirectUrl = "/dashboard";
        passport.authenticate('github', {
            scope: 'user:email'
        })(req, res, next);
    });
    app.get('/auth/github/callback', passport.authenticate('github', {
        failureRedirect: CONTEXT_URI + '/signup'
    }), handleGithubCallback);
};