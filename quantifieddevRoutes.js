var sessionManager = require("./sessionManagement");
var _ = require("underscore");
var Q = require('q');

module.exports = function(app, express) {

    app.get("/signup", function(req, res) {
        res.render('signup');
    });

    app.get("/dashboard", sessionManager.requiresSession, function(req, res) {
        var streamId = req.query.streamId ? req.query.streamId : "";
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
        var streamExists = function(streamId, user) {
            return _.where(user.streams, {
                "streamId": streamId
            }).length > 0;
        }
        if (streamId && readToken) {
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
            var insertStreamForUser = function(user, streamId) {
                qdDb = app.getQdDb();
                var deferred = Q.defer();
                var mappingToInsert = {
                    "$push": {
                        "streams": {
                            "streamId": streamId,
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
                if (streamExists(streamId, user)) {
                    deferred.resolve();
                } else {
                    return insertStreamForUser(user, streamId);
                }
                return deferred.promise;
            };

            getStreamsForUser().then(decideWhatToDoWithStream).then(function() {
                res.render('dashboard', {
                    streamId: streamId,
                    readToken: readToken
                });
            });
        } else {
            res.render('dashboard');
        }
    });

    app.get("/claimUsername", function(req, res) {
        res.render('claimUsername', {
            username: req.query.username,
            githubUsername: req.query.username
        });
    });

    app.post("/claimUsername", function(req, res) {
        var oneselfUsername = req.body.username;
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
                        username: oneselfUsername
                    }
                }, function(err, user) {
                    if (err) {
                        res.status(500).send("Database error");
                    } else {
                        req.session.username = oneselfUsername;
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

    app.get("/community", function(req, res) {
        res.render('community', getFilterValuesFrom(req));
    });
}