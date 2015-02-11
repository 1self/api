var request = require("request");
var passport = require('passport');
var githubStrategy = require('passport-github').Strategy;
var q = require('q');
var GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
var GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
var CONTEXT_URI = process.env.CONTEXT_URI;
var encoder = require("./encoder");

var SignupModule = require("./modules/signupModule.js");
var LoginModule = require("./modules/loginModule.js");
var IntentManager = require('./modules/intentManager.js');
var mongoRepository = require('./mongoRepository.js');

module.exports = function (app) {

    var handleGithubCallbackWithIntent = function (req, res) {

        var isNewUser = function (user) {
            return !user;
        };

        var checkUserPresent = function (byOneSelfUsername) {
            var deferred = q.defer();
            mongoRepository.findOne('users', byOneSelfUsername)
                .then(function (user) {
                    if (isNewUser(user)) {
                        deferred.resolve(false);
                    } else {
                        deferred.resolve(true);
                    }

                });
            return deferred.promise;
        };

        var byOneSelfUsername = {
            "username": req.session.oneselfUsername
        };

        var doAuth = function (status) {
            var deferred = q.defer();
            if (status) {
                LoginModule.login(req, res).then(function () {
                    deferred.resolve();
                });
            }
            else {
                SignupModule.signup(req, res).then(function () {
                    deferred.resolve();
                });
            }
            return deferred.promise;
        };

        checkUserPresent(byOneSelfUsername)
            .then(doAuth)
            .then(function () {
                IntentManager.process(req.session.intent, req, res);
            })
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
