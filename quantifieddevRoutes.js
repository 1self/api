var sessionManager = require("./sessionManagement");
var _ = require("underscore");
var Q = require('q');
var encryptUsername = function(username) {
    return crypto.createHash('sha256').update(username).digest('hex')
};
module.exports = function(app, express) {

    app.get("/signup", function(req, res) {
        res.render('signup');
    });

    app.get("/dashboard", sessionManager.requiresSession, function(req, res) {
        var streamid = req.query.streamId ? req.query.streamId : "";
        var readToken = req.query.readToken ? req.query.readToken : "";

        /* if url contains streamId and readToken {
         if username and streamid mapping does not exist {
         insert the mapping in db
         }
         fetch all associated streamids for username and render dashboard.
         }
         else if username and streamid mapping does not exist {
         Show overlay
         } else {
         fetch all associated streamids for username and render dashboard
         }
         */
        var streamExists = function(streamid, user) {
            return _.where(user.streams, {
                "streamid": streamid
            }).length > 0;
        };

        var getStreamsForUser = function() {
            var oneselfUsername = req.session.username;
            var streamidUsernameMapping = {
                "username": oneselfUsername
            };
            qdDb = app.getQdDb();
            var deferred = Q.defer();

            qdDb.collection('users').findOne(streamidUsernameMapping, {
                "streams": 1
            }, function(err, user) {
                if (err) {
                    deferred.reject(err);
                } else {
                    deferred.resolve(user);
                }
            });
            return deferred.promise;
        };

        if (streamid && readToken) {
            var insertStreamForUser = function(user, streamid) {
                qdDb = app.getQdDb();
                var deferred = Q.defer();
                var mappingToInsert = {
                    "$push": {
                        "streams": {
                            "streamid": streamid,
                            "readToken": readToken
                        }
                    }
                };
                qdDb.collection('users').update({
                    "username": req.session.username
                }, mappingToInsert, function(err, user) {
                    if (user) {
                        deferred.resolve();
                    } else {
                        deferred.reject(err);
                    }
                });
                return deferred.promise;
            };

            var decideWhatToDoWithStream = function(user) {
                var deferred = Q.defer();
                if (streamExists(streamid, user)) {
                    deferred.resolve();
                } else {
                    return insertStreamForUser(user, streamid);
                }
                return deferred.promise;
            };

            getStreamsForUser().then(decideWhatToDoWithStream).then(function() {
                res.render('dashboard', {
                    streamid: streamid,
                    readToken: readToken
                });
            });
        } else {
            getStreamsForUser().then(function(user) {
                if (user.streams) {
                    res.render('dashboard');
                } else {
                    res.render('dashboard', {
                        showOverlay: true
                    });
                }
            })
        }
    });

    app.get("/claimUsername", sessionManager.requiresSession, function (req, res) {
        res.render('claimUsername', {
            username: req.query.username,
            githubUsername: req.query.username
        });
    });

    app.post("/claimUsername", function(req, res) {
        var encryptedUsername = encryptUsername(req.body.username)
        var byOneselfUsername = req.body.username;
        var githubUsername = req.body.githubUsername;

        var byOneselfUsername = {
            "username": oneselfUsername
        };
        qdDb = app.getQdDb();
        qdDb.collection('users').findOne(byOneselfUsername, function(err, user) {
            if (user) {
                res.render('claimUsername', {
                    username: oneselfUsername,
                    githubUsername: githubUsername,
                    error: "Username already taken. Please choose another one."
                });
            } else {
                var byGithubUsername = {
                    "githubUser.username": githubUsername
                };
                qdDb.collection('users').update(byGithubUsername, {
                    $set: {
                        username: oneselfUsername,
                        encryptedUsername: encryptedUsername
                    }
                }, function(err, user) {
                    if (err) {
                        res.status(500).send("Database error");
                    } else {
                        req.session.username = oneselfUsername;
                        req.session.encryptedUsername = encryptedUsername;
                        if (req.session.redirectUrl) {
                            var redirectUrl = req.session.redirectUrl;
                            delete req.session.redirectUrl;
                            res.redirect(redirectUrl);
                        } else {
                            res.redirect('/dashboard?username=' + oneselfUsername);
                        }
                    }
                });
            }
        });
    });

    app.get("/compare", sessionManager.requiresSession, function(req, res) {
        res.render('compare');
    });

    var getFilterValuesFrom = function(req) {
        var lastHour = 60;
        var selectedLanguage = req.query.language ? req.query.language : "all";
        var selectedEvent = req.query.event ? req.query.event : "all";
        var selectedDuration = req.query.duration ? req.query.duration : lastHour;
        var filterValues = {
            globe: {
                lang: selectedLanguage,
                duration: selectedDuration,
                event: selectedEvent
            },
            country: {
                lang: selectedLanguage,
                duration: selectedDuration,
                event: selectedEvent
            }
        };
        return filterValues;
    };

    app.get("/community", function(req, res) {
        res.render('community', getFilterValuesFrom(req));
    });
}