var request = require("request");
var passport = require('passport');
var githubStrategy = require('passport-github').Strategy;
var q = require('q');
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

        var isNewUser = function (user) {
            return !user;
        };

        var setSessionData = function(user){
            console.log("USER HERE IS", JSON.stringify(user));
            var deferred = q.defer();
            sessionManager.setSession(req, user);
            deferred.resolve();
            return deferred.promise;
        }

        var checkUserPresent = function (byOneSelfUsername) {
            var deferred = q.defer();
            mongoRepository.findOne('users', byOneSelfUsername)
                .then(function (user) {
                    deferred.resolve(user);
                });
            return deferred.promise;
        };

        var byOneSelfUsername = {
            "username": req.session.oneselfUsername
        };

        var doAuth = function (user) {
            var deferred = q.defer();
            console.log("user is " + user);

            // detect whether someone is trying to login 
            // before they have joined

            console.log("testing user");
            console.log(req.session.auth);
            console.log((byOneSelfUsername.username === undefined || byOneSelfUsername.username === null));
            if(req.session.auth === 'github.login' && (byOneSelfUsername.username === undefined || byOneSelfUsername.username === null)){
                console.log('user tried to login with unknown github');
                res.redirect('/unknownLogin');
            }

            if (isNewUser(user)) {
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

        checkUserPresent(byOneSelfUsername)
            .then(doAuth)
            .then(setSessionData)
            .then(function () {
                IntentManager.process(req.session.intent, req, res);
            }).catch(function(error){
                console.log("Error occurred", error);
                res.send(400, "Error occurred");
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
