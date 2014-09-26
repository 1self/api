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

    this.sendBatchEvents = function (pushEvents, writeToken) {
        var deferred = Q.defer();
        console.log("Events to send: ", pushEvents);
        //TODO: Implement bulk api in QD to accept batch events
        deferred.resolve(pushEvents);
        return deferred.promise;
    };
};
