var request = require("request");
var passport = require('passport');
var githubStrategy = require('passport-github').Strategy;
var _ = require('underscore');
var moment = require('moment');

var GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
var GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
var CONTEXT_URI = process.env.CONTEXT_URI;

module.exports = function (app, mongoRepository, qdService) {

    var handleGithubCallback = function (req, res) {
        var githubUser = req.user.profile;
        var githubUsername = githubUser.username;
        req.session.accessToken = req.user.accessToken;
        req.session.githubUsername = githubUsername;
        console.log("github User is : " + JSON.stringify(githubUser));

        var insertStreamInDb = function (streamDetails) {
            console.log("StreamDetails: " + JSON.stringify(streamDetails));
            var document = {
                githubUsername: githubUsername,
                streamid: streamDetails.streamid,
                writeToken: streamDetails.writeToken,
                lastGithubSyncDate: moment.unix(0).toDate()
            };
            return mongoRepository.insert(document);
        };
        var registerStreamForNewUser = function () {
            return qdService.registerStream()
                .then(insertStreamInDb);
        };
        mongoRepository.findByGithubUsername(githubUsername)
            .then(function (user) {
                if (_.isEmpty(user)) {
                    return registerStreamForNewUser();
                }
            })
            .then(function () {
                res.redirect("/authSuccess");
            })
            .catch(function (error) {
                console.error("Error in github callback: ", error);
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
        scope: 'repo'
    }));

    app.get('/auth/github/callback', passport.authenticate('github', {
        failureRedirect: CONTEXT_URI
    }), handleGithubCallback);
}
;
