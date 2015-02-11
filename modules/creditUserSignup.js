var mongoRepository = require('../mongoRepository.js');
var q = require('q');

var CreditUserSignup = function () {
};

CreditUserSignup.prototype.creditUserSignUpToApp = function (oneSelfUsername, url) {
    var deferred = q.defer();

    var attributeUserToApp = function (stream) {
        var appId = stream.appId;
        var byAppId = {
                "appId": appId
            },
            updateObject = {
                "$push": {
                    "users": oneSelfUsername
                }
            };
        mongoRepository.update('registeredApps', byAppId, updateObject)
            .then(function () {
                console.log("New user " + oneSelfUsername + " assigned to: " + appId);
                deferred.resolve();
            }).catch(function (error) {
                console.log('Error', error);
                deferred.reject(error);
            });
    };

    var mapUserAndAppUsingStream = function () {
        if (url.match("/v1/streams")) {
            var tokenisedUrl = url.split("/"),
                byStreamId = {
                    "streamid": tokenisedUrl[5]
                };
            mongoRepository.findOne('stream', byStreamId)
                .then(attributeUserToApp).catch(function (error) {
                    console.log('Error', error);
                    deferred.reject(error);
                });

        } else {
            deferred.resolve();
        }
    };

    //main
    mapUserAndAppUsingStream();

    return deferred.promise;
}; //end creditUserSignUpToApp


module.exports = new CreditUserSignup();
