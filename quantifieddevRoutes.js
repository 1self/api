var sessionManager = require("./sessionManagement");
var _ = require("underscore");
var Q = require('q');
var encoder = require("./encoder")
var githubEvents = require("./githubEvents");

module.exports = function(app, express) {

    app.get("/signup", function(req, res) {
        res.render('signup');
    });

    app.get("/dashboard", sessionManager.requiresSession, function(req, res) {
        var streamid = req.query.streamId ? req.query.streamId : "";
        var readToken = req.query.readToken ? req.query.readToken : "";

        var isStreamLinkedToUser = function(streamid, user) {
            return _.where(user.streams, {
                "streamid": streamid
            }).length > 0;
        };

        var streamExists = function(streamid) {
            var byStreamId = {
                "streamid": streamid
            };
            console.log("streamId to link : " + streamid);
            qdDb = app.getQdDb();
            var deferred = Q.defer();

            qdDb.collection('stream').findOne(byStreamId, function(err, stream) {
                if (!err && stream) {
                    console.log("streamId found + " + JSON.stringify(stream));
                    deferred.resolve();
                } else {
                    console.log("streamId not found or error");
                    deferred.reject(err);
                }
            });
            return deferred.promise;
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
                if (isStreamLinkedToUser(streamid, user)) {
                    deferred.resolve();
                } else {
                    return insertStreamForUser(user, streamid);
                }
                return deferred.promise;
            };

            streamExists(streamid)
                .then(getStreamsForUser)
                .then(decideWhatToDoWithStream)
                .then(function() {
                    res.render('dashboard', {
                        streamLinked: "yes",
                        username: req.session.username,
                        avatarUrl: req.session.avatarUrl
                    });
                }).catch(function(error) {
                    res.render('dashboard', {
                        streamLinked: "no",
                        username: req.session.username,
                        avatarUrl: req.session.avatarUrl                        
                    });
                });
        } else {

            console.log("avatarUrl : " + req.session.avatarUrl);

            getStreamsForUser().then(function(user) {
                if (user.streams) {
                    res.render('dashboard', {
                        username: req.session.username,
                        avatarUrl: req.session.avatarUrl
                    });
                } else {
                    res.render('dashboard', {
                        showOverlay: true,
                        username: req.session.username,
                        avatarUrl: req.session.avatarUrl                        
                    });
                }
            })
        }
    });

    app.get("/claimUsername", sessionManager.requiresSession, function(req, res) {
        if (req.query.username) {
            res.render('claimUsername', {
                username: req.query.username,
                githubUsername: req.query.username
            });
        } else {
            res.render('claimUsername', {
                username: req.session.username,
                githubUsername: req.session.githubUsername
            });
        }
    });

    var isUsernameValid = function(username) {
        return username.match("^[a-z0-9_]*$")
    };

    app.post("/claimUsername", function(req, res) {
        var oneselfUsername = (req.body.username).toLowerCase();
        if (isUsernameValid(oneselfUsername)) {
            encoder.encodeUsername(oneselfUsername, function(error, encUserObj) {

                var githubUsername = req.body.githubUsername;

                var byOneselfUsername = {
                    "username": oneselfUsername
                };
                qdDb = app.getQdDb();
                qdDb.collection('users').findOne(byOneselfUsername, function(err, user) {
                    if (user) {
                        res.render('claimUsername', {
                            username: req.body.username,
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
                                encodedUsername: encUserObj.encodedUsername,
                                salt: encUserObj.salt
                            }
                        }, function(err, documentsUpdated) {
                            if (err) {
                                res.status(500).send("Database error");

                            } else {
                                req.session.username = oneselfUsername;
                                req.session.encodedUsername = encUserObj.encodedUsername;
                                req.session.githubUsername = githubUsername;
                                req.session.githubAvatar = req.user.profile._json.avatar_url;    

                                if (req.session.redirectUrl) {
                                    var redirectUrl = req.session.redirectUrl;
                                    delete req.session.redirectUrl;
                                    res.redirect(redirectUrl);
                                } else {
                                    res.redirect('/dashboard');
                                }
                            }
                        });
                    }
                });
            });
        } else {
            res.render('claimUsername', {
                username: req.body.username,
                githubUsername: req.body.githubUsername,
                error: "Username invalid. Username can contain only letters, numbers and _"
            });
        }
    });

    app.get("/compare", sessionManager.requiresSession, function(req, res) {
        res.render('compare', {
            username: req.session.username,                   
            avatarUrl: req.session.avatarUrl
        });
    });


    app.get("/connect_to_github", function(req, res){
        githubEvents.fetchGitEvents(req.session.username).then(function(qdEvents){
            console.log(qdEvents);
            res.send(qdEvents);
        })
    });

    var getFilterValuesFrom = function(req) {
        var lastHour = 60;
        var selectedLanguage = req.query.language ? req.query.language : "all";
        var selectedEvent = req.query.event ? req.query.event : "all";
        var selectedDuration = req.query.duration ? req.query.duration : lastHour;
        var filterValues = {
            username: req.session.username,                   
            avatarUrl: req.session.avatarUrl,
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