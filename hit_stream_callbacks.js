process.env.DBURI = "mongodb://127.0.0.1:27017/quantifieddev";

var mongoDbConnection = require('./lib/connection.js');
var mongoRespository = require('./mongoRepository.js');
var requestModule = require('request');
var fs = require('fs');

var log = function(message){
    message = "\n" + message;
    fs.appendFile('stream_callback_hit.log', message, function (err) {

    });
};


var hitStreamCallbacks = function(){
    log("Starting sync at: " + new Date());
    mongoDbConnection(function (qdDb) {
        qdDb.collection('stream').find({}).each(function(err, doc){
            if(null == doc || !doc.callbackUrl) {
                log("Nothing to process for: " + JSON.stringify(doc));
                return;
            }
            
            var url = doc.callbackUrl,
            headers = {"Authorization": doc.writeToken};

            url = url.replace("[[latestSyncField]]", doc.latestSyncField);
            url = url.replace("[[streamid]]", doc.streamid);
       
            log("Request URL: " + url);

            var requestDetails = {
                url: url,
                method: 'GET',
                headers: headers
            };

            requestModule(requestDetails, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    log("Processing successfull for Stream: " + doc.streamid);
                } else {
                    log("FAILED SYNC for Stream: " + url + "with error " + error + " &&&&&&&&&& response body: " + body);
                }
            });
        });
    });
};


setInterval(hitStreamCallbacks, 3600000);
