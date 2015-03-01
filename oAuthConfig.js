var q = require('q');
var request = require('request');
var CONTEXT_URI = process.env.CONTEXT_URI;
var OAuthConfig = function () {
};

OAuthConfig.prototype.getGithubOAuthConfig = function () {
    return {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackUrl: CONTEXT_URI + "/auth/github/callback"
    };
};

OAuthConfig.prototype.getGithubEmailAddresses = function (accessToken) {
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

OAuthConfig.prototype.getFacebookOAuthConfig = function () {
    return {
        clientId: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackUrl: CONTEXT_URI + "/auth/facebook/callback"
    };
};

OAuthConfig.prototype.getFacebookProfilePictureUrl = function (userId, accessToken) {
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
            var pictureData = JSON.parse(body);
            deferred.resolve(pictureData.picture.data.url);
        }
        else {
            deferred.reject(err);
        }
    });
    return deferred.promise;
};

module.exports = new OAuthConfig();