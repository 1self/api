var crypto = require('crypto');

exports.encodeUsername = function(username, callback) {
    var opts = {
        plaintext: username
    };
    hashPassword(opts, function(err, data) {
        var encObect = {
            encodedUsername: data.key,
            salt: data.salt
        };
        callback(null, encObect);
    });
};

var hashPassword = function(opts, callback) {
    if (!opts.salt) {
        return crypto.randomBytes(8, function(err, buf) {
            if (err) return callback(err);
            opts.salt = buf.toString('base64');
            return hashPassword(opts, callback);
        });
    }

    opts.iterations = opts.iterations || 10000;
    return crypto.pbkdf2(opts.plaintext, opts.salt, opts.iterations, 64, function(err, key) {
        if (err) {
            return callback(err);
        }
        opts.key = new Buffer(key).toString('base64');

        return callback(null, opts);
    });
};
