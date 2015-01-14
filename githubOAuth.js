var request = require("request");
var passport = require('passport');
var githubStrategy = require('passport-github').Strategy;

var GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
var GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
var CONTEXT_URI = process.env.CONTEXT_URI;
var mongoDbConnection = require('./lib/connection.js');


module.exports = function (app) {

    var setSession = function (req, user) {
        req.session.username = user.username;
        req.session.encodedUsername = user.encodedUsername;
        req.session.githubUsername = user.githubUser.username;
        req.session.avatarUrl = user.githubUser._json.avatar_url;
    };

    var handleGithubCallback = function (req, res) {
        var githubUser = req.user.profile;
        req.session.githubAccessToken = req.user.accessToken;

        var isNewUser = function (user) {
            return !user;
        };
        var isUserRegisteredWithOneself = function (user) {
            return user && user.username;
        };
        var redirect = function (user, url) {
            res.redirect(CONTEXT_URI + url + "?username=" + user.username);
        };
        var insertGithubProfileInDb = function () {
            var options = {
                url: "https://api.github.com/user/emails?access_token=" + req.user.accessToken,
                headers: {
                    "User-Agent": "Quantified Dev Localhost"
                }
            };
            request(options, function (err, res, body) {
                if (!err) {
                    var userEmails = JSON.parse(body);
                    for (var i in userEmails) {
                        githubUser.emails.push(userEmails[i]);
                    }
                    var githubUserRecord = {
                        githubUser: githubUser,
                        registeredOn: new Date()
                    };
                    mongoDbConnection(function (qdDb) {
                        qdDb.collection('users').insert(githubUserRecord, function (err, insertedRecords) {
                            if (err) {
                                res.status(500).send("Database error");
                            } else {
                                req.session.githubUsername = githubUser.username;
                                req.session.avatarUrl = githubUser._json.avatar_url;
                                redirect(githubUser, "/claimUsername");
                            }
                        });
                    });
                } else {
                    res.status(500).send("Could not fetch email addresses for user.");
                }
            });
        };

        var creditUserSignUpToApp = function(){
            var attributeUserToApp = function(){
                // var updateObject = {
                //     "$push": {
                //         "users": {
                //             "githubUsername": githubUser.username
                //         }
                //     }
                // };


                var updateObject = {
                    "$push": {
                        "users": [githubUser.username]
                    }
                };

                mongoDbConnection(function (qdDb) {
                    qdDb.collection('registeredApps').update(byAppId, updateObject, function(){
                        console.log("New user " + githubUser.username + " assigned to: " + req.session.api_key);
                    });
                });
            };
            
            //main
            if("undefined" === typeof req.session.api_key){
                return;
            }

            var byAppId = {
                "appId": req.session.api_key
            };

            mongoDbConnection(function (qdDb) {
                qdDb.collection('registeredApps').findOne(byAppId, function (err, app) {
                    if(!err && app){
                        attributeUserToApp();
                    }
                });
            });
        }; //end creditUserSignUpToApp


        //main
        var byGitHubUsername = {
            "githubUser.username": githubUser.username
        };
        mongoDbConnection(function (qdDb) {
            qdDb.collection('users').findOne(byGitHubUsername, function (err, user) {
                if (isNewUser(user)) {
                    creditUserSignUpToApp();
                    insertGithubProfileInDb();
                } else if (isUserRegisteredWithOneself(user)) {
                    setSession(req, user);
                    if (req.session.redirectUrl) {
                        var redirectUrl = req.session.redirectUrl;
                        delete req.session.redirectUrl;
                        if(redirectUrl.match("/v1/streams")) {
                            var tokenisedUrl = redirectUrl.split("/");
                            tokenisedUrl[2] = "users";
                            tokenisedUrl[3] = req.session.username;
                            redirectUrl = tokenisedUrl.join("/");
                        }
                        res.cookie('_eun', req.session.encodedUsername);
                        res.redirect(redirectUrl);
                    } else {
                        redirect(user, "/dashboard");
                    }
                } else {
                    req.session.githubUsername = user.githubUser.username;
                    req.session.avatarUrl = user.githubUser._json.avatar_url;
                    redirect(githubUser, "/claimUsername");
                }
            });
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

    app.get('/auth/github', function(req, res, next){
        req.session.api_key = req.query.api_key;
        next();
    }, passport.authenticate('github', {
        scope: 'user:email'
    }));

    app.get('/auth/github/callback', passport.authenticate('github', {
        failureRedirect: CONTEXT_URI + '/signup'
    }), handleGithubCallback);
};
