var request = require("request");
var passport = require('passport');
var oAuthConfig = require('./oAuthConfig.js');
var githubStrategy = require('passport-github').Strategy;
var facebookStrategy = require('passport-facebook').Strategy;

module.exports = function (app) {
    var handleFacebookCallback = function (req, res) {
        var facebookUser = req.user.profile;
        var accessToken = req.user.accessToken;
        req.session.facebookAccessToken = accessToken;
        oAuthConfig.facebookOAuth.getProfilePictureUrl(facebookUser.id, accessToken)
            .then(function (profilePicUrl) {
                facebookUser.avatarUrl = profilePicUrl;
                //TODO: route to appropriate location

            }, function (err) {
                res.status(500).send("Could not fetch profile picture for user.");
            });
    };

    var handleGithubCallback = function (req, res) {
        var githubUser = req.user.profile;
        var accessToken = req.user.accessToken;
        req.session.githubAccessToken = accessToken;
        oAuthConfig.githubOAuth.getEmailAddresses(accessToken)
            .then(function (userEmails) {
                for (var i in userEmails) {
                    githubUser.emails.push(userEmails[i]);
                }
                //TODO: route to appropriate location
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
            clientID: oAuthConfig.facebookOAuth.clientID,
            clientSecret: oAuthConfig.facebookOAuth.clientSecret,
            callbackURL: oAuthConfig.facebookOAuth.callbackURL
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
            clientID: oAuthConfig.githubOAuth.clientID,
            clientSecret: oAuthConfig.githubOAuth.clientSecret,
            callbackURL: oAuthConfig.githubOAuth.callbackURL
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
        passport.authenticate('facebook', { failureRedirect: CONTEXT_URI + '/signup'}),
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