var crypto = require('crypto');


exports.encryptUsername = function(username) {
    return crypto.createHash('sha256').update(username).digest('hex')
};	