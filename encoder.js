var crypto = require('crypto');
var Q = require('q');

var hashPassword = function (opts) {
    var deferred = Q.defer();
    crypto.pbkdf2(opts.plaintext, opts.salt, opts.iterations, 64, function (err, key) {
        if (err) {
            deferred.reject(err);
        }
        opts.key = new Buffer(key).toString('base64');
        deferred.resolve({ encodedUsername: opts.key, salt: opts.salt });
    });
    return deferred.promise;
};

exports.encodeUsername = function (username) {
    var salt = crypto.randomBytes(8).toString('base64');
    var opts = {
        salt: salt,
        plaintext: username,
        iterations: 10000
    };
    return hashPassword(opts);
};

