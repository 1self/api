var requestModule = require('request');
var Q = require('q');

module.exports = function () {
    var qdUri = process.env.QD_URI;

    this.registerStream = function () {
        var deferred = Q.defer();
        console.log("Registering stream...");
        var options = {
            url: qdUri + '/stream'
        };
        requestModule.post(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                deferred.resolve(JSON.parse(body));
            } else {
                deferred.reject(error);
            }
        });
        return deferred.promise;
    };

    this.sendBatchEvents = function (pushEvents, streamid, writeToken) {
        var deferred = Q.defer();
        console.log("Events to send: ", pushEvents);
        var options = {
            url: qdUri + '/stream/' + streamid + '/batch',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': writeToken
            },
            json: pushEvents
        };
        requestModule.post(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                deferred.resolve(JSON.parse(body));
            } else {
                deferred.reject(error);
            }
        });
        deferred.resolve(pushEvents);
        return deferred.promise;
    };
};
