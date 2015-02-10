var request = require("request");
var passport = require('passport');
var githubStrategy = require('passport-github').Strategy;
var q = require('q');
var GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
var GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
var CONTEXT_URI = process.env.CONTEXT_URI;
var mongoRepository = require('./mongoRepository.js');
var encoder = require("./encoder");


module.exports = function (app) {
    var setSession = function (req, user) {
        req.session.username = user.username;
        req.session.encodedUsername = user.encodedUsername;
        req.session.githubUsername = user.githubUser.username;
        req.session.avatarUrl = user.githubUser._json.avatar_url;

    };
    var fetchGithubUserEmails = function (accessToken) {
        var deferred = q.defer();
        var options = {
            url: "https://api.github.com/user/emails?access_token=" + accessToken,
            headers: {
                "User-Agent": "Quantified Dev Localhost"
            }
        };
        request(options, function (err, res, body) {
            if (!err) {
                deferred.resolve(JSON.parse(body));
            }
            else {
                deferred.reject(err);
            }
        });
        return deferred.promise;
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
            fetchGithubUserEmails(req.user.accessToken)
                .then(function (userEmails) {
                    for (var i in userEmails) {
                        githubUser.emails.push(userEmails[i]);
                    }
                    return {
                        githubUser: githubUser,
                        registeredOn: new Date()
                    };
                }, function (err) {
                    res.status(500).send("Could not fetch email addresses for user.");
                }).then(function (githubUserRecord) {
                    return mongoRepository.insert('users', githubUserRecord);
                }).then(function (docs) {
                    req.session.githubUsername = githubUser.username;
                    req.session.avatarUrl = githubUser._json.avatar_url;
                    redirect(githubUser, "/claimUsername");
                }, function (err) {
                    res.status(500).send("Database error");
                });
        };
        // TODO move it to separate place.
        var creditUserSignUpToApp = function () {
            var attributeUserToApp = function (appId) {
                var byAppId = {
                        "appId": appId
                    },
                    updateObject = {
                        "$push": {
                            "users": githubUser.username
                        }
                    };
                mongoRepository.update('registeredApps', byAppId, updateObject)
                    .then(function () {
                        console.log("New user " + githubUser.username + " assigned to: " + appId);
                    });
            };

            var mapUserAndAppUsingStream = function () {
                var redirectUrl = req.session.redirectUrl;
                if (redirectUrl.match("/v1/streams")) {
                    var tokenisedUrl = redirectUrl.split("/"),
                        byStreamId = {
                            "streamid": tokenisedUrl[3]
                        };
                    mongoRepository.findOne('stream', byStreamId)
                        .then(function (stream) {
                            attributeUserToApp(stream.appId);
                        }, function (err) {
                        });
                }
            };

            //main
            mapUserAndAppUsingStream();
        }; //end creditUserSignUpToApp
        var byGitHubUsername = {
            "githubUser.username": githubUser.username
        };
        mongoRepository.findOne('users', byGitHubUsername)
            .then(function (user) {
                if (isNewUser(user)) {
                    creditUserSignUpToApp();
                    insertGithubProfileInDb();
                } else if (isUserRegisteredWithOneself(user)) {
                    setSession(req, user);
                    if (req.session.redirectUrl) {
                        var redirectUrl = req.session.redirectUrl;
                        delete req.session.redirectUrl;
                        if (redirectUrl.match("/v1/streams")) {
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
    };

    var handleGithubCallbackWithIntent = function (req, res) {
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

        var doSignup = function () {

            var oneselfUsername = req.session.oneselfUsername;
            var isNewUser = function (user) {
                return !user;
            };

            var handleError = function (error) {
                console.log(error);
                res.send(400, "Invalid request");
            };

            var encodeUsername = function (oneselfUsername) {
                var deferred = q.defer();
                deferred.resolve(encoder.encodeUsername(oneselfUsername));
                return deferred.promise;
            };

            var signupComplete = function () {
                res.redirect("/signup_complete");
            };

            var checkIfNewUser = function (user) {
                var deferred = q.defer();
                if (isNewUser(user)) {
                    deferred.resolve(oneselfUsername);
                } else {
                    deferred.reject("User already exists")
                }
                return deferred.promise;
            }

            var createUser = function (encUserObj) {
                var deferred = q.defer();
                fetchGithubUserEmails(req.user.accessToken)
                    .then(function (userEmails) {
                        for (var i in userEmails) {
                            githubUser.emails.push(userEmails[i]);
                        }
                        return {
                            githubUser: githubUser,
                            registeredOn: new Date(),
                            username: oneselfUsername,
                            encodedUsername: encUserObj.encodedUsername,
                            salt: encUserObj.salt
                        };
                    }, function (err) {
                        console.log("Error occurred", err);
                        res.status(500).send("Could not fetch email addresses for user.");
                    }).then(function (githubUserRecord) {
                        mongoRepository.insert('users', githubUserRecord);
                        deferred.resolve();
                    })
                return deferred.promise;
            };

            findUser(byGitHubUsername)
                .then(checkIfNewUser)
                .then(encodeUsername)
                .then(createUser)
                .then(signupComplete)
                .catch(handleError);
        }

        var doLogin = function () {

            var setSessionData = function (user) {
                var deferred = q.defer();
                setSession(req, user)
                console.log("SEt session data correctly");
                deferred.resolve();
                return deferred.promise;
            }

            var loginComplete = function () {
                if (req.session.redirectUrl) {
                    var redirectUrl = req.session.redirectUrl;
                    delete req.session.redirectUrl;
                    if (redirectUrl.match("/v1/streams")) {
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
            }

            findUser(byGitHubUsername)
                .then(setSessionData)
                .then(function () {
                    loginComplete();
                }).catch(function (error) {
                    console.log("Error occurred", error);
                })
        }

        // TODO Move it to intent manager
        var intent = req.session.intent;
        if (intent === "website_signup") {
            console.log("Came in doSignup case", intent);
            doSignup();
        }
        else {
            console.log("Came in doLogin case", intent);
            doLogin();
        }
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
