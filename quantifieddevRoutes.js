var requestModule = require('request');
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
var validateRequest = require("./validateRequest");
var moment = require("moment");
var PasswordEncrypt = require('./lib/PasswordEncrypt');
var platformUri = process.env.PLATFORM_BASE_URI;

var sharedSecret = process.env.SHARED_SECRET;
var validator = require('validator');
var mongoRepository = require('./mongoRepository.js');

var emailConfigOptions = {
    root: path.join(__dirname, "/website/public/email_templates")
};

var encryptedPassword = PasswordEncrypt.encryptPassword(sharedSecret);

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
        if ("sandbox" == process.env.NODE_ENV) {
            res.status(404).send("*** This environment does not support this feature ***");
            return;
        }
        // Always redirect to dashboard when user hits /signup
        req.session.redirectUrl = "/dashboard";

        if (!(_.isEmpty(req.param('streamId')))) {
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
        mongoRepository.findOne('stream', byStreamId)
            .then(function (stream) {
                if (stream) {
                    deferred.resolve(true);
                } else {
                    deferred.resolve(false);
                }
            }, function (err) {
                deferred.reject(err);
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
        mongoRepository.findOne('stream', byStreamId)
            .then(function (stream) {
                if (stream) {
                    deferred.resolve(true);
                } else {
                    deferred.resolve(false);
                }
            }, function (err) {
                deferred.reject(err);
            });
        return deferred.promise;
    };

    var getStreamsForUser = function (oneselfUsername) {
        var streamidUsernameMapping = {
            "username": oneselfUsername.toLowerCase()
        };
        var projection = {
            "streams": 1,
            "username": 1
        };
        var deferred = Q.defer();
        mongoRepository.findOne('users', streamidUsernameMapping, projection)
            .then(function (user) {
                deferred.resolve(user);
            }, function (err) {
                deferred.reject(err);
            });
        return deferred.promise;
    };

    var insertStreamForUser = function (user, streamid) {
        var deferred = Q.defer();
        var updateObject = {
            "$push": {
                "streams": {
                    "streamid": streamid
                }
            }
        };
        var query = {
            "username": user.username.toLowerCase()
        };
        mongoRepository.update('users', query, updateObject)
            .then(function (user) {
                deferred.resolve(true);
            }, function (err) {
                deferred.reject(err);
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

            var byGithubUsername = {
                "githubUser.username": githubUsername
            };

            var updateObject = {
                $set: {
                    username: oneselfUsername,
                    encodedUsername: encUserObj.encodedUsername,
                    salt: encUserObj.salt
                }
            };
            mongoRepository.update('users', byGithubUsername, updateObject)
                .then(function () {
                    deferred.resolve(encUserObj);
                }, function (err) {
                    deferred.reject(err);
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
            mongoRepository.findOne('users', byOneselfUsername)
                .then(function (user) {
                    if (user) {
                        deferred.reject("Username already taken. Please choose another one.");
                    }
                    else {
                        deferred.resolve();
                    }
                }, function (err) {
                    deferred.reject(err);
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
                return encoder.encodeUsername(oneselfUsername);
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
        mongoRepository.findOne('users', user)
            .then(function (user) {
                deferred.resolve(user["_id"]);
            }, function (err) {
                deferred.reject(err);
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
        var updateObject = {
            $addToSet: friend
        };
        var options = {
            upsert: true
        };
        mongoRepository.update('users', findUserByEun, updateObject, options)
            .then(function () {
                deferred.resolve();
            }, function (err) {
                deferred.reject(err);
            });

        return deferred.promise;
    };

    var getFriendUsername = function (userDbId) {
        var deferred = Q.defer();
        var query = {
            "_id": userDbId
        };
        mongoRepository.findOne('users', query)
            .then(function (user) {
                deferred.resolve(user.username);
            }, function (err) {
                deferred.reject(err);
            });
        return deferred.promise;
    };

    var fetchFriendList = function (username) {
        var deferred = Q.defer();
        var query = {
            "username": username.toLowerCase()
        };
        mongoRepository.findOne('users', query)
            .then(function (user) {
                if (_.isEmpty(user) || _.isEmpty(user.friends)) {
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
            }, function (err) {
                deferred.reject(err);
            });
        return deferred.promise;
    };

    var getFullNameByUsername = function (username) {
        var deferred = Q.defer();
        var query = {
            "username": username.toLowerCase()
        };
        mongoRepository.findOne('users', query)
            .then(function (user) {
                if (!(_.isEmpty(user.githubUser.displayName))) {
                    deferred.resolve(user.githubUser.displayName);
                } else {
                    deferred.resolve(username);
                }
            }, function (err) {
                deferred.reject(err);
            });
        return deferred.promise;
    };

    var getFullNameByEun = function (eun) {
        var deferred = Q.defer();
        var query = {
            "encodedUsername": eun
        };
        mongoRepository.findOne('users', query)
            .then(function (user) {
                if (!(_.isEmpty(user.githubUser.displayName))) {
                    deferred.resolve(user.githubUser.displayName);
                } else {
                    deferred.resolve(user.username);
                }
            }, function (err) {
                deferred.reject(err);
            });
        return deferred.promise;
    };

    var getUsernameByEun = function (eun) {
        var deferred = Q.defer();
        var query = {
            "encodedUsername": eun
        };
        mongoRepository.findOne('users', query)
            .then(function (user) {
                if (!(_.isEmpty(user))) {
                    deferred.resolve(user.username);
                } else {
                    deferred.resolve(null);
                }
            }, function (err) {
                deferred.reject(err);
            });
        return deferred.promise;
    };

    var validateInviteToken = function (token) {
        var deferred = Q.defer();
        var query = {
            "token": token
        };
        mongoRepository.findOne('emailMap', query)
            .then(function (userInviteEntry) {
                if (_.isEmpty(userInviteEntry)) {
                    deferred.reject("token not found");
                } else {
                    deferred.resolve(userInviteEntry);
                }
            }, function (err) {
                deferred.reject(err);
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

    app.get("/set_dashboard_redirect", function (req, res) {
        req.session.redirectUrl = "/dashboard";
        res.send(200, "ok");
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
            var updateObject = {
                $set: userInviteEntry
            };
            var options = {
                upsert: true
            };
            mongoRepository.update('emailMap', userInviteEntry, updateObject, options)
                .then(function () {
                    deferred.resolve(userInviteEntry);
                }, function (err) {
                    deferred.reject(err);
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
        var deferred = Q.defer();
        var query = {
            "username": username.toLowerCase()
        };
        var projection = {
            "githubUser.emails": 1
        };
        mongoRepository.findOne('users', query, projection)
            .then(function (emails) {
                deferred.resolve(emails);
            }, function (err) {
                deferred.reject(err);
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
        var query = {
            "token": userInviteEntry.token
        };
        mongoRepository.remove('emailMap', query)
            .then(function () {
                deferred.resolve(userInviteEntry);
            }, function (err) {
                deferred.reject(err);
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
        var bgColor = req.query.bgColor;

        var genShareUrl = function (graphShareObject) {
            return graphShareObject.graphUrl + "?shareToken=" + graphShareObject.shareToken + "&bgColor=" + graphShareObject.bgColor;
        };

        getAlreadySharedGraphObject(graphUrl)
            .then(function (graphShareObject) {
                if (graphShareObject) {
                    var graphShareUrl = genShareUrl(graphShareObject);
                    res.send({graphShareUrl: graphShareUrl});
                } else {
                    generateToken()
                        .then(function (token) {
                            var graphShareObject = {
                                shareToken: token,
                                graphUrl: graphUrl,
                                bgColor: bgColor
                            };
                            return insertGraphShareEntryInDb(graphShareObject)
                                .then(function () {
                                    var graphShareUrl = genShareUrl(graphShareObject);
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

        if (!validator.isEmail(toEmailId)) {
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
            res.status(401).send("Unauthorized request. Please pass valid app_email");
        }
        util.registerApp(appEmail)
            .then(function (data) {
                return sendAppDetailsByEmail(data.appId, data.appSecret, data.appEmail)
            }, function (err) {
                res.status(500).send("Database error." + err)
            })
            .then(function () {
                res.send("We have sent email containing your api key to '" + appEmail + "'. Thank You.");
            });
    });

    app.get('/v1/sync/:username/:objectTags/:actionTags', function (req, res) {
        var username = req.param("username");
        var objectTags = req.param("objectTags");
        var actionTags = req.param("actionTags");

        var transformToStreamIds = function (result) {
            return _.map(result.streams, function (el) {
                return el.streamid;
            });
        };

        var getStreamsFromPlatform = function (streams) {
            var streamIds = transformToStreamIds(streams);

            var deferred = Q.defer();
            var filterSpec = {
                'payload.streamid': {
                    "$operator": {
                        "in": streamIds
                    }
                },
                'payload.objectTags': objectTags,
                'payload.actionTags': actionTags
            };
            var options = {
                url: platformUri + '/rest/events/findStreams',
                auth: {
                    user: "",
                    password: encryptedPassword
                },
                qs: {
                    'filterSpec': JSON.stringify(filterSpec)
                },
                method: 'GET'
            };
            var handleResponse = function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var result = JSON.parse(body);
                    console.log("streams from plaform : " + result.streams);
                    deferred.resolve(result.streams);
                } else {
                    deferred.reject(error);
                }
            };
            requestModule(options, handleResponse);
            return deferred.promise;
        };
        getStreamsForUser(username)
            .then(getStreamsFromPlatform)
            .then(getStreamsForStreamIds)
            .then(replaceTemplateVars)
            .then(hitCallbackUrls)
            .then(function () {
                res.send("ok");
            });
    });

    var replaceTemplateVars = function (streams) {
        var deferred = Q.defer();
        var callbackUrls = _.chain(streams).filter(function (stream) {
            return stream.callbackUrl !== undefined;
        }).map(function (stream) {
            var callbackUrl = stream.callbackUrl.replace("{{streamId}}", stream.streamid)
                .replace("{{latestEventSyncDate}}", stream.latestEventSyncDate.toISOString());
            return { callbackUrl: callbackUrl, writeToken: stream.writeToken};
        }).value();
        console.log("callback Urls : " + JSON.stringify(callbackUrls));
        deferred.resolve(callbackUrls);
        return deferred.promise;
    };

    var getStreamsForStreamIds = function (streamIds) {
        console.log("streamIds : ", streamIds);
        var query = {
            streamid: {$in: streamIds}
        };
        return mongoRepository.find('stream', query)
    };

    var request = function (url, writeToken) {
        var deferred = Q.defer();
        var options = {
            url: url,
            headers: {
                'Authorization': writeToken
            },
            method: 'GET'
        };

        requestModule(options, function (err, resp, body) {
            console.log("Response for request is ", body);
            deferred.resolve(resp);
        });
        return deferred.promise;
    };

    var hitCallbackUrls = function (urls) {
        var deferred = Q.defer();
        var requests = [];
        _.each(urls, function (url) {
            console.log("final callback url ", url);
            requests.push(request(url.callbackUrl, url.writeToken));
        });

        Q.all(requests).then(function () {
            deferred.resolve();
        }).catch(function (err) {
            console.log("Error occurred", err);
        });
        return deferred.promise;
    };

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
        var query = {
            "graphUrl": graphUrl
        };
        mongoRepository.findOne('graphShares', query)
            .then(function (graphShareObject) {
                if (graphShareObject) {
                    deferred.resolve(graphShareObject);
                } else {
                    deferred.resolve(null);
                }
            }, function (err) {
                deferred.reject(err);
            });
        return deferred.promise;
    };

    var insertGraphShareEntryInDb = function (graphShareObject) {
        var deferred = Q.defer();
        mongoRepository.insert('graphShares', graphShareObject)
            .then(function () {
                deferred.resolve(graphShareObject);
            }, function (err) {
                deferred.reject(err);
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

    var getGraphInfo = function (objectTags, actionTags) {
        var title = objectTags.replace(/,/g, ' ') + ' ' +
            actionTags.replace(/,/g, ' ');
        return {
            title: title
        };
    };

    //v1/streams/{{streamId}}/events/{{ambient}}/{{sample}}/{{avg/count/sum}}/dba/daily/{{barchart/json}}
    app.get("/v1/streams/:streamId/events/:objectTags/:actionTags/:operation/:period/:renderType", validateRequest.validateStreamIdAndReadToken, function (req, res) {
        if (req.session.username) {
            var bgColorQueryParam = "";
            if (req.param('bgColor')) {
                bgColorQueryParam = "&bgColor=" + req.param('bgColor');
            }
            var redirectUrl = "/v1/users/" + req.session.username + "/events/" +
                req.param("objectTags") + "/" + req.param("actionTags") + "/" +
                req.param("operation") + "/" + req.param("period") + "/" + req.param("renderType") + "?streamId=" + req.param("streamId")
                + "&readToken=" + req.query.readToken + bgColorQueryParam;
            res.redirect(redirectUrl);
        } else {
            var queryString;
            if (Object.keys(req.query).length > 0) {
                queryString = "&streamId=" + req.param('streamId');
            }
            else {
                queryString = "?streamId=" + req.param('streamId');
            }
            req.session.redirectUrl = req.originalUrl + queryString;

            var graphInfo = getGraphInfo(req.param("objectTags"), req.param("actionTags"), req.param("operation"));
            res.render('chart', {
                readToken: req.param("readToken"),
                isUserLoggedIn: false,
                title: graphInfo.title,
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
        mongoRepository.findOne('graphShares', tokenGraphUrlQuery)
            .then(function (entry) {
                if (entry) {
                    deferred.resolve(true);
                } else {
                    deferred.resolve(false);
                }
            }, function (err) {
                deferred.reject(err);
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
        validateShareToken, function (req, res) {

            var getGraphOwnerAvatarUrl = function () {
                var deferred = Q.defer();
                var username = req.param("username");
                var query = {
                    username: username
                };
                mongoRepository.findOne('users', query)
                    .then(function (user) {
                        deferred.resolve(user.githubUser["_json"].avatar_url);
                    }, function (err) {
                        deferred.reject(err);
                    });
                return deferred.promise;
            };

            req.session.redirectUrl = req.originalUrl;
            var streamId = req.query.streamId;
            var readToken = req.query.readToken;
            //        var shareToken = req.query.shareToken;
            var renderChart = function (graphOwnerAvatarUrl) {
                var graphInfo = getGraphInfo(req.param("objectTags"), req.param("actionTags"));
                var isUserLoggedIn = (req.session.username !== undefined);
                res.render('chart', {
                    isUserLoggedIn: isUserLoggedIn,
                    title: graphInfo.title,
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
                .then(function (exists) {
                    if (exists) {
                        getStreamsForUser(req.param('username'))
                            .then(function (user) {
                                return linkStreamToUser(user, streamId);
                            })
                            .then(getGraphOwnerAvatarUrl)
                            .then(renderChart)
                            .catch(function (error) {
                                console.error("error during linking stream to user ", error);
                                res.status(500).send("Internal server error.");
                            });
                    } else {
                        getGraphOwnerAvatarUrl().then(renderChart);
                    }
                });
        });


    app.get("/timeline", sessionManager.requiresSession, function (req, res) {
        res.render('timeline', {
            encodedUsername: req.session.encodedUsername,
            username: req.session.username,
            avatarUrl: req.session.avatarUrl
        });
    });
};
