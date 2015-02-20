var crypto = require('crypto');
var mongoDbConnection = require('./lib/connection.js');
var mongoRespository = require('./mongoRepository.js');
var q = require('q');
var moment = require("moment");

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
            return mongoRespository.insert('stream', stream);
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

    return mongoRespository.insert('registeredApps', appDetails);
};

Util.prototype.streamExists = function (streamId, readToken) {
    var query = {
        streamid: streamId
        //, readToken: readToken
    };
    var deferred = q.defer();
    mongoRespository.findOne('stream', query)
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

module.exports = new Util();
