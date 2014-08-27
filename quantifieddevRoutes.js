var sessionManager = require("./sessionManagement");
var _ = require("underscore");
var Q = require('q');
var encoder = require("./encoder");
var githubEvents = require("./githubEvents");
var CONTEXT_URI = process.env.CONTEXT_URI;
var sendgrid = require('sendgrid')(process.env.SENDGRID_USERNAME, process.env.SENDGRID_PASSWORD);
var util = require("./util");
var emailTemplates = require('swig-email-templates');
var path = require('path');
var QD_EMAIL = process.env.QD_EMAIL;

var mongoDbConnection = require('./lib/connection.js');

var emailConfigOptions = {
    root: path.join(__dirname, "/website/public/email_templates")
};

module.exports = function (app) {

    var getFilterValuesForCountry = function (req) {
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

    app.get("/signup", function (req, res) {
        res.render('signup');
    });

    app.get("/community/globe", function (req, res) {
        res.render('embeddableGlobe');
    });

    app.get("/dashboard", sessionManager.requiresSession, function (req, res) {
        var streamid = req.query.streamId ? req.query.streamId : "";
        var readToken = req.query.readToken ? req.query.readToken : "";

        var isStreamLinkedToUser = function (streamid, user) {
            return _.where(user.streams, {
                "streamid": streamid
            }).length > 0;
        };

        var streamExists = function (streamid) {
            var byStreamId = {
                "streamid": streamid
            };
            var deferred = Q.defer();

            mongoDbConnection(function (qdDb) {
                qdDb.collection('stream').findOne(byStreamId, function (err, stream) {
                    if (!err && stream) {
                        deferred.resolve();
                    } else {
                        console.log("streamId not found or error");
                        deferred.reject(err);
                    }
                });
            });
            ;
            return deferred.promise;
        };

        var getStreamsForUser = function () {
            var oneselfUsername = req.session.username;
            var streamidUsernameMapping = {
                "username": oneselfUsername.toLowerCase()
            };
            var deferred = Q.defer();

            mongoDbConnection(function (qdDb) {
                qdDb.collection('users').findOne(streamidUsernameMapping, {
                    "streams": 1
                }, function (err, user) {
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
            var insertStreamForUser = function (user, streamid) {
                mongoDbConnection(function (qdDb) {
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
                        "username": req.session.username.toLowerCase()
                    }, mappingToInsert, function (err, user) {
                        if (user) {
                            deferred.resolve();
                        } else {
                            deferred.reject(err);
                        }
                    });
                    return deferred.promise;
                });
            };

            var decideWhatToDoWithStream = function (user) {
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
                .then(function () {
                    res.render('dashboard', {
                        streamLinked: "yes",
                        username: req.session.username,
                        avatarUrl: req.session.avatarUrl
                    });
                }).catch(function (error) {
                    res.render('dashboard', {
                        streamLinked: "no",
                        username: req.session.username,
                        avatarUrl: req.session.avatarUrl
                    });
                });
        } else {
            getStreamsForUser().then(function (user) {
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

    app.get("/claimUsername", sessionManager.requiresSession, function (req, res) {
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

    var isUsernameValid = function (username) {
        return username.match("^[a-z0-9_]*$");
    };

    app.post("/claimUsername", function (req, res) {
        console.log("Req in claimUsername is : ", req.user);
        var oneselfUsername = (req.body.username).toLowerCase();
        if (isUsernameValid(oneselfUsername)) {
            encoder.encodeUsername(oneselfUsername, function (error, encUserObj) {

                var githubUsername = req.body.githubUsername;
                var byOneselfUsername = {
                    "username": oneselfUsername.toLowerCase()
                };
                mongoDbConnection(function (qdDb) {

                    qdDb.collection('users').findOne(byOneselfUsername, function (err, user) {
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
                            }, function (err, documentsUpdated) {
                                if (err) {
                                    res.status(500).send("Database error");

                                } else {
                                    req.session.username = oneselfUsername;
                                    req.session.encodedUsername = encUserObj.encodedUsername;
                                    req.session.githubUsername = githubUsername;
                                    console.log("User profile available in claimUsername : ", req.user.profile);
                                    req.session.githubAvatar = req.user.profile._json.avatar_url;

                                    if (req.session.redirectUrl) {
                                        var redirectUrl = req.session.redirectUrl;
                                        delete req.session.redirectUrl;
                                        res.redirect(redirectUrl);
                                    } else {
                                        res.redirect(CONTEXT_URI + '/dashboard');
                                    }
                                }
                            });
                        }
                    });
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

    var getUserId = function (username) {
        var deferred = Q.defer();
        var user = {
            "username": username
        };
        mongoDbConnection(function (qdDb) {
            qdDb.collection("users", function (err, collection) {
                collection.findOne(user, function (err, data) {
                    if (err) {
                        console.log("DB error", err);
                        deferred.reject(err);
                    } else {
                        console.log(data);
                        deferred.resolve(data["_id"]);
                    }
                });
            });
        });
        return deferred.promise;
    };

    var getUserIdFromEun = function (eun) {
        var deferred = Q.defer();
        var user = {
            "encodedUsername": eun
        };
        mongoDbConnection(function (qdDb) {
            qdDb.collection("users", function (err, collection) {
                collection.findOne(user, function (err, user) {
                    if (err) {
                        console.log("DB error", err);
                        deferred.reject(err);
                    } else {
                        console.log(user);
                        deferred.resolve(user["_id"]);
                    }
                });
            });
        });
        return deferred.promise;
    };


    var createFriendship = function (eun1, eun2) {
        var deferred = Q.defer();
        var promiseArray = [];

        promiseArray.push(getUserIdFromEun(eun1));
        promiseArray.push(getUserIdFromEun(eun2));

        Q.all(promiseArray).then(function (userIds) {
            var findUserByEun = {
                "encodedUsername": eun1
            };
            var friend = {
                "friends": userIds[1]
            };

            mongoDbConnection(function (qdDb) {
                qdDb.collection("users", function (err, collection) {
                    collection.update(findUserByEun, {
                        $addToSet: friend
                    }, {
                        upsert: true
                    }, function (error, data) {
                        if (error) {
                            console.log("DB error");
                            deferred.reject(error);
                        } else {
                            console.log("friend inserted successfully");
                            deferred.resolve();
                        }
                    });
                });
            });
        });
        return deferred.promise;
    };

    var getFriendUsername = function (userDbId) {
        var deferred = Q.defer();
        var query = {
            "_id": userDbId
        };
        mongoDbConnection(function (qdDb) {
            qdDb.collection('users').findOne(query, function (err, user) {
                if (err) {
                    console.log("DB error", err);
                    deferred.reject(err);
                } else {
                    deferred.resolve(user.username);
                }
            });
        });
        return deferred.promise;
    };

    var fetchFriendList = function (username) {
        var deferred = Q.defer();
        var query = {
            "username": username.toLowerCase()
        };
        mongoDbConnection(function (qdDb) {
            qdDb.collection('users').findOne(query, function (err, user) {
                if (err) {
                    console.log("DB Error : ", err);
                    deferred.reject(err);
                } else {
                    if (!(_.isEmpty(user.friends))) {
                        var promiseArray = [];
                        user.friends.forEach(function (friendId) {
                            promiseArray.push(getFriendUsername(friendId));
                        });
                        Q.all(promiseArray).then(function (friendUsernames) {
                            deferred.resolve(friendUsernames);
                        });
                    } else {
                        deferred.resolve(null);
                    }
                }
            });
        });
        return deferred.promise;
    };

    var getFullName = function (username) {
        var deferred = Q.defer();
        var query = {
            "username": username.toLowerCase()
        };
        mongoDbConnection(function (qdDb) {
            qdDb.collection('users').findOne(query, function (err, user) {
                if (err) {
                    console.log("DB Error : ", err);
                    deferred.reject(err);
                } else {
                    if (!(_.isEmpty(user.githubUser.displayName))) {
                        deferred.resolve(user.githubUser.displayName);
                    } else {
                        deferred.resolve(username);
                    }
                }
            });
        });
        return deferred.promise;
    };

    var getFullNameFromEun = function (eun) {
        var deferred = Q.defer();
        var query = {
            "encodedUsername": eun
        };
        mongoDbConnection(function (qdDb) {
            qdDb.collection('users').findOne(query, function (err, user) {
                if (err) {
                    console.log("err : ", err);
                    deferred.reject("DB error", err);
                } else {
                    if (!(_.isEmpty(user.githubUser.displayName))) {
                        deferred.resolve(user.githubUser.displayName);
                    } else {
                        deferred.resolve(user.username);
                    }
                }
            });
        });
        return deferred.promise;
    };

    var validateInviteToken = function (token) {
        var deferred = Q.defer();
        var query = {
            "token": token
        };
        mongoDbConnection(function (qdDb) {
            qdDb.collection('emailMap').findOne(query,
                function (err, data) {
                    if (err) {
                        console.log("Error", err);
                        deferred.reject(err);
                    } else {
                        if (_.isEmpty(data)) {
                            deferred.reject("token not found");
                        } else {
                            deferred.resolve(data);
                        }
                    }
                });
        });
        return deferred.promise;
    };

    var sendAcceptEmail = function (userInviteEntry, toUsername) {
        var deferred = Q.defer();

        var promiseArray = [];
        promiseArray.push(getFullNameFromEun(userInviteEntry.fromEun));
        promiseArray.push(getFullName(toUsername));

        Q.all(promiseArray).then(function (names) {
            var fromUserFullName = names[0];
            var toUserFullName = names[1];

            emailTemplates(emailConfigOptions, function (err, emailRender) {
                if (err) {
                    console.log("email template render error ", err);
                    deferred.reject(err);
                }
                var context = {
                    fromUserFullName: fromUserFullName,
                    toUserFullName: toUserFullName
                };
                emailRender('acceptCompareRequest.eml.html', context, function (err, html, text) {
                    sendgrid.send({
                        to: userInviteEntry.fromEmailId,
                        from: QD_EMAIL,
                        subject: toUserFullName + " accepted, it’s time to compare!",
                        html: html
                    }, function (err, json) {
                        if (err) {
                            console.error("can't send accept comparison request email ", err);
                            deferred.reject(err);
                        } else {
                            deferred.resolve();
                        }
                    });
                });
            });
        });
        return deferred.promise;
    };

    var sendRejectEmail = function (userInviteMap, requesteeUsername, requesterUsername) {
        var deferred = Q.defer();
        var promiseArray = [];
        promiseArray.push(getFullName(requesteeUsername));
        promiseArray.push(getFullName(requesterUsername));

        Q.all(promiseArray).then(function (names) {
            var requesteeFullname = names[0];
            var requesterFullname = names[1];

            emailTemplates(emailConfigOptions, function (err, emailRender) {
                var context = {
                    requesteeFullname: requesteeFullname,
                    requesterFullname: requesterFullname
                };
                emailRender('rejectCompareRequest.eml.html', context, function (err, html, text) {
                    sendgrid.send({
                        to: userInviteMap[1], //userInviteMap.to,
                        from: QD_EMAIL,
                        subject: requesteeFullname + " declined, try someone else",
                        html: html
                    }, function (err, json) {
                        if (err) {
                            console.error("can't send reject comparison request email ", err);
                            deferred.reject(err);
                        } else {
                            deferred.resolve();
                        }
                    });
                });
            });
        });
        return deferred.promise;
    };

    app.get("/compare", sessionManager.requiresSession, function (req, res) {
//        var compareWith = (_.isEmpty(req.query.compareWith)) ? req.session.token : req.query.compareWith;
//        var emailIdsMap;

        fetchFriendList(req.session.username)
            .then(function (friends) {
                getFullName(req.session.username)
                    .then(function (fullName) {
                        res.render('compare', {
                            username: req.session.username,
                            avatarUrl: req.session.avatarUrl,
                            friends: friends,
                            fullName: fullName
//                            compareWith: compareWith
                        });
                    }).catch(function (err) {
                        console.log("Error is ", err);
                        res.redirect("/");
                    });
            });
    });

    var doesGitHubStreamIdExist = function (username) {
        var deferred = Q.defer();
        var usernameQuery = {
            "username": username.toLowerCase()
        };
        mongoDbConnection(function (qdDb) {
            qdDb.collection('users').findOne(usernameQuery, function (err, user) {
                if (err) {
                    console.log("DB Error : ", err);
                    deferred.reject(err);
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
    };
    var linkGithubStreamToUser = function (username, stream) {
        var deferred = Q.defer();
        var query = {
            "username": username.toLowerCase()
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

        mongoDbConnection(function (qdDb) {
            qdDb.collection('users').update(query, updateQuery, {
                    upsert: true
                },
                function (err, user) {
                    if (err) {
                        console.log("Error", err);
                        deferred.reject(err);
                    } else {
                        deferred.resolve(stream.streamid);
                    }
                });

        });
        return deferred.promise;
    };

    app.get("/connect_to_github", sessionManager.requiresSession, function (req, res) {

        var githubAccessToken = req.session.githubAccessToken;

        doesGitHubStreamIdExist(req.session.username).then(function (githubStreamId) {
            if (githubStreamId) {
                githubEvents.getGithubPushEvents(githubStreamId, githubAccessToken)
                    .then(function () {
                        res.send({
                            status: "ok"
                        });
                    });
            } else {
                util.createStream(function (err, stream) {
                    if (err) {
                        console.log(err);
                        res.status(500).send("Database error");
                    } else {
                        linkGithubStreamToUser(req.session.username, stream)
                            .then(function (streamid) {
                                return githubEvents.getGithubPushEvents(streamid, githubAccessToken);
                            })
                            .then(function () {
                                res.send({
                                    status: "ok"
                                });
                            });
                    }
                });
            }
        });
    });

    var getFilterValuesFrom = function (req) {
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


    app.get("/community", function (req, res) {
        res.render('community', getFilterValuesForCountry(req));
    });

    var generateToken = function () {
        var deferred = Q.defer();
        require('crypto').randomBytes(48, function (ex, buf) {
            var token = buf.toString('hex');
            deferred.resolve(token);
        });
        return deferred.promise;
    };

    var insertUserInvitesInDb = function (userInviteEntry) {

        var createEntry = function (token) {
            var deferred = Q.defer();
            userInviteEntry.token = token;

            mongoDbConnection(function (qdDb) {
                qdDb.collection("emailMap", function (err, collection) {
                    collection.update(userInviteEntry, {
                        $set: userInviteEntry
                    }, {
                        upsert: true
                    }, function (error, data) {
                        if (error) {
                            console.log("DB error", error);
                            deferred.reject(error);
                        } else {
                            deferred.resolve(userInviteEntry);
                        }
                    });
                });
            });
            return deferred.promise;
        };

        return generateToken().then(createEntry);
    };

    var filterPrimaryEmailId = function (githubEmails) {
        emails = githubEmails.githubUser.emails;
        var primaryEmail;
        var primaryEmailObject = _.find(emails, function (emailObj) {
            return emailObj.primary === true;
        });

        return primaryEmailObject.email;
    };

    var getEmailIdsForUsername = function (username) {
        //Try using mongo aggregation 
        var deferred = Q.defer();
        var query = {
            "username": username.toLowerCase()
        };
        mongoDbConnection(function (qdDb) {
            qdDb.collection('users').findOne(query, {
                "githubUser.emails": 1
            }, function (err, emails) {
                if (err) {
                    console.log("Error while querying", err);
                    deferred.reject(err);
                } else {
                    deferred.resolve(emails);
                }
            });
        });

        return deferred.promise;
    };

    var getEmailId = function (username) {
        var deferred = Q.defer();
        getEmailIdsForUsername(username)
            .then(function (emails) {
                var primaryEmail = filterPrimaryEmailId(emails);
                deferred.resolve(primaryEmail);
            })
            .catch(function (error) {
                console.log("DB error in getting Email id ", error);
                deferred.reject(error);
            });
        return deferred.promise;
    };

    var createEmailIdPromiseArray = function (myUsername, friendsUsername) {
        console.log("1.Inside extractEmailIds");
        var deferred = Q.defer();
        var promiseArray = [];
        promiseArray.push(getEmailId(myUsername));
        promiseArray.push(getEmailId(friendsUsername));
        deferred.resolve(promiseArray);
        return deferred.promise;
    };

    var deleteUserInvitesEntryFor = function (userInviteEntry) {
        var deferred = Q.defer();
        var findInviteByToken = {
            "token": userInviteEntry.token
        };
        mongoDbConnection(function (qdDb) {
            qdDb.collection("emailMap", function (err, collection) {
                collection.remove(findInviteByToken, function (error, data) {
                    if (error) {
                        console.log("DB error ", error);
                        deferred.reject(error);
                    } else {
                        console.log("Email mapping deleted! for token ", userInviteEntry.token);
                        deferred.resolve(userInviteEntry);
                    }
                });
            });
        });
        return deferred.promise;
    };

    var associateFriendship = function (userInviteEntry, toEun) {
        var deferred = Q.defer();
        var promiseArray = [];
        var fromEun = userInviteEntry.fromEun;
        promiseArray.push(createFriendship(fromEun, toEun));
        promiseArray.push(createFriendship(toEun, fromEun));
        Q.all(promiseArray).then(function () {
            deferred.resolve(userInviteEntry);
        });
        return deferred.promise;
    };

    app.get('/accept', sessionManager.requiresSession, function (req, res) {
        var token = req.query.token;
        var toEun = req.session.encodedUsername;
        var toUsername = req.session.username;
        validateInviteToken(token)
            .then(function (userInviteEntry) {
                return associateFriendship(userInviteEntry, toEun);
            })
            .then(deleteUserInvitesEntryFor)
            .then(function (userInviteEntry) {
                return sendAcceptEmail(userInviteEntry, toUsername);
            })
            .then(function () {
                res.redirect(CONTEXT_URI + "/compare");
            })
            .catch(function (error) {
                console.log("error in accepting friendship request ", error);
                res.redirect(CONTEXT_URI + "/dashboard");
            });
    });

    app.get('/reject', sessionManager.requiresSession, function (req, res) {
        createEmailIdPromiseArray(req.session.username, req.query.reqUsername)
            .then(function (emailIds) {
                sendRejectEmail(emailIds, req.session.username, req.query.reqUsername);
                return Q.all(emailIds);
            })
            .then(deleteUserInvitesEntryFor);
        res.render('rejectMessage');
    });

    var sendInvitationEmail = function (userInviteEntry, fromUsername, fromUserFullName) {
        var deferred = Q.defer();

        var acceptUrl = CONTEXT_URI + "/accept?token=" + userInviteEntry.token;
        var rejectUrl = CONTEXT_URI + "/reject?token=" + userInviteEntry.token;

        emailTemplates(emailConfigOptions, function (err, emailRender) {
            var context = {
                acceptUrl: acceptUrl,
                rejectUrl: rejectUrl,
                fromUserFullName: fromUserFullName,
                fromEmailId: userInviteEntry.fromEmailId
            };
            emailRender('invite.eml.html', context, function (err, html, text) {
                sendgrid.send({
                    to: userInviteEntry.toEmailId,
                    from: QD_EMAIL,
                    subject: fromUserFullName + ' wants to share their data',
                    html: html
                }, function (err, json) {
                    if (err) {
                        console.error(err);
                        deferred.reject(err);
                    } else {
                        console.log("Compare request email successfully sent to ", userInviteEntry.toEmailId);
                        deferred.resolve();
                    }
                });
            });
        });
        return deferred.promise;
    };

    app.get('/request_to_compare_with_email', sessionManager.requiresSession, function (req, res) {
        var friendsEmail = req.query.friendsEmail;
        var fromUserFullName = req.query.myName;

        var userInvitesEntry = {
            "fromEun": req.session.encodedUsername,
            "toEmailId": friendsEmail
        };

        var fromUsername = req.session.username;
        getEmailId(fromUsername)
            .then(function (fromPrimaryEmail) {
                userInvitesEntry.fromEmailId = fromPrimaryEmail;
                return insertUserInvitesInDb(userInvitesEntry);
            })
            .then(function (userInviteEntry) {
                return sendInvitationEmail(userInviteEntry, fromUsername, fromUserFullName);
            })
            .then(function () {
                res.send(200, "success");
            })
            .catch(function (error) {
                res.status(404).send("stream not found");
            });
    });

};