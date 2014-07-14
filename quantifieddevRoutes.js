var sessionManager = require("./sessionManagement");

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
        if (streamId && readToken) {
            var oneselfUsername = req.session.username;
            var streamidUsernameMapping = {
                "username": oneselfUsername,
                "streams": {
                    "$elemMatch": {
                        "streamId": streamId
                    }
                }
            };
            qdDb = app.getQdDb();
            qdDb.collection('users').findOne(streamidUsernameMapping, function(err, user) {
                if (user) {
                    res.render('dashboard', {
                        streamId: streamId,
                        readToken: readToken
                    });
                } else {
                    var mappingToInsert = {
                        "$push": {
                            "streams": {
                                "streamId": streamId,
                                "readToken": readToken
                            }
                        }
                    };
                    qdDb.collection('users').update({
                        "username": oneselfUsername
                    }, mappingToInsert, function(err, user) {
                        if (user) {
                            res.render('dashboard', {
                                streamId: streamId,
                                readToken: readToken
                            });
                        } else {
                            res.status(500).send("Database error");
                        }
                    });
                }
            });
        } else {
            res.render('dashboard', {
                streamId: streamId,
                readToken: readToken
            });
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
                        res.redirect('/dashboard?username=' + oneselfUsername);
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