var crypto = require('crypto');


exports.encodeUsername = function (username, callback) {
    var opts = {
        plaintext: username
    }
    hashPassword(opts, function (err, data) {
        var encObect = {encodedUsername: data.key, salt: data.salt}
        callback(null, encObect);
    })
};



// generate a strong password hash (make sure you choose a salt

// or capture the salt randomly generated for you!)

// Source - https://coderwall.com/p/v_6n4g
var hashPassword = function (opts, callback) {

    // make sure some plaintext is present
    // if not make some up and call this method recursively

    if (!opts.plaintext) {
        return crypto.randomBytes(6, function (err, buf) {
            if (err) callback(err);
            opts.plaintext = buf.toString('base64');
            return hashPassword(opts, callback);
        })
    }

    // make sure a salt is present in input
    // if not make a salt up

    if (!opts.salt) {
        return crypto.randomBytes(8, function (err, buf) {
            if (err) return callback(err);
            opts.salt = buf.toString('base64');
            return hashPassword(opts, callback);

        })

    }

    // we use pbkdf2 to hash and iterate 10k times by default
    // hashed password is in opts.key in the callback

    opts.hash = 'sha1';

    opts.iterations = opts.iterations || 10000;
    return crypto.pbkdf2(opts.plaintext, opts.salt, opts.iterations, 64, function (err, key) {

        if (err) return callback(err);

        opts.key = new Buffer(key).toString('base64');

        return callback(null, opts);

    })

};