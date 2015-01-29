var q = require('q');
var request = require('request');
var CONTEXT_URI = process.env.CONTEXT_URI;

var githubOAuth = {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackUrl: CONTEXT_URI + "/auth/github/callback",
    getEmailAddresses: function (accessToken) {
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
    }
};

var facebookOAuth = {
    clientId: "454452498039912",
    clientSecret: "8d1ec3eb775bda7ca2f3157c5efbce75",
    callbackUrl: CONTEXT_URI + "/auth/facebook/callback",
    getProfilePictureUrl: function (userId, accessToken) {
        var deferred = q.defer();
        var options = {
            url: "https://graph.facebook.com?id=" + userId
                + "&fields=picture&access_token=" + accessToken,
            headers: {
                "User-Agent": "1self Localhost"
            }
        };
        request(options, function (err, res, body) {
            if (!err) {
                var picture = JSON.parse(body);
                deferred.resolve(picture.data.url);
            }
            else {
                deferred.reject(err);
            }
        });
        return deferred.promise;
    }
};

exports.githubOAuth = githubOAuth;
exports.facebookOAuth = facebookOAuth;