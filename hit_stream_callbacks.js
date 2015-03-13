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
            log("Sync Ended \n\n\n\n");
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
    var totalUrls = urls.length;
    log("Total urls to hit: " + totalUrls);
    var deferred = Q.defer();
    var requests = [];

    urls.reduce(function(acc, url, index){
        return acc
            .then(function(){
                return request(url.callbackUrl, url.writeToken);
            })
            .then(function(){
                if(index === totalUrls - 1) {
                    log("Finished processing all urls.");
                    deferred.resolve();
                }
            })
            .catch(function(){
                console.log("Error for url: " + url);
            });
    }, Q.resolve())

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

    setTimeout(function(){
        requestModule(options, function (err, resp, body) {
            if(!err){
                log("Response for " + url + " is : " + resp.statusCode);
            }else{  
                log("Error for  " + url + " is: " + err);
            }
            deferred.resolve(resp);
        })
    }, 20000);

    return deferred.promise;
};



hitStreamCallbacks();
setInterval(hitStreamCallbacks, 18000000);
