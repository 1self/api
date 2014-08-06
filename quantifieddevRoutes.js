var sessionManager = require("./sessionManagement");
var _ = require("underscore");
var Q = require('q');
var encoder = require("./encoder");
var githubEvents = require("./githubEvents");

var util = require("./util");

var mongoDbConnection = require('./lib/connection.js');

module.exports = function(app, express) {

    var getFilterValuesForCountry = function(req) {
        var lastWeek = 60 * 24 * 7; // 60 minutes * 24 hours * 7 days 
        var selectedLanguage = req.query.language ? req.query.language : "all";
        var selectedEvent = req.query.event ? req.query.event : "all";
        var selectedDuration = req.query.duration ? req.query.duration : lastWeek;
        var filterValues = {
            username: req.session.username,
            avatarUrl: req.session.avatarUrl,
            country: {
                lang: selectedLanguage,
                duration: selectedDuration,
                event: selectedEvent
            }
        };
        return filterValues;
    };

    app.get("/signup", function(req, res) {
        res.render('signup');
    });

    app.get("/community/globe", function(req, res) {
        res.render('embeddableGlobe');
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
            var deferred = Q.defer();

            mongoDbConnection(function(qdDb) {
                qdDb.collection('stream').findOne(byStreamId, function(err, stream) {
                    if (!err && stream) {
                        deferred.resolve();
                    } else {
                        console.log("streamId not found or error");
                        deferred.reject(err);
                    }
                })
            });;
            return deferred.promise;
        };

        var getStreamsForUser = function() {
            var oneselfUsername = req.session.username;
            var streamidUsernameMapping = {
                "username": oneselfUsername
            };
            var deferred = Q.defer();

            mongoDbConnection(function(qdDb) {
                qdDb.collection('users').findOne(streamidUsernameMapping, {
                    "streams": 1
                }, function(err, user) {
                    if (err) {
                        deferred.reject(err);
                    } else {
                        deferred.resolve(user);
                    }
                })
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
                mongoDbConnection(function(qdDb) {

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
                })
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


    var doesGitHubStreamIdExist = function(username) {
        var deferred = Q.defer();
        usernameQuery = {
            "username": username
        }
        mongoDbConnection(function(qdDb) {
            qdDb.collection('users').findOne(usernameQuery, function(err, user) {
                if (err) {
                    console.log("err : ", err);
                    deferred.reject("DB error");
                } else {
                    if (user.githubUser.githubStreamId !== undefined) {
                        deferred.resolve(user.githubUser.githubStreamId);
                    } else {
                        deferred.resolve(false);
                    }

                }
            });
        });
        return deferred.promise;
    }
    var linkGithubStreamToUser = function(username, stream) {
        var deferred = Q.defer();
        var query = {
            "username": username
        };

        var updateQuery = {
            $set: {
                "githubUser.githubStreamId": stream.streamid
            },
            $push: {
                "streams": {
                    "streamid": stream.streamid,
                    "readToken": stream.readToken
                }
            }
        };

        mongoDbConnection(function(qdDb) {
            qdDb.collection('users').update(query, updateQuery, {
                    upsert: true
                },
                function(err, user) {
                    if (err) {
                        console.log("Error", err);
                        deferred.reject();
                    } else {
                        deferred.resolve(stream.streamid);
                    }
                });

        })
        return deferred.promise;
    }

    app.get("/connect_to_github", sessionManager.requiresSession, function(req, res) {

        var githubAccessToken = req.session.githubAccessToken;

        doesGitHubStreamIdExist(req.session.username).then(function(githubStreamId) {
            if (githubStreamId) {
                githubEvents.getGithubPushEvents(githubStreamId, githubAccessToken)
                    .then(function() {
                        res.redirect('dashboard');
                    });
            } else {
                util.createStream(function(err, stream) {
                    if (err) {
                        console.log(err);
                        res.status(500).send("Database error");
                    } else {
                        linkGithubStreamToUser(req.session.username, stream)
                            .then(function(streamid){
                                return githubEvents.getGithubPushEvents(streamid, githubAccessToken);
                            })
                            .then(function() {
                                res.redirect('dashboard');
                            });
                    }
                });
            }
        });

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
        res.render('community', getFilterValuesForCountry(req));
    });
}
