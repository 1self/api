var mongoRepository = require('./mongoRepository.js');
var Q = require('q');
var request = Q.denodeify(require('request'));
var fs = require('fs');

var log = function(message) {
    message = "\n" + new Date() + ": " + message;
    console.log(message);
    fs.appendFile('stream_callback_hit.log', message, function(err) {

    });
};

var hitStreamCallbacks = function() {
    log("Starting sync");
    mongoRepository.find('stream', {
            'callbackUrl': {
                '$ne': null
            }
        })
        .then(replaceTemplateVars)
        .then(hitCallbackUrls)
        .then(function() {
            log("Sync Ended \n\n\n\n");
        });
};

var replaceTemplateVars = function(streams) {
    var deferred = Q.defer();
    var callbackUrls = [];
    streams.forEach(function(stream) {
        if (null == stream || !stream.callbackUrl) return;
        var requestData = {},
            url = stream.callbackUrl;

        url = url.replace("{{latestSyncField}}", encodeURIComponent(stream.latestSyncField));
        url = url.replace("{{streamid}}", stream.streamid);

        requestData.callbackUrl = url;
        requestData.writeToken = stream.writeToken;

        callbackUrls.push(requestData);
    });
    deferred.resolve(callbackUrls);
    return deferred.promise;
};

var delayedRequest = function(url, writeToken) {
    var options = {
        url: url,
        headers: {
            'Authorization': writeToken
        },
        method: 'GET'
    };

    return Q.delay(10000).then(function() {
        return request(options);
    });
};

var hitCallbackUrls = function(urls) {
    return urls.reduce(function(acc, url, index) {
        return acc
            .then(function() {
                return delayedRequest(url.callbackUrl, url.writeToken);
            })
            .then(function(res) {
                log("Done executing " + url + " with response " + res);
            })
            .catch(function(err) {
                log("Error for url: " + url + " error was : " + err);
            });
    }, Q.resolve())
};

hitStreamCallbacks();
setInterval(hitStreamCallbacks, 18000000);