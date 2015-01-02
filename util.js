var crypto = require('crypto');
var mongoDbConnection = require('./lib/connection.js');
var q = require('q');

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
        ;

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

var generateStream = function (appId) {
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
            appId: appId
        };
        deferred.resolve(stream);
    });
    return deferred.promise;
};

Util.prototype.createV1Stream = function (appId) {
    var deferred = q.defer();

    generateStream(appId).then(function (stream) {
        mongoDbConnection(function (qdDb) {
            qdDb.collection('stream').insert(stream, function (err, insertedRecords) {
                if (err) {
                    console.err(err);
                    deferred.reject(err);
                } else {
                    deferred.resolve(insertedRecords[0]);
                }
            });
        });
    });
    return deferred.promise;
};

Util.prototype.registerApp = function (appDetails, callback) {

    var appId = crypto.randomBytes(16).toString('hex');
    var appSecret = crypto.randomBytes(32).toString('hex');

    appDetails.appId = "app-id-" + appId;
    appDetails.appSecret = "app-secret-" + appSecret;

    mongoDbConnection(function (qdDb) {
        qdDb.collection('registeredApps').insert(appDetails, function (err, insertedRecords) {
            if (err) {
                console.log(err);
                callback(err, null);
            } else {
                console.log("Inserted records for creating app", insertedRecords[0]);
                callback(null, insertedRecords[0]);
            }
        });
    });
};

module.exports = new Util();
