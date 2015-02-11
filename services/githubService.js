var request = require("request");
var q = require('q');

exports.fetchGithubUserEmails = function (accessToken) {
    var deferred = q.defer();
    var options = {
        url: "https://api.github.com/user/emails?access_token=" + accessToken,
        headers: {
            "User-Agent": "Quantified Dev Localhost"
        }
    };
    request(options, function (err, res, body) {
        if (!err) {
            deferred.resolve(JSON.parse(body));
        }
        else {
            deferred.reject(err);
        }
    });
    return deferred.promise;
};
