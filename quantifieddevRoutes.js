var sessionManager = require("./sessionManagement");
var _ = require("underscore");
var Q = require('q');
var encoder = require("./encoder");
var githubEvents = require("./githubEvents");
var CONTEXT_URI = process.env.CONTEXT_URI;
var sendgrid = require('sendgrid')(process.env.SENDGRID_USERNAME, process.env.SENDGRID_PASSWORD);
var util = require("./util");

var mongoDbConnection = require('./lib/connection.js');

module.exports = function(app) {

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
                });
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
                });
            });
            return deferred.promise;
        };

        if (streamid && readToken) {
            var insertStreamForUser = function(user, streamid) {
                mongoDbConnection(function(qdDb) {
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
                });
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
            });
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
                                        res.redirect(CONTEXT_URI + redirectUrl);
                                    } else {
                                        res.redirect(CONTEXT_URI + '/dashboard');
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
    var addFriendTo = function(friendUsername, myUsername) {
        var deferred = Q.defer();
        var user = {
            "username": myUsername
        }
        var friend = {
            "friends": friendUsername
        }

        mongoDbConnection(function(qdDb) {
            qdDb.collection("users", function(err, collection) {
                collection.update(user, {
                    $addToSet: friend
                }, {
                    upsert: true
                }, function(error, data) {
                    if (error) {
                        console.log("DB error")
                        deferred.reject(error)
                    } else {
                        console.log("friend inserted successfully")
                        deferred.resolve();
                    }
                });
            });
        });
        return deferred.promise;
    }
    app.get("/compare", sessionManager.requiresSession, function(req, res) {
        var requesterUsername = req.session.requesterUsername;
        if (requesterUsername) {
            addFriendTo(requesterUsername, req.session.username)
            addFriendTo(req.session.username, requesterUsername)
        }
        res.render('compare', {
            username: req.session.username,
            avatarUrl: req.session.avatarUrl,
            friendsUsername: requesterUsername
        });
        delete req.session.requesterUsername;
    });

    var doesGitHubStreamIdExist = function(username) {
        var deferred = Q.defer();
        var usernameQuery = {
            "username": username
        };
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

        });
        return deferred.promise;
    };

    app.get("/connect_to_github", sessionManager.requiresSession, function(req, res) {

        var githubAccessToken = req.session.githubAccessToken;

        doesGitHubStreamIdExist(req.session.username).then(function(githubStreamId) {
            if (githubStreamId) {
                githubEvents.getGithubPushEvents(githubStreamId, githubAccessToken)
                    .then(function() {
                        res.send({
                            status: "ok"
                        })
                    });
            } else {
                util.createStream(function(err, stream) {
                    if (err) {
                        console.log(err);
                        res.status(500).send("Database error");
                    } else {
                        linkGithubStreamToUser(req.session.username, stream)
                            .then(function(streamid) {
                                return githubEvents.getGithubPushEvents(streamid, githubAccessToken);
                            })
                            .then(function() {
                                res.send({
                                    status: "ok"
                                })
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


    var createUserInvitesEntry = function(emailIds) {
        var deferred = Q.defer();
        var emailMap = {
            "from": emailIds[0],
            "to": emailIds[1]
        };
        mongoDbConnection(function(qdDb) {
            qdDb.collection("emailMap", function(err, collection) {
                collection.update(emailMap, {
                    $set: emailMap
                }, {
                    upsert: true
                }, function(error, data) {
                    if (error) {
                        console.log("DB error")
                        deferred.reject(error)
                    } else {
                        console.log("Mapping inserted successfully")
                        deferred.resolve(emailMap);
                    }
                });
            });
        });
        return deferred.promise;
    }
    var filterPrimaryEmailId = function(githubEmails) {
        emails = githubEmails.githubUser.emails;
        var primaryEmail;
        console.log("Email ids are : ", JSON.stringify(emails));
        var primaryEmailObject = _.find(emails, function(emailObj) {
            console.log("Email objs are: ", emailObj);
            return emailObj.primary === true
        });

        return primaryEmailObject.email;
    }
    var getEmailIdsForUsername = function(username) {
        //Try using mongo aggregation 
        var deferred = Q.defer();
        var query = {
            "username": username
        };
        mongoDbConnection(function(qdDb) {
            qdDb.collection('users').findOne(query, {
                "githubUser.emails": 1
            }, function(err, emails) {
                if (err) {
                    console.log("Error while querying")
                    deferred.reject(err);
                } else {
                    deferred.resolve(emails);
                }
            });
        });

        return deferred.promise;
    };


    var getEmailId = function(username) {
        console.log("2.Inside exctract myEmailID");
        var deferred = Q.defer();
        getEmailIdsForUsername(username)
            .then(function(emails) {
                console.log("2.1 Emails are: ", emails);
                var primaryEmail = filterPrimaryEmailId(emails);
                console.log("2.2 My emailID: ", primaryEmail);
                deferred.resolve(primaryEmail)
            })
            .catch(function(error) {
                console.log("DB error");
                deferred.reject("Error", error);
            });
        return deferred.promise;
    }
    var createEmailIdPromiseArray = function(myUsername, friendsUsername) {
        console.log("1.Inside extractEmailIds");
        var deferred = Q.defer();
        var promiseArray = []
        promiseArray.push(getEmailId(myUsername))
        promiseArray.push(getEmailId(friendsUsername))
        deferred.resolve(promiseArray);
        return deferred.promise;
    }

    app.get('/accept', function(req, res) {
        //store req.query.requsterUsername
        //take friend to compare page
        //add entry into friend's User collection   
        req.session.requesterUsername = req.query.reqUsername;
        res.redirect(CONTEXT_URI + '/compare');
    })
    app.get('/request_to_compare', function(req, res) {
        //1. extract user email id --done
        // 2. i) if friend's username--> extract friend's 
        //      email id from oneself username
        //    ii) else get friends email from req  
        // 3.save myEmail - friendEmail entry in db
        // 4. Send email

        var friendsUsername = req.query.friendsUsername;
        // var friendsEmailId = func
        // var myEmailId = func
        console.log("req.session.username : ", req.session.username)
        var acceptUrl = CONTEXT_URI + "/accept?reqUsername=" + req.session.username;
        createEmailIdPromiseArray(req.session.username, friendsUsername)
            .then(function(emailIds) {
                return Q.all(emailIds)
            })
            .then(createUserInvitesEntry)
            .then(function(userInviteMap) {
                console.log("email map is : ", userInviteMap);
                sendgrid.send({
                    to: userInviteMap.to,
                    from: "QD@quantifieddev.com",
                    subject: req.session.username + ' wants to compare with your data',
                    html: '<div>Hi I would like to compare my dev data with yours.<br><a href=' + acceptUrl + '>accept</a></div>'
                }, function(err, json) {
                    if (err) {
                        return console.error(err);
                    }
                    console.log(json);
                });
            })
            .catch(function(error) {
                res.status(404).send("stream not found");
            });
    });


}