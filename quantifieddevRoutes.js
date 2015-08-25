/// <reference path="typings/node/node.d.ts"/>
/// <reference path="typings/q/Q.d.ts"/>
/// <reference path="typings/underscore/underscore.d.ts" />
/// <reference path="typings/express/express.d.ts" />

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
var eventRepository = require('./eventRepository.js');
var SignupModule = require('./modules/signupModule.js');
var imageCapture = require('./imageCapture.js');
var eventRepository = require('./eventRepository.js');

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
        //sessionManager.resetSession(req);
        if (req.session.username) {
            res.redirect("/timeline");
            return;
        }

        if ("sandbox" == process.env.NODE_ENV) {
            res.status(404).send("*** This environment does not support this feature ***");
            return;
        }

        SignupModule.startSignup(req.session);

        if (req.query.redirectUrl) {
            req.session.redirectUrl = req.query.redirectUrl;
        } else {
            req.session.redirectUrl = "/timeline";
        }
        if (!(_.isEmpty(req.param('streamId')))) {
            req.session.redirectUrl = "/dashboard" + "?streamId=" + req.param('streamId');
        }

        // Store the intent into session if intent is provided and redirect to signup
        if (!(_.isEmpty(req.query.intent))) {
            req.session.intent = {};
            req.session.intent.name = req.query.intent;
            req.session.intent.data = {
                url: req.query.redirectUrl
            };
        }

        if (!(_.isEmpty(req.query.username))) {
            req.session.oneselfUsername = req.query.username;
        }

        if (!(_.isEmpty(req.query.service)) && !(_.isEmpty(req.session.oneselfUsername))) {
            var signupUrl = "/signup/" + req.query.service;
            res.redirect(signupUrl);
        } else {
            res.render('signup');
        }
    });

    app.get("/login", function (req, res) {
        if (req.session.username) {
            var redirectUrl = "/timeline";
            if(!_.isEmpty(req.query.redirectUrl)) {
                redirectUrl = req.query.redirectUrl;
            }
            res.redirect(redirectUrl);
            return;
        }
        req.session.auth = 'login';
        var authExists = req.query.authExists;

        // Make sure to delete any oneselfUsername in session as it's used only while signup
        delete req.session.oneselfUsername;
        if (!(_.isEmpty(req.query.intent))) {
            req.session.intent = {};
            req.session.intent.name = req.query.intent;
            req.session.intent.data = {
                url: req.query.redirectUrl
            };
            console.log("INTENT DATA: ")
            console.log(req.session.intent.data);
        }

        res.render('login', {
            authExists: authExists
        });
    });

    app.post('/login', function (req, res) {

        req.session.service = req.body.service;

        if (req.body.service === "github") {
            res.redirect("/login/github");
        } else if (req.body.service === "facebook") {
            res.redirect("/login/facebook");
        }
    });

    app.get("/unknownLogin", function (req, res) {
        res.render('unknownLogin', {
            service: req.session.service

        });
    });

    app.get("/signupError", function (req, res) {
        res.render('signupError', {
            authService: SignupModule.getAuthService(req.session),
            authServiceUrl: SignupModule.getAuthServiceUrl(req.session)
        });
    });

    app.get("/signupErrorUserExists", function (req, res) {
        res.render('signupErrorUserExists', {
            authService: req.session.oneselfUsername,
            authServiceUrl: SignupModule.getAuthServiceUrl(req.session)
        });
    });

    app.post("/captureUsername", function (req, res) {
        req.session.oneselfUsername = req.body.username;
        if (req.body.service === "github") {
            res.redirect("/signup/github");
        } else if (req.body.service === "facebook") {
            res.redirect("/signup/facebook");
        } else res.status(404).send("unknown auth service");
    });

    app.get("/signup_complete", function (req, res) {
        var intent = req.session.intent;
        if (intent === "website_signup") {
            res.redirect("http://www.1self.co/confirmation.html");
        } else {
            res.redirect("comment_url");
        }
    });

    app.get("/community/globe", function (req, res) {
        res.render('embeddableGlobe');
    });

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

    app.get("/dashboard", sessionManager.requiresSession, function (req, res) {
        var streamId = req.query.streamId ? req.query.streamId : "";
        var readToken = req.query.readToken ? req.query.readToken : "";
        if (streamId && readToken) {
            util.streamExists(streamId, readToken)
                .then(function (exists) {
                    if (exists) {
                        getStreamsForUser(req.session.username)
                            .then(function (user) {
                                return util.linkStreamToUser(user, streamId);
                            })
                            .then(function (isStreamLinked) {
                                res.render('dashboard', {
                                    streamLinked: (isStreamLinked ? "yes" : ""),
                                    username: req.session.username,
                                    avatarUrl: req.session.avatarUrl
                                });
                            }).catch(function (err) {
                                console.log("Error is", err);
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

            getStreamsForUser(req.session.username)
                .then(function (user) {
                    if (user.streams && req.query.link_data !== "true") {
                        res.render('dashboard', {
                            username: req.session.username,
                            avatarUrl: req.session.avatarUrl
                        });
                    } else {
                        res.render('dashboard', {
                            username: req.session.username,
                            avatarUrl: req.session.avatarUrl
                        });
                    }
                }).catch(function (err) {
                    console.log("Error is", err);
                });
        }
    });
    
    var createCardStackIntent = function(req, res, next){
        req.session.redirectUrl = '/card-stack';
        req.session.intent = {
            name: 'card-stack',
            data: {
                url: '/card-stack'
            }
        }

        next();
    }

    var satisfyCardStackIntent = function(req, res, next){
        delete req.session.intent
        next();
    }

    var renderCardStack = function (req, res, next) {
        var model = {};

        if(req.params.username !== req.session.username
            && (req.session.username === 'ed' || req.session.username === 'm')
                ){
            model = {
                username: req.params.username,
                avatarUrl: null
            };
        }
        else{
            model = {
                username: req.session.username,
                avatarUrl: req.session.avatarUrl
            };
        }

        res.render('card-stack/index.html', model);
    };

    app.get("/card-stack", 
        createCardStackIntent,
        sessionManager.requiresSession, 
        satisfyCardStackIntent,
        renderCardStack
    );

    app.get("/card-stack/:username", 
        createCardStackIntent,
        sessionManager.requiresSession, 
        satisfyCardStackIntent,
        renderCardStack);
    

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
            req.session.githubAvatar = req.user.profile.avatarUrl;
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
                    } else {
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
        var emails = githubEmails.githubUser.emails;
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


    var genImageName = function(shareUrl) {
        return require('crypto').createHash('sha1').update(shareUrl).digest('hex');
    };
    
    var constructGraphShareObject = function(req) {
        var graphUrl = decodeURIComponent(req.query.graphUrl);
        var bgColor = req.query.bgColor;
        var fromDate = req.query.from;
        var toDate = req.query.to;
        
        var graphShareObject = {
                    graphUrl: graphUrl,
                    bgColor: bgColor,
                    fromDate: fromDate,
                    toDate: toDate
                };
        return graphShareObject;
    };
    
    var genShareUrl = function (graphShareObject) {
        var result = graphShareObject.graphUrl + "?";
        var params = [
            "shareToken=" + graphShareObject.shareToken,
            "bgColor=" + graphShareObject.bgColor,
            "from=" + graphShareObject.fromDate,
            "to=" + graphShareObject.toDate
        ]

        result += params.join("&");
        return result;
    };
    
    var graphShareController = function(req) {
        var deferred = Q.defer();
        
        var saveGraphObject = function (token) {
            graphShareObject.shareToken = token;
            return insertGraphShareEntryInDb(graphShareObject);
        };
        
        var handleGraphShare = function(result){
            console.log(result);
            if(result) {
                deferred.resolve(result);
            } else {
                generateToken()
                .then(saveGraphObject)
                .then(function (graphShareObject) {
                    deferred.resolve(graphShareObject);
                 })
                .catch(function(err){
                    console.log(err);
                    deferred.reject(err);
                });
            }
        };
        
        var graphShareObject = constructGraphShareObject(req);
        util.checkGraphAlreadyShared(graphShareObject)
        .then(handleGraphShare)
        .catch(function(err){
            console.log(err);
            deferred.reject(err);
        });
        return deferred.promise;
    };

    app.get('/v1/graph/share', function (req, res) {
        graphShareController(req)
        .then(function(graphShareObject){
            res.send({
                graphShareUrl: genShareUrl(graphShareObject)
            });
        })
        .catch(function(err){
            console.log(err);            
            res.status(500).send(err);
        });
    });
    
    app.get('/v1/graph/share/image', function(req, res){
        var sendError = function (err) {
            console.log(err);
            res.status(500).send({ error: 500 });
        };
            
        graphShareController(req)
        .then(function(graphShareObject){
            delete graphShareObject._id;
            
            var sendResponse = function() {
                res.send({
                    graphShareImageUrl: graphShareObject.graphUrl.replace('barchart', 'barchart.png') + '?shareToken=' + graphShareObject.shareToken
                });
            };
            
            var updateDatabase = function () {
                util.addSharedGraphImagePath(graphShareObject, imageName)
                .then(function (done) {
                    sendResponse();
                })
                .catch(sendError);
            };
            
            if(typeof graphShareObject.imageUrl !== 'undefined') {
                sendResponse();
            } else {
                var imageName = genImageName(graphShareObject.graphUrl) + '.png';
                imageCapture.saveChartImage(genShareUrl(graphShareObject)+"&hideButtons=true", 'images/' + imageName)
                .then(updateDatabase)
                .catch(sendError);
            }
        })
        .catch(sendError);
    });

    app.post('/v1/share_graph', sessionManager.requiresSession, function (req, res) {
        var toEmailId = req.body.toEmailId;
        var graphShareUrl = req.body.graphShareUrl;
        var fromUsername = req.session.username;

        if (!validator.isEmail(toEmailId)) {
            res.send(500, {
                "message": "EmailId not valid"
            });
            return;
        }

        var sendEmail = function (graphShareUrl) {
            return getPrimaryEmailId(fromUsername)
                .then(function (fromEmailId) {
                    return sendGraphShareEmail(graphShareUrl, fromEmailId, toEmailId)
                        .then(function () {
                            res.send(200, {
                                "message": "Graph url shared successfully."
                            });
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
                url: platformUri + '/events/findStreams',
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
        util.getStreamsForUser(username)
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
            return {
                callbackUrl: callbackUrl,
                writeToken: stream.writeToken
            };
        }).value();
        console.log("callback Urls : " + JSON.stringify(callbackUrls));
        deferred.resolve(callbackUrls);
        return deferred.promise;
    };

    var getStreamsForStreamIds = function (streamIds) {
        console.log("streamIds : ", streamIds);
        var query = {
            streamid: {
                $in: streamIds
            }
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

    var getGraphTitle = function (objectTags, actionTags) {
        return objectTags.split(",").reverse()[0] + " " + actionTags.split(",").reverse()[0];
    };

    var getDateRange = function (req) {
        var max = req.query.to || moment.utc().endOf('day').toISOString();
        var defaultMin = moment.utc(max).startOf('day').subtract('days', 6).toISOString();
        var min = req.query.from || defaultMin;
        return {
            'to': max,
            'from': min
        }
    };

    var lookupScopedReadToken = function(req, res, next){
        var query = {
            token: req.authToken
        };

        mongoRepository.findOne('streamscopedreadtoken', query)
        .then(function (token) {
            if (token === null) {
                res.status(401).send("Couldn't athenticate, the stream token is unknown.")
            }
            else{
                req.token = token;
                next();
            }
        }, function (err) {
            res.status(500).send("Server error while looking up token.")
        });
    };
    
    var validateScopedStreamToken = function(req, res, next){

        // token has [a,b,c], request has [a], intersection = [a], should allow
        // token has [a,b,c], request has [d], intersection = [], should disallow
        // token has [a,b,c], request has [a, d], interserction = [a], should disallow
        // token has [a,b,c], request has [d, e], intersection = [], should disallow
        // therefore, do an interection and make sure that the number of items is the same as the quest
        var splitObjectTags = req.params.objectTags.split(',');
        var objectTagsMatch = _.intersection(splitObjectTags, req.token.scope.objectTags).length === splitObjectTags.length;
        if(!objectTagsMatch){
            res.status(401).send('objectTags in the request are not permitted by the token');
            return;
        }

        var splitActionTags = req.params.actionTags.split(',');
        var actionTagsMatch = _.intersection(splitActionTags, req.token.scope.actionTags).length === splitActionTags.length;
        if(!actionTagsMatch){
            res.status(401).send('actionTags in the request are not permitted by the token');
            return;
        }

        var propertiesMatch = req.token.scope.properties[req.params.property] !== undefined;
        if(!propertiesMatch){
            res.status(401).send('propery in the request is not permitted by the token');
            return;
        }

        req.validatedToken = req.token;
        next();
    }

    var getEventData = function() { 
        var result = [];
        // for (var i = -16; i < 0; i++) {
        //  result.push({
        //      fromDate: new Date(moment().add("days", i).format("MM/DD/YYYY")),
        //      toDate: new Date(moment().add("days", i + 1).format("MM/DD/YYYY")),
                
        //      value: (100 + (Math.random()*100)),
        //      color: Math.random() > 0.5 ? "#FF5555" : (Math.random() > 0.5 ? "#33FF33": "#FFC72F")
        //  });
        // };
        
    }

    var renderStreamVisualization = function(req, res, next){
        if(req.params.representation === 'json'){
            var matchStreamId = {
                $match: {"payload.streamid":req.token.streamId}
            };

            var matchProperties = {
                $match: {
                    $or: []
                }
            };

            var projectProperties = {
                $project:
                {
                    "_id": 0
                }
            }

            for (var key in req.token.scope.properties) {
                var propertyFilter = {};
                var fullyQualifiedKey = 'payload.properties.' + key;
                propertyFilter[fullyQualifiedKey] = {
                    $ne: null
                };
                matchProperties.$match.$or.push(propertyFilter);
                projectProperties.$project[key] = '$' + fullyQualifiedKey;
            }

            var match = {};

            eventRepository.aggregate("oneself", [matchStreamId, matchProperties, projectProperties])
            .then(function(events){
                res.send(events);
            })
            .catch(function(error){
                res.status(500).send('database error');
            });
        }        
        else{

            var dataUri = ['/v1/streams/', 
                            req.params.streamId, 
                            '/events/', 
                            req.params.objectTags, '/', 
                            req.params.actionTags, '/', 
                            req.params.property, '/.json',
                            '?token=',
                            req.validatedToken.token].join('');
            var model = {
                dataUri: dataUri,
                series: req.params.property
            };

            res.render('barchart-ordinal', model);
        }
    }

    var parseTokenFromAuthorization = function (req, res, next) {
        var token = req.query.token;

        if (token === undefined) {
            var auth = req.headers.authorization;
            var auth = auth.split("Basic ");
            if (auth[0] === "") {
                token = auth[1];
            } else {
                token = auth[0];
            }
        }

        req.authToken = token;
        next();
    };

    //v1/streams/{{streamId}}/events/{{ambient}}/{{sample}}/{{avg/count/sum}}/dba/daily/{{barchart/json}}
    app.get("/v1/streams/:streamId/events/:objectTags/:actionTags/:property/.:representation", 
        parseTokenFromAuthorization,
        lookupScopedReadToken,
        validateScopedStreamToken,
        renderStreamVisualization
    );

    //v1/streams/{{streamId}}/events/{{ambient}}/{{sample}}/{{avg/count/sum}}/dba/daily/{{barchart/json}}
    app.get("/v1/streams/:streamId/events/:objectTags/:actionTags/:operation/:period/:renderType", validateRequest.validateStreamIdAndReadToken, function (req, res) {
        var dateRange = getDateRange(req);

        if (req.session.username) {
            var bgColorQueryParam = "";
            if (req.param('bgColor')) {
                bgColorQueryParam = "&bgColor=" + req.param('bgColor');
            }
            var redirectUrl = "/v1/users/" + req.session.username + "/events/" +
                req.param("objectTags") + "/" + req.param("actionTags") + "/" +
                req.param("operation") + "/" + req.param("period") + "/" + req.param("renderType") + "?streamId=" + req.param("streamId") + "&readToken=" + req.query.readToken + bgColorQueryParam + '&to=' + dateRange.to;
            +'&from=' + dateRange.from;
            res.redirect(redirectUrl);
        } else {
            var queryString;
            if (Object.keys(req.query).length > 0) {
                queryString = "&streamId=" + req.param('streamId');
            } else {
                queryString = "?streamId=" + req.param('streamId');
            }
            req.session.redirectUrl = req.originalUrl + queryString;

            var graphTitle = getGraphTitle(req.param("objectTags"), req.param("actionTags"));
            var hideShareButtons = !(_.isEmpty(req.query.hideButtons)) && req.query.hideButtons === 'true';

            res.render('chart', {
                readToken: req.param("readToken"),
                oneselfAppUrl: process.env.CONTEXT_URI,
                isUserLoggedIn: false,
                title: graphTitle,
                streamId: req.param("streamId"),
                objectTags: req.param("objectTags"),
                actionTags: req.param("actionTags"),
                operation: req.param("operation"),
                period: req.param("period"),
                renderType: req.param("renderType"),
                fromDate: dateRange.from,
                toDate: dateRange.to,
                hideButtons: hideShareButtons
            });
        }
    });

    var validateShareToken = function (req, res, next) {
        var shareToken = req.query.shareToken;
        var username = req.param("username");
        var graphUrl = "/v1/users/" + username + "/events/" +
            req.param("objectTags") + "/" + req.param("actionTags") + "/" +
            req.param("operation") + "/" + req.param("period") + "/" + req.param("renderType").split('.')[0];

        console.log("Graph Url is", graphUrl);

        util.validateShareTokenAndGraphUrl(shareToken, graphUrl).then(function () {
            console.log("Valid share token!");
            next();
        }).catch(function () {
            console.log("Invalid share token - checking signed in")
            if (req.session.username && req.session.username === username) {
                next();
                //sessionManager.requiresSession(req, res, next);
            } else {
                res.status(401).send("Sorry, you don't have permission to see this data");
            }
        });
    };

    var getGraphOwnerAvatarUrl = function (username) {
        var deferred = Q.defer();
        var query = {
            username: username
        };

        mongoRepository.findOne('users', query)
            .then(function (user) {
                deferred.resolve(user.profile.avatarUrl);
            }, function (err) {
                deferred.reject(err);
            });
        return deferred.promise;
    };

    //v1/users/{{edsykes}}/events/{{ambient}}/{{sample}}/{{avg/count/sum}}/dba/daily/{{barchart/json}}
    app.get("/v1/users/:username/events/:objectTags/:actionTags/:operation/:period/:renderType", validateShareToken, function (req, res) {
        var dateRange = getDateRange(req);
        var username = req.param("username");
        req.session.redirectUrl = req.originalUrl;
        var streamId = req.query.streamId;
        var readToken = req.query.readToken;

        var respondWithImage = function(imageName){
            res.sendfile("images/" + imageName);
        };

        var serveImage = function(){
            util.getSharedGraphImagePath(req.query.shareToken)
            .then(respondWithImage)
            .catch(function(err){
                console.log("Error resolving image " + err);
                res.status(500).send(err);
            })
        };

        var renderChart = function (graphOwnerAvatarUrl) {
            if (req.param("renderType") === 'barchart.png') {
                util.checkImageExists(req.query.shareToken)
                .then(serveImage)
                .catch(function(err){
                    console.log("Error image not available");
                    res.status(404).send("Image not available");
                })
            } else {
            
            var graphTitle = getGraphTitle(req.param("objectTags"), req.param("actionTags"));
            var isUserLoggedIn = !(_.isEmpty(req.session.username));
            var hideShareButtons = !(_.isEmpty(req.query.hideButtons)) && req.query.hideButtons === 'true';

            res.render('chart', {
                isUserLoggedIn: isUserLoggedIn,
                oneselfAppUrl: process.env.CONTEXT_URI,
                title: graphTitle,
                graphOwner: username,
                username: username,
                graphOwnerAvatarUrl: graphOwnerAvatarUrl,
                avatarUrl: req.session.avatarUrl,
                objectTags: req.param("objectTags"),
                actionTags: req.param("actionTags"),
                operation: req.param("operation"),
                period: req.param("period"),
                shareToken: req.query.shareToken,
                renderType: req.param("renderType"),
                fromDate: dateRange.from,
                toDate: dateRange.to,
                hideButtons: hideShareButtons
            });
        }
        };

        util.streamExists(streamId, readToken)
            .then(function (exists) {
                if (exists) {
                    getStreamsForUser(username)
                        .then(function (user) {
                            return util.linkStreamToUser(user, streamId);
                        })
                        .then(function () {
                            return getGraphOwnerAvatarUrl(username);
                        })
                        .then(renderChart)
                        .catch(function (error) {
                            console.error("Error while linking stream to user ", error);
                            res.status(500).send("Internal server error.");
                        });
                } else {
                    getGraphOwnerAvatarUrl(username).then(renderChart);
                }
            });
    });

    //v1/me/events/{{ambient}}/{{sample}}/{{avg/count/sum}}/dba/daily/{{.barchart/.json}}
    app.get("/v1/me/events/:objectTags/:actionTags/:operation/:period/:renderType", sessionManager.requiresSession, function (req, res) {
        var username = req.session.username;
        var redirectTo = req.url.replace("/me/", "/users/" + username + "/");
        res.redirect(CONTEXT_URI + redirectTo);
    });

    // /v1/users/:username/correlate/:period/.json?firstEvent=:objectTags/:actionTags/:operation&secondEvent=:objectTags/:actionTags/:operation
    app.get("/v1/users/:username/correlate/:period/:renderType", sessionManager.requiresSession, function (req, res) {
        var username = req.params.username;
        var period = req.params.period;
        var renderType = req.params.renderType;
        var firstEvent = req.query.firstEvent;
        var secondEvent = req.query.secondEvent;
        var fromDate = req.query.from;
        var toDate = req.query.to;

        var firstEventSplit = firstEvent.split("/");
        var secondEventSplit = secondEvent.split("/");
        var firstEventTitle = getGraphTitle(firstEventSplit[0], firstEventSplit[1]);
        var secondEventTitle = getGraphTitle(secondEventSplit[0], secondEventSplit[1]);

        getGraphOwnerAvatarUrl(username).then(function (avatarUrl) {
            res.render("scatterplot", {
                oneselfAppUrl: process.env.CONTEXT_URI,
                graphOwnerAvatarUrl: avatarUrl,
                username: username,
                period: period,
                firstEventTitle: firstEventTitle,
                secondEventTitle: secondEventTitle,
                firstEvent: firstEvent,
                secondEvent: secondEvent,
                fromDate: fromDate,
                toDate: toDate
            });
        });
    });

    var verifyAppCredentials = function (req, res, next) {
        var auth = req.headers.authorization;
        var auth = auth.split('Basic ');
        var appId = '';
        var appSecret = '';
        if (auth[0] = 'Basic') {
            var authParts = auth[1].split(':');
            appId = authParts[0];
            appSecret = authParts[1];
        } else {
            authParts = auth[0].split(':');
            appId = authParts[0];
            appSecret = authParts[1];
        }

        var query = {
            "appId": appId,
            "appSecret": appSecret
        };

        mongoRepository.findOne('registeredApps', query)
            .then(function (app) {
                req.app1self = app;
                next();
            }, function (err) {
                res.send(500);
            });
    };

    var createAppToken = function (req, res, next) {
        generateToken()
        .then(function (token) {
            var scope = req.body;
            var app = req.app1self;
            var permission = {
                token: token,
                appId: app.appId,
                scope: scope
            };

            mongoRepository.insert('apptoken', permission)
                .then(function () {
                    var result = {
                        token: permission.token,
                        appId: permission.appId,
                        scope: permission.scope
                    }
                    res.status(200).send(result);
                }, function (err) {
                    res.status(500).send(err);
                });
        });

    };

    app.post("/v1/apps/:appId/token"
        , verifyAppCredentials
        , createAppToken);

    var lookupAppToken = function (req, res, next) {

        var query = {
            token: req.authToken
        };

        mongoRepository.findOne('apptoken', query)
            .then(function (permission) {
                req.permission = permission;
                if (permission === null) {
                    res.status(401).send("Couldn't athenticate, the application token is unknown.")
                }
                next();
            }, function (err) {
                res.status(500).send("Server error while looking up token.")
            });
    };

    var differentTags = function (tags1, tags2) {
        var result = _.difference(tags1, tags2).length > 0;
        return result;
    };
    var verifyTokenPermission = function (req, res, next) {
        var objectTags = req.params.objectTags.split(",");
        var actionTags = req.params.actionTags.split(",");

        var result = false;

        var requestPermissionMismatch =
            objectTags.length !== req.permission.scope.objectTags.length
            || actionTags.length !== req.permission.scope.actionTags.length
            || differentTags(objectTags, req.permission.scope.objectTags)
            || differentTags(actionTags, req.permission.scope.actionTags);

        if (requestPermissionMismatch) {
            res.status(401).send("Couldn't authenticate, the object tags or action tags in the request don't match those granted to the token");
        }

        next();
    };

    var getStreams = function (req, res, next) {
        var query = {
            appId: req.permission.appId
        };

        var projection = {
            streamid: 1
        };

        var mapStreamObjectsToArray = function (streamObject) {
            return streamObject.streamid;
        };

        mongoRepository.find("stream", query, projection).then(
            function (streams) {
                if (streams === null) {
                    streams = [];
                }

                streams = _.map(streams, mapStreamObjectsToArray);
                req.streams = streams;
                next();
            });
    };

    var getEvents = function (req, res, next) {
        var query = {
            "payload.location.lat": {$ne: ""},
            "payload.streamid": {
                "$in": req.streams
            },

            "payload.objectTags": {
                "$all": req.permission.scope.objectTags
            },

            "payload.actionTags": {
                "$all": req.permission.scope.actionTags
            }

        };

        var projection = {
            "_id": 0,
            "emptyProjection": 1,
	    "payload.dateTime": "dateTime",
            "payload.eventDateTime": true
        };

        if (req.permission.scope.location === true) {
            projection["payload.location"] = "location";
        }
	
	console.log(req.permission.scope);
	console.log(req.permission.scope['ultraviolet-index']);
	if(req.permission.scope['ultraviolet-index'] === true) {
	    console.log("ultraviolet scope found");
	    projection["payload.properties.ultraviolet-index"] = true;
        }

	if(req.permission.scope['humidity-percent'] === true) {
            projection["payload.properties.humidity-percent"] = true;
        }


        if(req.permission.scope['lux'] === true) {
            projection["payload.properties.lux"] = true;
        }


        if(req.permission.scope['celsius'] === true) {
            projection["payload.properties.celsius"] = true;
        }

        var removePayload = function (event) {
            if(event.payload.dateTime === undefined){
                event.payload.dateTime = event.payload.eventDateTime.toISOString();
            }
		
            return event.payload;
        };

        var addEventsToRequest = function (events) {
            events = _.map(events, removePayload);
            req.resultDataset = events;
            if (req.resultDataset === null) {
                req.resultDataset = [];
            }

            next();
        };

        eventRepository.find("oneself", query, projection).then(
            addEventsToRequest
        );
    };

    var convertToRepresentation = function (req, res, next) {
        if (req.params.representation === "json") {
            res.status(200).send(req.resultDataset);
        }
        else if (req.params.representation === "animatedglobe") {
            var dataUrlComponents = [
                "/v1/apps",
                req.params.appId,
                "events",
                req.params.objectTags,
                req.params.actionTags,
                ".json"
            ];

            var representationUrlComponents = [
                CONTEXT_URI,
                "v1/apps",
                req.params.appId,
                "events",
                req.params.objectTags,
                req.params.actionTags,
                "." + req.params.representation
            ];

            var resizerUrlComponents = [
                CONTEXT_URI,
                "js/iframeResizer.min.js"
            ];

            var dataUrl = dataUrlComponents.join("/") + "?token=" + req.authToken;
            var representationUrl = representationUrlComponents.join("/") + "?token=" + req.authToken;
            var resizerUrl = resizerUrlComponents.join("/");

            var circleColor = "red"; // default circle color if none specified
            if (req.query.circleColor) {
                circleColor = req.query.circleColor;
            }
            var frameBodyColor = "lightgray"; // default frame body color if none specified
            if (req.query.frameBodyColor) {
                frameBodyColor = req.query.frameBodyColor;
            }

            var model = {
                dataUrl: dataUrl,
                representationUrl: representationUrl,
                resizerUrl: resizerUrl,
                circleColor: circleColor,
                frameBodyColor: frameBodyColor
            };

            res.render('animatedGlobe', model);
        }
        else {
            var knownRepresentations = [
                ".json",
                ".animatedglobe"
            ];
            res.status(404).send("You requested an unknown representation. Known representations are: \r\n" + knownRepresentations.join("\r\n"));
        }
    };

    app.get("/v1/apps/:appId/events/:objectTags/:actionTags/.:representation"
        , parseTokenFromAuthorization
        , lookupAppToken
        , verifyTokenPermission
        , getStreams
        , getEvents
        , convertToRepresentation);

    app.get("/timeline", sessionManager.requiresSession, function (req, res) {
        res.render('timeline', {
            encodedUsername: req.session.encodedUsername,
            username: req.session.username,
            avatarUrl: req.session.avatarUrl
        });
    });
};
