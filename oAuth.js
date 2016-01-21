var passport = require('passport');
var oAuthConfig = require('./oAuthConfig.js');
var githubStrategy = require('passport-github').Strategy;
var facebookStrategy = require('passport-facebook').Strategy;
var sessionManager = require("./sessionManagement");
var crypto = require('crypto');
var _ = require("underscore");
var q = require("q");
var basicAuth = require('basic-auth');
var ObjectID = require('mongodb').ObjectID;
var scopedLogger = require('./scopedLogger');
var conceal = require('concealotron');

var SignupModule = require("./modules/signupModule.js");
var LoginModule = require("./modules/loginModule.js");
var IntentManager = require('./modules/intentManager.js');
var mongoRepository = require('./mongoRepository.js');
var CONTEXT_URI = process.env.CONTEXT_URI;

var generateToken = function (size) {
    return q.Promise(function(resolve, reject){
        crypto.randomBytes(size, function (ex, buf) {
            if(ex){
                reject(ex);
            }

            var token = buf.toString('hex');
            resolve(token);
        });
    });
    
};

module.exports = function (app) {
    var githubOAuth = oAuthConfig.getGithubOAuthConfig();
    var facebookOAuth = oAuthConfig.getFacebookOAuthConfig();

    var handleOAuthWithIntent = function (oAuthUser, req, res) {
        var isEmpty = function (user) {
            return !user;
        };
        var isNotEmpty = function (user) {
            return !!user;
        };
        var setSessionData = function (user) {
            var deferred = q.defer();
            sessionManager.setSession(req, res, user);
            deferred.resolve();
            return deferred.promise;
        };
        var checkUserPresent = function (userQuery) {
            var deferred = q.defer();
            mongoRepository.findOne('users', userQuery)
                .then(function (user) {
                    deferred.resolve(user);
                });
            return deferred.promise;
        };
        var validateUserAction = function (user) {
            var deferred = q.defer();
            if ((req.session.auth === 'login') && isEmpty(user)) {
                deferred.reject("invalid_username");
            } else {
                deferred.resolve(user);
            }
            return deferred.promise;
        };
        var checkSignupWithExistingAuth = function (user) {
            var deferred = q.defer();
            if (!(_.isEmpty(req.session.oneselfUsername)) && isNotEmpty(user)) {
                deferred.reject("auth_exists_cant_signup");
            } else {
                deferred.resolve(user);
            }
            return deferred.promise;
        };
        var doAuth = function (user) {
            var deferred = q.defer();

            if (isEmpty(user)) {
                SignupModule.signup(oAuthUser,req, res).then(function (userRecord) {
                    deferred.resolve(userRecord);
                });
            }
            else {
                LoginModule.login(oAuthUser, req, res).then(function () {
                    deferred.resolve(user);
                });
            }
            return deferred.promise;
        };
        var userQuery = {
            "profile.id": oAuthUser.id
        };
        checkUserPresent(userQuery)
            .then(validateUserAction)
            .then(checkSignupWithExistingAuth)
            .then(doAuth)
            .then(setSessionData)
            .then(function () {
                IntentManager.process(req.session.intent, req, res);
            }).catch(function (errorCode) {
                console.log("ERROR CODE IS,", errorCode);
                IntentManager.handleError(errorCode, req, res);
            });
    };

    var handleFacebookCallback = function (req, res) {
        var logger = scopedLogger.logger(req.user.profile.id, req.app.logger);
        console.log("handling facebook callback");
        var facebookUser = req.user.profile;
        var accessToken = req.user.accessToken;
        req.session.facebookAccessToken = accessToken;
        oAuthConfig.getFacebookProfilePictureUrl(facebookUser.id, accessToken)
            .then(function (profilePicUrl) {
                facebookUser.avatarUrl = profilePicUrl;
                handleOAuthWithIntent(facebookUser, req, res);
            }, function (err) {  
                logger.error('error occurred', err);              
                res.status(500).send("Could not fetch profile picture for user.");
            });
    };

    var handleGithubCallback = function (req, res) {
        var logger = scopedLogger.logger(req.user.profile.id, req.app.logger);
        var githubUser = req.user.profile;
        var accessToken = req.user.accessToken;
        req.session.githubAccessToken = accessToken;
        githubUser.avatarUrl = githubUser._json.avatar_url;

        oAuthConfig.getGithubEmailAddresses(accessToken)
            .then(function (userEmails) {
                for (var i in userEmails) {
                    githubUser.emails.push(userEmails[i]);
                }
                handleOAuthWithIntent(githubUser, req, res);
            }, function (err) {
                logger.error('error ocurred in github callback', err);
                res.status(500).send("Could not fetch email addresses for user.");
            });
    };

    passport.serializeUser(function (user, done) {
        done(null, user);
    });
    passport.deserializeUser(function (obj, done) {
        done(null, obj);
    });
    passport.use(new facebookStrategy({
            clientID: facebookOAuth.clientId,
            clientSecret: facebookOAuth.clientSecret,
            callbackURL: facebookOAuth.callbackUrl
        },
        function (accessToken, refreshToken, profile, done) {
            var facebookProfile = {
                profile: profile,
                accessToken: accessToken
            };
            return done(null, facebookProfile);
        }
    ));

    passport.use(new githubStrategy({
            clientID: githubOAuth.clientId,
            clientSecret: githubOAuth.clientSecret,
            callbackURL: githubOAuth.callbackUrl
        },
        function (accessToken, refreshToken, profile, done) {
            var githubProfile = {
                profile: profile,
                accessToken: accessToken
            };
            return done(null, githubProfile);
        }
    ));

    app.use(passport.initialize());
    app.use(passport.session());

    var recordFacebookSignup = function(req, res, next){
        SignupModule.signingUpWithFacebook(req.session);
        next();
    };

    var recordFacebookLogin = function(req, res, next){
        req.session.login = 'facebook';
        next();
    };

    app.get('/login/facebook', 
        recordFacebookLogin, 
        passport.authenticate('facebook', {scope: 'email'}));

    app.get('/signup/facebook', 
        recordFacebookSignup, 
        passport.authenticate('facebook', {scope: 'email'}));

    app.get('/auth/facebook/callback',
        passport.authenticate('facebook', {failureRedirect: CONTEXT_URI + '/signup'}),
        handleFacebookCallback);

    var recordGithubLogin = function(req, res, next){
        req.session.login = 'github';
        next();
    };

    var recordGithubSignup = function(req, res, next){
        SignupModule.signingUpWithGithub(req.session);
        next();
    };

    app.get('/login/github', 
        recordGithubLogin, 
        passport.authenticate('github', {
        scope: 'user:email'
    }));

    app.get('/signup/github', 
        recordGithubSignup, 
        passport.authenticate('github', {
        scope: 'user:email'
    }));
    
    app.get('/auth/github/1self_website', function (req, res, next) {
        req.session.redirectUrl = "/dashboard";
        passport.authenticate('github', {
            scope: 'user:email'
        })(req, res, next);
    });

    app.get('/auth/github/callback', passport.authenticate('github', {
        failureRedirect: CONTEXT_URI + '/signup'
    }), handleGithubCallback);

    app.get('/auth/login', function(){
        // store that token auth is the intent
        // redirect to login page
    });

    app.get('/auth/authorize/signup', function(req, res){
        var clientLogger = scopedLogger.logger(req.query.client_id, req.app.logger);
        var sessionLogger = scopedLogger.logger(conceal(req.session.id), clientLogger);

        if(req.query.username === undefined){
            sessionLogger.debug('username isnt set');
            res.status(400).send('username isnt set');
            return;
        }

        if(req.query.service === undefined){
            sessionLogger.debug('service isnt set');
            res.status(400).send('service isnt set');
            return;
        }

        if(req.query.response_type === undefined || req.query.response_type !== 'code'){
            sessionLogger.debug('response_type parameter must be set to \'code\'');
            res.status(400).send('response_type parameter must be set to \'code\'');
            return;
        }

        if(req.query.client_id === undefined){
            sessionLogger.debug('client_id isnt set');
            res.status(400).send('client_id isnt set');
            return;
        }

        if(req.query.redirect_uri === undefined){
            sessionLogger.debug('redirect_uri isnt set');
            res.status(400).send('redirect_uri isnt set');
            return;
        }

        
        if(req.session.username === undefined){
            var url = '/signup' + 
            '?username=' + 
            req.query.username + 
            '&service=' + 
            req.query.service;

            IntentManager.setOauthAuthAsIntent(req, res);
            sessionLogger.debug('user isnt logged in, redirecting');
            res.redirect(url);
            return;
        }

        // store the app redirect page in the intent
        // if not logged in, redirect to login page

        var userLogger = scopedLogger.logger(req.session.username, sessionLogger);

        generateToken   (16)
        .then(function(authcode){
            userLogger.debug('auth code created, ', conceal(authcode));
            var userIdObjectId = new ObjectID(req.session.userId);

            var doc = {
                userId: userIdObjectId,
                authcode: authcode,
                clientId: req.query.client_id,
                date: new Date(),
                redirectUri: req.query.redirect_uri
            };

            userLogger.silly('inserting doc, ', conceal(doc));
            return mongoRepository.insert('authcodes', doc);
        })
        .then(function(insertedDoc){
            var url = req.query.redirect_uri + '?code=' + insertedDoc.authcode;
            url += '&state=' + req.query.state;
            userLogger.debug('redirecting', url);
            return res.redirect(url);
        }, function(error){
            return q.Promise.reject({
                code: 500,
                message: error
            });
        })
        .catch(function(error){
            userLogger.error(error.message);
            if(error.code !== undefined && error.code === 500){
                res.status(500).send('internal server error');
            }
        })
        .done();
    });

    app.get('/auth/authorize', function(req, res){
        var clientLogger = scopedLogger.logger(req.query.client_id, req.app.logger);
        var sessionLogger = scopedLogger.logger(conceal(req.session.id), clientLogger);

        if(req.query.response_type === undefined || req.query.response_type !== 'code'){
            sessionLogger.debug('response_type parameter must be set to \'code\'');
            res.status(400).send('response_type parameter must be set to \'code\'');
            return;
        }

        if(req.query.client_id === undefined){
            sessionLogger.debug('client_id isnt set');
            res.status(400).send('client_id isnt set');
            return;
        }

        if(req.query.redirect_uri === undefined){
            sessionLogger.debug('redirect_uri isnt set');
            res.status(400).send('redirect_uri isnt set');
            return;
        }

        
        if(req.session.username === undefined){
            IntentManager.setOauthAuthAsIntent(req, res);
            sessionLogger.debug('user isnt logged in, redirecting');
            var loginUrl = '/login';
            req.session.trackingId = req.query.trackingId;
            res.redirect(loginUrl);
            return;
        }

        // store the app redirect page in the intent
        // if not logged in, redirect to login page

        var userLogger = scopedLogger.logger(req.session.username, sessionLogger);

        generateToken(16)
        .then(function(authcode){
            userLogger.debug('auth code created, ', conceal(authcode));
            var userIdObjectId = new ObjectID(req.session.userId);

            var doc = {
                userId: userIdObjectId,
                authcode: authcode,
                clientId: req.query.client_id,
                date: new Date(),
                redirectUri: req.query.redirect_uri
            };

            userLogger.silly('inserting doc, ', conceal(doc));
            return mongoRepository.insert('authcodes', doc, userLogger);
        })
        .then(function(insertedDoc){
            userLogger.debug('auth code database response', JSON.stringify(insertedDoc));
            var url = req.query.redirect_uri + '?code=' + insertedDoc.authcode;
            url += '&state=' + req.query.state;
            userLogger.debug('redirecting', url);
            return res.redirect(url);
        }, function(error){
            return q.Promise.reject({
                code: 500,
                message: error
            });
        })
        .catch(function(error){
            userLogger.error(error.message);
            if(error.code !== undefined && error.code === 500){
                res.status(500).send('internal server error');
            }
        })
        .done();
    });

    app.delete('/auth/token', function(req, res){
        var splits = req.headers.authorization.split(' ');
        if(splits[0] !== 'Bearer'){
            res.status(404).send('token format must be \'Bearer token\'');
            req.app.logger.debug('token format must be \'Bearer token\'');
            return;
        }

        var token = splits[1];

        if(token === undefined){
            res.status(404).send('token must be sent in authorization header');
            return;
        }

        //var tokenLogger = scopedLogger.logger(conceal(token), req.app.logger);

        var query = {
            token: token
        };

        mongoRepository.findAndRemove('accessTokens', query)
        .then(function(accessTokenDoc){
            if(accessTokenDoc === null){
                res.status(404).send('invalid token');
                return;
            }

            res.status(200).send('token deleted');
        })
        .catch(function(error){
            res.status(500).send(error);
        })
        .done();
    });

    app.post('/auth/token', function(req, res){
        
        var user = basicAuth(req);
        if(user === undefined){
            user = {};
            user.name = req.body.client_id;
            user.pass = req.body.client_secret;
            if(user.name === undefined || user.pass === undefined){
                res.send('client_id and client_secret must be provided using basic auth', 401);
                return;
            }
        }

        // findanddelete the auth_code from the database
        var query = {
            clientId: user.name,
            clientSecret: user.pass
        };

        var clientLogger = scopedLogger.logger(conceal(query.clientId), req.app.logger);
        var userLogger = {};
        
        clientLogger.debug('querying the db', conceal(query));

        mongoRepository.findOne('oauthClients', query)
        .then(function(client){
            if(client === null){
                return q.Promise.reject({
                    code: 401,
                    message: 'invalid client'
                });
            }

            var query = {
                authcode: req.body.code,
                clientId: user.name
            };

            clientLogger.debug('querying authcode, query', conceal(query));
            return mongoRepository.findAndRemove('authcodes', query);
        })
        .then(function(authcode){
            clientLogger.silly('checking auth code is valid', conceal(authcode));
            if(authcode === null){
                return q.Promise.reject({
                    code: 401,
                    message: 'invalid auth code'
                });
            }

            if(req.body.redirect_uri !== authcode.redirectUri){
                return q.Proimse.reject({
                    code: 401,
                    message: 'redirect uri doesnt match'
                });
            }

            var dateDiff = new Date() - authcode.date;
            if(dateDiff / 1000 / 60 > 10){
                return q.Promise.reject({
                    code: 401,
                    message: 'auth code expired'
                });
            }

            clientLogger.debug('auth code is valid, authcode', conceal(authcode));

            return authcode;
        })  
        .then(function(authcode){
            userLogger = scopedLogger.logger(conceal(authcode.userId.toString()), clientLogger);
            var accessToken = {
                userId: authcode.userId,
                clientId: authcode.clientId
            };

            return generateToken(32).then(function(token){
                accessToken.token = token;
                userLogger.debug('inserting access token, token', conceal(accessToken));
                return mongoRepository.insert('accessTokens', accessToken);
            });
        })
        .then(function(insertedToken){
            userLogger.info('access token created, accessToken', conceal(insertedToken));
            var result = {
                access_token: insertedToken.token,
                token_type: 'Bearer'
            };
            res.status(200).send(result);
        })
        .catch(function(error){
            clientLogger.error(error.code === undefined ? error.message : error.code + ': ' + error.message);
            if(error.code === 401){
                res.status(error.code).send(error.message);
            }
            else
            {
                res.status(500).send('internal server error');
            }
        })
        .done();
    });

    app.locals.requireToken = function(req, res, next){
        var token = req.headers.authorization.split(' ')[1];
        if(token === undefined){
            res.status(401).send('token must be bearer (Bearer abcde...xyz)');
            return;
        } 

        var query ={
            token: token
        };

        mongoRepository.findOne('accessTokens', query)
        .then(function(tokenDoc){
            if(tokenDoc === null){
                res.status(401).send('invalid token');
                return;
            }

            req.token = tokenDoc;
            next();
        });
    };

    // app.delete('auth/token', function(req, res){

    // })

};