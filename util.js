var crypto = require('crypto');
var mongoDbConnection = require('./lib/connection.js');
var mongoRepository = require('./mongoRepository.js');
var q = require('q');
var _ = require("underscore")
var moment = require("moment");
var redis = require("redis");

var redisPublish = redis.createClient();

var Util = function () {
};

Util.prototype.createStream = function (callback) {
    crypto.randomBytes(16, function (ex, buf) {
        if (ex) throw ex;

        var streamid = [];
        for (var i = 0; i < buf.length; i++) {
            var charCode = String.fromCharCode((buf[i] % 26) + 65);
            streamid.push(charCode);
        }

        var writeToken = crypto.randomBytes(22).toString('hex');
        var readToken = crypto.randomBytes(22).toString('hex');
        var stream = {
            streamid: streamid.join(''),
            writeToken: writeToken,
            readToken: readToken
        };

        mongoDbConnection(function (qdDb) {

            qdDb.collection('stream').insert(stream, function (err, insertedRecords) {
                if (err) {
                    console.log(err);
                    callback(err, null);
                } else {
                    console.log("Inserted records", insertedRecords[0]);
                    callback(null, insertedRecords[0]);
                }
            });
        });
    });
};

var generateStream = function (appId, callbackUrl) {
    var deferred = q.defer();
    crypto.randomBytes(16, function (ex, buf) {
        if (ex) {
            deferred.reject(ex);
        }

        var streamid = [];
        for (var i = 0; i < buf.length; i++) {
            var charCode = String.fromCharCode((buf[i] % 26) + 65);
            streamid.push(charCode);
        }
        var writeToken = crypto.randomBytes(22).toString('hex');
        var readToken = crypto.randomBytes(22).toString('hex');
        var stream = {
            streamid: streamid.join(''),
            writeToken: writeToken,
            readToken: readToken,
            callbackUrl: callbackUrl,
            appId: appId
        };
        deferred.resolve(stream);
    });
    return deferred.promise;
};
Util.prototype.generateRegistrationToken = function () {
    var deferred = q.defer();
    crypto.randomBytes(16, function (ex, buf) {
        if (ex) {
            deferred.reject(ex);
        }
        var registrationToken = [];
        for (var i = 0; i < buf.length; i++) {
            var charCode = String.fromCharCode((buf[i] % 26) + 65);
            registrationToken.push(charCode);
        }
        console.log("Registration Token: ", registrationToken.join(''));
        deferred.resolve(registrationToken.join(''));
    });
    return deferred.promise;
};
Util.prototype.createV1Stream = function (appId, callbackUrl) {
    return generateStream(appId, callbackUrl)
        .then(function (stream) {
            return mongoRepository.insert('stream', stream);
        });
};

Util.prototype.registerApp = function (appEmail) {
    var appId = crypto.randomBytes(16).toString('hex');
    var appSecret = crypto.randomBytes(32).toString('hex');
    var appDetails = {
        appEmail: appEmail,
        createdOn: moment.utc().toDate(),
        appId: "app-id-" + appId,
        appSecret: "app-secret-" + appSecret
    };

    return mongoRepository.insert('registeredApps', appDetails);
};

Util.prototype.streamExists = function (streamId, readToken) {
    var query = {
        streamid: streamId
        //, readToken: readToken
    };
    var deferred = q.defer();
    mongoRepository.findOne('stream', query)
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

Util.prototype.linkStreamToUser = function (user, streamId) {
    var deferred = q.defer();
    if (isStreamAlreadyLinkedToUser(streamId, user)) {
        deferred.resolve(false);
    } else {
        return insertStreamForUser(user, streamId);
    }
    return deferred.promise;
};

Util.prototype.linkIntegrationAppToUser = function (user, appId) {
    var deferred = q.defer();
    if (isIntegrationAppAlreadyLinkedToUser(user, appId)) {
        deferred.resolve(false);
    } else {
        return insertIntegrationAppForUser(user, appId);
    }
    return deferred.promise;
};

var isStreamAlreadyLinkedToUser = function (streamid, user) {
    return _.where(user.streams, {
            "streamid": streamid
        }).length > 0;
};

var isIntegrationAppAlreadyLinkedToUser = function (user, appId) {
    return _.contains(user.integrations, appId);
};

var insertStreamForUser = function (user, streamid) {
    var deferred = q.defer();
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
        .then(function () {
            var message = {
                type: 'userupdate',
                username: user.username,
                streamidAdded: streamid
            };

            // It's important that the publish of the event is done once the data has 
            // been written: downstream processing uses this message to know to reload 
            // the user. 
            redisPublish.publish('users', JSON.stringify(message));
            deferred.resolve(true);

        }, function (err) {
            deferred.reject(err);
        });
    return deferred.promise;
};

var insertIntegrationAppForUser = function (user, appId) {
    var deferred = q.defer();
    var updateObject = {
        "$push": {
            "integrations": appId
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

Util.prototype.getStreamsForUser = function (oneselfUsername) {
    var byOneselfUsername = {
        "username": oneselfUsername.toLowerCase()
    };
    var projection = {
        "streams": 1,
        "username": 1
    };
    var deferred = q.defer();
    mongoRepository.findOne('users', byOneselfUsername, projection)
        .then(function (user) {
            deferred.resolve(user);
        }, function (err) {
            deferred.reject(err);
        });
    return deferred.promise;
};

Util.prototype.findUser = function (oneselfUsername) {
    var byOneselfUsername = {
        "username": oneselfUsername.toLowerCase()
    };
    var deferred = q.defer();
    mongoRepository.findOne('users', byOneselfUsername)
        .then(function (user) {
            deferred.resolve(user);
        }, function (err) {
            deferred.reject(err);
        });
    return deferred.promise;
};


function getDescendantProp(obj, desc) {
    var arr = desc.split(".");
    while(arr.length && (obj = obj[arr.shift()]));
    return obj;
}

Util.prototype.getRollupByDay = function (userId, objectTags, actionTags, operation, property) {
    var condition = {
        "userId": userId,
        "objectTags": objectTags,
        "actionTags": actionTags
    };
    var deferred = q.defer();
    mongoRepository.find('userRollupByDay', condition)
        .then(function (rollups) {
            var result = _(rollups).map(function(rollup){
                return {
                    date: rollup.date,
                    value: getDescendantProp(rollup, property)
                };

                
            });
            deferred.resolve(result);
        }, function (err) {
            deferred.reject(err);
        });
    return deferred.promise;
};

var checkGraphAlreadyShared = function (graphShareObject) {
    var deferred = q.defer();
    mongoRepository.findOne('graphShares', graphShareObject)
        .then(function (graphShareObject) {
            deferred.resolve(graphShareObject);
        }, function (err) {
            deferred.reject(err);
        });
    return deferred.promise;
};

Util.prototype.checkGraphAlreadyShared = checkGraphAlreadyShared

Util.prototype.validateShareTokenAndGraphUrl = function (shareToken, graphUrl) {
    var deferred = q.defer();
    var graphShareObject = {"graphUrl": graphUrl, "shareToken": shareToken};

    checkGraphAlreadyShared(graphShareObject)
        .then(function (graphShareObject) {
            if (graphShareObject) {
                deferred.resolve();
            } else {
                deferred.reject("Invalid input");
            }
        }).catch(function (err) {
            console.log("Error is", err);
            deferred.reject(err);
        });
    return deferred.promise;
};

Util.prototype.checkImageExists = function (shareToken) {
    var deferred = q.defer();
    var graphShareObject = {"shareToken": shareToken};

    mongoRepository.findOne('graphShares', graphShareObject)
    .then(function (graphShareObject) {
        deferred.resolve(!_.isEmpty(graphShareObject.imageUrl));
    }, function (err) {
        deferred.reject(err);
    });
    
    return deferred.promise;
};

Util.prototype.getSharedGraphImagePath = function (shareToken) {
    var deferred = q.defer();
    var graphShareObject = {"shareToken": shareToken};

    checkGraphAlreadyShared(graphShareObject)
        .then(function (graphShareObject) {
            if (graphShareObject) {
                deferred.resolve(graphShareObject.imageUrl);
            } else {
                deferred.reject("Invalid input");
            }
        }).catch(function (err) {
            console.log("Error is", err);
            deferred.reject(err);
        });
    return deferred.promise;
};

Util.prototype.addSharedGraphImagePath = function(graphShareObject, imgPath) {
    var deferred = q.defer();
    var updateObject = {$set: {'imageUrl': imgPath }};
    var options = {upsert: true};

    var query = graphShareObject;
    console.log(updateObject);

    mongoRepository.update('graphShares', query, updateObject, options)
        .then(function () {
            deferred.resolve(true);
        }, function (err) {
            deferred.reject(err);
        });
    return deferred.promise;
};


module.exports = new Util();
