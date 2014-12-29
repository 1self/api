var sessionManager = require("./sessionManagement");
var _ = require("underscore");
var Q = require('q');
var encoder = require("./encoder");
var CONTEXT_URI = process.env.CONTEXT_URI;
var sendgrid = require('sendgrid')(process.env.SENDGRID_USERNAME, process.env.SENDGRID_PASSWORD);
var util = require("./util");
var emailTemplates = require('swig-email-templates');
var path = require('path');
var QD_EMAIL = process.env.QD_EMAIL;
var ONESELF_EMAIL = process.env.ONESELF_EMAIL;
var ObjectID = require('mongodb').ObjectID;
var mongoDbConnection = require('./lib/connection.js');
var validateRequest = require("./validateRequest");
var moment = require("moment");
var validator = require('validator');

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
        if("sandbox" == process.env.NODE_ENV){
            res.status(404).send("*** This environment does not support this feature ***");
            return;
        }

        if (!(_.isEmpty(req.param('streamId')))){
            req.session.redirectUrl = "/dashboard" + "?streamId=" + req.param('streamId');
        }
        res.render('signup');
    });

    app.get("/community/globe", function (req, res) {
        res.render('embeddableGlobe');
    });

    var isStreamAlreadyLinkedToUser = function (streamid, user) {
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
                    deferred.resolve(true);
                } else {
                    deferred.resolve(false);
                }
            });
        });
        return deferred.promise;
    };

    var streamIdAndReadTokenExists = function (streamId, readToken) {
        console.log("streamIdAndReadTokenExists :: streamId is", streamId);
        console.log("streamIdAndReadTokenExists :: readToken is", readToken);
        // TODO Include readToken as part of mongo query object
        var byStreamId = {
            "streamid": streamId
        };
        var deferred = Q.defer();

        mongoDbConnection(function (qdDb) {
            qdDb.collection('stream').findOne(byStreamId, function (err, stream) {
                if (!err && stream) {
                    deferred.resolve(true);
                } else {
                    deferred.resolve(false);
                }
            });
        });
        return deferred.promise;
    };

    var getStreamsForUser = function (oneselfUsername) {
        var streamidUsernameMapping = {
            "username": oneselfUsername.toLowerCase()
        };
        var deferred = Q.defer();

        mongoDbConnection(function (qdDb) {
            qdDb.collection('users').findOne(streamidUsernameMapping, {
                "streams": 1,
                "username": 1
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

    var insertStreamForUser = function (user, streamid) {
        var deferred = Q.defer();
        mongoDbConnection(function (qdDb) {
            var mappingToInsert = {
                "$push": {
                    "streams": {
                        "streamid": streamid
                    }
                }
            };
            qdDb.collection('users').update({
                "username": user.username.toLowerCase()
            }, mappingToInsert, function (err, user) {
                if (user) {
                    deferred.resolve(true);
                } else {
                    deferred.reject(err);
                }
            });
        });
        return deferred.promise;
    };

    var linkStreamToUser = function (user, streamId) {
        var deferred = Q.defer();
        if (isStreamAlreadyLinkedToUser(streamId, user)) {
            deferred.resolve(false);
        } else {
            return insertStreamForUser(user, streamId);
        }
        return deferred.promise;
    };

    app.get("/dashboard", sessionManager.requiresSession, function (req, res) {
        var streamId = req.query.streamId ? req.query.streamId : "";

        if (streamId) {
            streamExists(streamId)
                .then(function (exists) {
                    if (exists) {
                        getStreamsForUser(req.session.username).then(function (user) {
                            return linkStreamToUser(user, streamId);
                        })
                            .then(function (isStreamLinked) {
                                res.render('dashboard', {
                                    streamLinked: (isStreamLinked ? "yes" : ""),
                                    username: req.session.username,
                                    avatarUrl: req.session.avatarUrl
                                });
                            });
                    } else {
                        console.log("error during linking stream to user ");
                        res.render('dashboard', {
                            streamLinked: "no",
                            username: req.session.username,
                            avatarUrl: req.session.avatarUrl
                        });

                    }
                });

        } else {
            getStreamsForUser(req.session.username).then(function (user) {
                if (user.streams && req.query.link_data !== "true") {
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
        if (req.query.username && _.isEmpty(req.session.username)) {
            res.render('claimUsername', {
                username: req.query.username
            });
        } else {
            res.redirect(CONTEXT_URI + "/dashboard");
        }
    });

    app.post("/claimUsername", function (req, res) {
        console.log("Req in claimUsername is : ", req.user);
        var isUsernameValid = function (username) {
            return username.match("^[a-z0-9_]*$");
        };
        var isExistingQDUser = !(_.isEmpty(req.session.username));
        if (isExistingQDUser) {
            res.redirect(CONTEXT_URI + "/dashboard");
        }
        var oneselfUsername = (req.body.username).toLowerCase();

        var updateUserRecord = function (encUserObj) {
            var deferred = Q.defer();
            var githubUsername = req.session.githubUsername;
            mongoDbConnection(function (qdDb) {
                var byGithubUsername = {
                    "githubUser.username": githubUsername
                };
                qdDb.collection('users').update(byGithubUsername, {
                    $set: {
                        username: oneselfUsername,
                        encodedUsername: encUserObj.encodedUsername,
                        salt: encUserObj.salt
                    }
                }, function (err) {
                    if (err) {
                        deferred.reject(err);
                    } else {
                        deferred.resolve(encUserObj);
                    }
                });
            });
            return deferred.promise;
        };

        var setSessionAndRedirectToDashboard = function (encUserObj) {
            req.session.username = oneselfUsername;
            req.session.encodedUsername = encUserObj.encodedUsername;
            console.log("User profile available in claimUsername : ", req.user.profile);
            req.session.githubAvatar = req.user.profile._json.avatar_url;
            if (req.session.redirectUrl) {
                var redirectUrl = req.session.redirectUrl;
                delete req.session.redirectUrl;
                if (redirectUrl.match("/v1/streams")) {
                    var tokenizedUrl = redirectUrl.split("/");
                    tokenizedUrl[2] = "users";
                    tokenizedUrl[3] = req.session.username;
                    redirectUrl = tokenizedUrl.join("/");
                }
                res.cookie('_eun', req.session.encodedUsername);
                res.redirect(redirectUrl);
            } else {
                res.redirect(CONTEXT_URI + '/dashboard');
            }
        };

        var isUsernameAvailable = function (oneselfUsername) {
            var deferred = Q.defer();
            if (!isUsernameValid(oneselfUsername)) {
                deferred.reject("Username invalid. Username can contain only letters, numbers and _")
            }
            var byOneselfUsername = {
                "username": oneselfUsername.toLowerCase()
            };
            mongoDbConnection(function (qdDb) {
                qdDb.collection('users').findOne(byOneselfUsername, function (err, user) {
                    if (user) {
                        deferred.reject("Username already taken. Please choose another one.");
                    }
                    else {
                        deferred.resolve();
                    }
                });
            });
            return deferred.promise;
        };

        var redirectToClaimUsernameWithError = function (error) {
            res.render('claimUsername', {
                username: req.body.username,
                githubUsername: req.session.githubUsername,
                error: error
            });
        };

        isUsernameAvailable(oneselfUsername)
            .then(function () {
                return encoder.encodeUsername(oneselfUsername)
            }, redirectToClaimUsernameWithError)
            .then(updateUserRecord)
            .then(setSessionAndRedirectToDashboard)
            .catch(function (err) {
                console.error("error during claim username", err);
            });
    });

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
                        deferred.resolve(user["_id"]);
                    }
                });
            });
        });
        return deferred.promise;
    };

    var createFriendship = function (userId1, userId2) {
        var deferred = Q.defer();

        var findUserByEun = {
            "_id": ObjectID(userId1)
        };
        var friend = {
            "friends": ObjectID(userId2)
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
                } else if (_.isEmpty(user) || _.isEmpty(user.friends)) {
                    deferred.resolve(null);
                } else {
                    var promiseArray = [];
                    user.friends.forEach(function (friendId) {
                        promiseArray.push(getFriendUsername(friendId));
                    });
                    Q.all(promiseArray).then(function (friendUsernames) {
                        var sortedAlphabetically = _.sortBy(friendUsernames, function (name) {
                            return name;
                        });
                        deferred.resolve(sortedAlphabetically);
                    });
                }
            });
        });
        return deferred.promise;
    };

    var getFullNameByUsername = function (username) {
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

    var getFullNameByEun = function (eun) {
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

    var getUsernameByEun = function (eun) {
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
                    if (!(_.isEmpty(user))) {
                        deferred.resolve(user.username);
                    } else {
                        deferred.resolve(null);
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
                function (err, userInviteEntry) {
                    if (err) {
                        console.log("Error", err);
                        deferred.reject(err);
                    } else {
                        if (_.isEmpty(userInviteEntry)) {
                            deferred.reject("token not found");
                        } else {
                            deferred.resolve(userInviteEntry);
                        }
                    }
                });
        });
        return deferred.promise;
    };

    var sendAcceptEmail = function (userInviteEntry, toUsername) {
        var deferred = Q.defer();

        var promiseArray = [];
        promiseArray.push(getFullNameByEun(userInviteEntry.fromEun));
        promiseArray.push(getFullNameByUsername(toUsername));
        promiseArray.push(getUsernameByEun(userInviteEntry.fromEun));
        promiseArray.push(toUsername);

        Q.all(promiseArray).then(function (names) {
            var fromUserFullName = names[0];
            var toUserFullName = names[1];
            var fromUsername = names[2];
            var toUsername = names[3];

            emailTemplates(emailConfigOptions, function (err, emailRender) {
                if (err) {
                    console.log("email template render error ", err);
                    deferred.reject(err);
                }
                var context = {
                    fromUserFullName: fromUserFullName,
                    toUserFullName: toUserFullName,
                    toUsername: toUsername
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
                            deferred.resolve(fromUsername);
                        }
                    });
                });
            });
        });
        return deferred.promise;
    };

    app.get("/compare", sessionManager.requiresSession, function (req, res) {
        var compareWith = req.query.compareWith;

        fetchFriendList(req.session.username)
            .then(function (friends) {
                getFullNameByUsername(req.session.username)
                    .then(function (fullName) {
                        res.render('compare', {
                            username: req.session.username,
                            avatarUrl: req.session.avatarUrl,
                            friends: friends,
                            fullName: fullName,
                            compareWith: compareWith
                        });
                    }).catch(function (err) {
                        console.log("Error is ", err);
                        res.redirect("/");
                    });
            });
    });

    app.get("/community", function (req, res) {
        res.render('community', getFilterValuesForCountry(req));
    });

    var generateToken = function () {
        var deferred = Q.defer();
        require('crypto').randomBytes(32, function (ex, buf) {
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

    var getPrimaryEmailId = function (username) {
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

    var deleteUserInvitesEntry = function (userInviteEntry) {
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

        promiseArray.push(getUserIdFromEun(fromEun));
        promiseArray.push(getUserIdFromEun(toEun));

        Q.all(promiseArray).then(function (userIds) {
            var friendshipPromises = [];
            var fromUserId = userIds[0];
            var toUserId = userIds[1];

            friendshipPromises.push(createFriendship(fromUserId, toUserId));
            friendshipPromises.push(createFriendship(toUserId, fromUserId));

            Q.all(friendshipPromises).then(function () {
                deferred.resolve(userInviteEntry);
            });
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
            .then(deleteUserInvitesEntry)
            .then(function (userInviteEntry) {
                return sendAcceptEmail(userInviteEntry, toUsername);
            })
            .then(function (fromUsername) {
                res.redirect(CONTEXT_URI + "/compare?compareWith=" + fromUsername);
            })
            .catch(function (error) {
                console.log("error in accepting friendship request ", error);
                res.redirect(CONTEXT_URI + "/dashboard");
            });
    });

    var sendRejectEmail = function (userInviteEntry) {
        var deferred = Q.defer();

        var _sendEmail = function (fromUserFullName) {
            emailTemplates(emailConfigOptions, function (err, emailRender) {
                var toEmailId = userInviteEntry.toEmailId;
                var context = {
                    fromUserFullName: fromUserFullName,
                    toUserEmailId: toEmailId
                };
                emailRender('rejectCompareRequest.eml.html', context, function (err, html, text) {
                    sendgrid.send({
                        to: userInviteEntry.fromEmailId,
                        from: QD_EMAIL,
                        subject: toEmailId + " declined, try someone else",
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
        };

        getFullNameByEun(userInviteEntry.fromEun)
            .then(_sendEmail);

        return deferred.promise;
    };

    app.get('/reject', function (req, res) {
        var token = req.query.token;

        validateInviteToken(token)
            .then(deleteUserInvitesEntry)
            .then(sendRejectEmail)
            .then(function () {
                res.render('rejectMessage');
            }).catch(function (err) {
                console.error("error while rejecting comparison request ", err);
                res.send(400);
            });
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
        getPrimaryEmailId(fromUsername)
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
                res.status(400).send("Email service unavailable");
            });
    });

    app.get('/v1/graph/share', function (req, res) {
        var graphUrl = req.query.graphUrl;

        getAlreadySharedGraphObject(graphUrl)
            .then(function (graphShareObject) {
                if (graphShareObject) {
                    var graphShareUrl = graphShareObject.graphUrl + "?shareToken=" + graphShareObject.shareToken;
                    res.send({graphShareUrl: graphShareUrl});
                } else {
                    generateToken()
                        .then(function (token) {
                            var graphShareObject = {
                                shareToken: token,
                                graphUrl: graphUrl
                            };
                            return insertGraphShareEntryInDb(graphShareObject)
                                .then(function () {
                                    var graphShareUrl = graphShareObject.graphUrl + "?shareToken=" + graphShareObject.shareToken;
                                    res.send({graphShareUrl: graphShareUrl});
                                });
                        });
                }
            });
    });

    app.post('/v1/share_graph', sessionManager.requiresSession, function (req, res) {
        var toEmailId = req.body.toEmailId;
        var graphShareUrl = req.body.graphShareUrl;
        var fromUsername = req.session.username;

        if(!validator.isEmail(toEmailId)){
            res.send(500, {"message": "EmailId not valid"});
            return;
        }

        var sendEmail = function (graphShareUrl) {
            return getPrimaryEmailId(fromUsername)
                .then(function (fromEmailId) {
                    return sendGraphShareEmail(graphShareUrl, fromEmailId, toEmailId)
                        .then(function () {
                            res.send(200, {"message": "Graph url shared successfully."});
                        });
                });
        };
        sendEmail(graphShareUrl);
    });

    app.post('/v1/app', function (req, res) {
        var appEmail = req.param('appEmail');

        if (appEmail === undefined) {
            res.send(401, "Unauthorized request. Please pass valid app_email");
        }

        var appDetails = {
            appEmail: appEmail,
            createdOn: moment.utc().toDate()
        };

        util.registerApp(appDetails, function (err, data) {
            if (err) {
                res.status(500).send("Database error");
            } else {
                sendAppDetailsByEmail(data.appId, data.appSecret, data.appEmail)
                    .then(function(){
                        res.send("We have sent email containing your api key to '" + appEmail + "'. Thank You.");
                    });
            }
        });
    });


    var sendAppDetailsByEmail = function (appId, appSecret, toEmailId) {
        var deferred = Q.defer();

        emailTemplates(emailConfigOptions, function (err, emailRender) {
            var context = {
                appId: appId,
                appSecret: appSecret
            };
            emailRender('appDetails.eml.html', context, function (err, html, text) {
                sendgrid.send({
                    to: toEmailId,
                    from: ONESELF_EMAIL,
                    subject: '[1self] Developer Application Details',
                    html: html
                }, function (err, json) {
                    if (err) {
                        console.error(err);
                        deferred.reject(err);
                    } else {
                        console.log("New Developer App Details sent successfully to ", toEmailId);
                        deferred.resolve();
                    }
                });
            });
        });
        return deferred.promise;
    };

    var getAlreadySharedGraphObject = function (graphUrl) {
        var deferred = Q.defer();
        var byGraphUrl = {
            "graphUrl": graphUrl
        };
        mongoDbConnection(function (qdDb) {
            qdDb.collection('graphShares').findOne(byGraphUrl, function (err, graphShareObject) {
                if (!err && graphShareObject) {
                    deferred.resolve(graphShareObject);
                } else if (!err && !graphShareObject) {
                    deferred.resolve(null);
                } else {
                    deferred.reject(err);
                }
            });
        });
        return deferred.promise;
    };

    var insertGraphShareEntryInDb = function (graphShareObject) {
        var deferred = Q.defer();
        mongoDbConnection(function (qdDb) {
            qdDb.collection("graphShares", function (err, collection) {
                collection.insert(graphShareObject, function (error, data) {
                    if (error) {
                        console.log("DB error", error);
                        deferred.reject(error);
                    } else {
                        deferred.resolve(graphShareObject);
                    }
                });
            });
        });
        return deferred.promise;
    };

    var sendGraphShareEmail = function (graphShareUrl, fromEmailId, toEmailId) {

        var deferred = Q.defer();
        var graphUrl = graphShareUrl;

        emailTemplates(emailConfigOptions, function (err, emailRender) {
            var context = {
                graphUrl: graphUrl,
                fromEmailId: fromEmailId
            };
            emailRender('graphShare.eml.html', context, function (err, html, text) {
                sendgrid.send({
                    to: toEmailId,
                    from: ONESELF_EMAIL,
                    subject: fromEmailId + ' wants to share 1self activity',
                    html: html
                }, function (err, json) {
                    if (err) {
                        console.error(err);
                        deferred.reject(err);
                    } else {
                        console.log("Graph share email successfully sent to ", toEmailId);
                        deferred.resolve();
                    }
                });
            });
        });
        return deferred.promise;
    };

    var getGraphInfo = function (objectTags, actionTags, url, username) {
        var title = "time spent ";
        var measurement = "";
        objectTags = objectTags.split(",");
        actionTags = actionTags.split(",");
        if (objectTags.indexOf("ambient") !== -1 
            && actionTags.indexOf("sample") !== -1) { // noise app
            title = "average noise experienced";
            measurement = "decibels";
        } else if (actionTags.indexOf("meditate") !== -1) { // timer app events
            title += "meditating";
            measurement = "time";
        } else if (actionTags.indexOf("exercise") !== -1) {
            title += "exercising";
            measurement = "time";
        } else if (actionTags.indexOf("commute") !== -1) {
            title += "commuting";
            measurement = "time";
        } else if (actionTags.indexOf("cook") !== -1) {
            title += "cooking";
            measurement = "time";
        } else if (actionTags.indexOf("party") !== -1) {
            title += "partying";
            measurement = "time";
        } else if (objectTags.indexOf("instrument") !== -1
                    && actionTags.indexOf("play") !== -1) {
            title += "playing instrument";
            measurement = "time";
        } else if (objectTags.indexOf("computer") !== -1
            && objectTags.indexOf("games") !== -1
            && actionTags.indexOf("play") !== -1) {
            title += "playing computer games";
            measurement = "time";

        } else if (actionTags.indexOf("read") !== -1) {
            title += "reading";
            measurement = "time";

        } else if (actionTags.indexOf("sit") !== -1) {
            title += "sitting";
            measurement = "time";

        } else if (actionTags.indexOf("stand") !== -1) {
            title += "standing";
            measurement = "time";
        } else if (actionTags.indexOf("study") !== -1) {
            title += "studying";
            measurement = "time";
        } else if (actionTags.indexOf("floss") !== -1) {
            title += "flossing"
            measurement = "time";
        } else if (actionTags.indexOf("watching") !== -1) {
            title += "watching";
            measurement = "time";
        } else if (actionTags.indexOf("work") !== -1) {
            title += "working";
            measurement = "time";
        } else if ( objectTags.indexOf("helloworld") !== -1
                    && actionTags.indexOf("write") !== -1) {
            title += "writing hello,world";
            measurement = "time";
        } else if (actionTags.indexOf("write") !== -1) {
            title += "writing";
            measurement = "time";
        } else if (actionTags.indexOf("meet") !== -1) {
            title += "meeting";
            measurement = "time";
        } else if (actionTags.indexOf("brush") !== -1) {
            title += "tooth brushing";
            measurement = "time";
        } else if (actionTags.indexOf("sleep") !== -1) {
            title += "sleeping";
            measurement = "time";

        } else if (actionTags.indexOf("code") !== -1) {
            title += "coding";
            measurement = "time";
        }
        return {
            title: title,
            measurement: measurement
        };
    };

    //v1/streams/{{streamId}}/events/{{ambient}}/{{sample}}/{{avg/count/sum}}/dba/daily/{{barchart/json}}
    app.get("/v1/streams/:streamId/events/:objectTags/:actionTags/:operation/:period/:renderType", validateRequest.validateStreamIdAndReadToken, function (req, res) {
        if (req.session.username) {
            var redirectUrl = "/v1/users/" + req.session.username + "/events/" +
                req.param("objectTags") + "/" + req.param("actionTags") + "/" +
                    req.param("operation") + "/" + req.param("period") + "/" + req.param("renderType") + "?streamId=" + req.param("streamId") + "&readToken=" + req.query.readToken;
            res.redirect(redirectUrl);
        } else {
            var queryString;
            if (Object.keys(req.query).length > 0){
                queryString = "&streamId=" + req.param('streamId');
            }
            else {
                queryString = "?streamId=" + req.param('streamId');
            }
            req.session.redirectUrl = req.originalUrl + queryString;

            var graphInfo = getGraphInfo(req.param("objectTags"), req.param("actionTags"), req.originalUrl);
            res.render('chart', {
                readToken: req.param("readToken"),
                isUserLoggedIn: false,
                title: graphInfo.title,
                measurement: graphInfo.measurement,
                streamId: req.param("streamId"),
                objectTags: req.param("objectTags"),
                actionTags: req.param("actionTags"),
                operation: req.param("operation"),
                period: req.param("period"),
                renderType: req.param("renderType")
            });
        }
    });

    var checkShareTokenAndGraphUrlExists = function (shareToken, graphUrl) {
        var deferred = Q.defer();

        var tokenGraphUrlQuery = {
            "graphUrl": graphUrl,
            "shareToken": shareToken
        };

        mongoDbConnection(function (qdDb) {
            qdDb.collection('graphShares').findOne(tokenGraphUrlQuery, function (err, entry) {
                if (!err && entry) {
                    deferred.resolve(true);
                } else {
                    console.log("Error is", err);
                    deferred.resolve(false);
                }
            });
        });
        return deferred.promise;
    };

    var validateShareToken = function (req, res, next) {
        var shareToken = req.query.shareToken;
        var graphUrl = "/v1/users/" + req.param("username") + "/events/" +
            req.param("objectTags") + "/" + req.param("actionTags") + "/" +
            req.param("operation") + "/" + req.param("period") + "/" + req.param("renderType");

        console.log("Graph Url is", graphUrl);

        checkShareTokenAndGraphUrlExists(shareToken, graphUrl).then(function (status) {
            if (status) {
                next();
            } else {
                sessionManager.requiresSession(req, res, next);
            }
        });
    };

    //v1/users/{{edsykes}}/events/{{ambient}}/{{sample}}/{{avg/count/sum}}/dba/daily/{{barchart/json}}
    app.get("/v1/users/:username/events/:objectTags/:actionTags/:operation/:period/:renderType",
        validateShareToken,function(req, res) {

            var getGraphOwnerAvatarUrl = function() {
                var deferred = Q.defer();
                var username = req.param("username");
                var userQueryObject = {
                    username: username
                };

                mongoDbConnection(function(qdDb) {
                    qdDb.collection("users", function(err, collection) {
                        collection.findOne(userQueryObject, function(error, user) {
                            if (error) {
                                console.error("DB error", error);
                                deferred.reject(error);
                            } else {

                                deferred.resolve(user.githubUser["_json"].avatar_url);
                            }
                        });
                    });
                });

                return deferred.promise;
            };

            req.session.redirectUrl = req.originalUrl;
            var streamId = req.query.streamId;
            var readToken = req.query.readToken;
            //        var shareToken = req.query.shareToken;
            var renderChart = function(graphOwnerAvatarUrl) {
                var graphInfo = getGraphInfo(req.param("objectTags"), req.param("actionTags"),req.originalUrl, req.param("username"));
                var isUserLoggedIn = (req.session.username !== undefined);
                res.render('chart', {
                    isUserLoggedIn: isUserLoggedIn,
                    title: graphInfo.title,
                    measurement: graphInfo.measurement,
                    graphOwner: req.param("username"),
                    username: req.param("username"),
                    graphOwnerAvatarUrl: graphOwnerAvatarUrl,
                    avatarUrl: req.session.avatarUrl,
                    objectTags: req.param("objectTags"),
                    actionTags: req.param("actionTags"),
                    operation: req.param("operation"),
                    period: req.param("period"),
                    shareToken: req.query.shareToken,
                    renderType: req.param("renderType")
                });
            };

            streamIdAndReadTokenExists(streamId, readToken)
                .then(function(exists) {
                    if (exists) {
                        getStreamsForUser(req.param('username'))
                            .then(function(user) {
                                return linkStreamToUser(user, streamId);
                            })
                            .then(getGraphOwnerAvatarUrl)
                            .then(renderChart)
                            .catch(function(error) {
                                console.error("error during linking stream to user ", error);
                                res.status(500).send("Internal server error.");
                            });
                    } else {
                        getGraphOwnerAvatarUrl().then(renderChart);
                    }
                });
        });
    

    app.get("/timeline", sessionManager.requiresSession, function (req, res) {
        res.render('timeline',{
            encodedUsername: req.session.encodedUsername,
            username: req.session.username,
            avatarUrl: req.session.avatarUrl
        });
    });

};
