process.env.DBURI = "mongodb://127.0.0.1:27017/quantifieddev";

var mongoRepository = require('./mongoRepository.js');
var Q = require('q');
var requestModule = require('request');
var fs = require('fs');

var log = function(message){
    message = "\n" + new Date() + ": " + message;
    console.log(message);
    fs.appendFile('stream_callback_hit.log', message, function (err) {

    });
};


var hitStreamCallbacks = function(){
    log("Starting sync");
    mongoRepository.find('stream', {})
        .then(replaceTemplateVars)
        .then(hitCallbackUrls)
        .then(function() {
            log("Sync Ended");
        });
};

var replaceTemplateVars = function (streams) {
    var deferred = Q.defer();
    var callbackUrls = [];
    streams.forEach(function(stream){
        if(null == stream || !stream.callbackUrl) return;
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

var hitCallbackUrls = function (urls) {
    log("Total urls to hit: " + urls.length);
    var deferred = Q.defer();
    var requests = [];
    urls.forEach(function (url) {
        requests.push(request(url.callbackUrl, url.writeToken));
    });

    Q.all(requests).then(function () {
        deferred.resolve();
    }).catch(function (err) {
        log("Error occurred", err);
    });
    return deferred.promise;
};

var request = function (url, writeToken) {
    var deferred = Q.defer();
    var options = {
        url: url,
        headers: {
            'Authorization': writeToken
        },
        method: 'GET'
    };

    requestModule(options, function (err, resp, body) {
        if(!err){
            log("Response for " + url + " is : " + resp.statusCode);
        }else{  
            log("Error for  " + url + " is: " + err);
        }
        deferred.resolve(resp);
    });
    return deferred.promise;
};

hitStreamCallbacks();
setInterval(hitStreamCallbacks, 18000000);
