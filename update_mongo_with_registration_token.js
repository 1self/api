/*
index e1798e9..a30ea36 100644
--- a/lib/connection.js
+++ b/lib/connection.js
@@ -3,7 +3,7 @@ var mongoClient = require('mongodb').MongoClient;
 //the MongoDB connection
 var connectionInstance;
 
-var mongoUri = process.env.DBURI;
+var mongoUri = "mongodb://127.0.0.1:27017/quantifieddev";


node update_mongo_with_registration_token.js

*/


var crypto = require('crypto');
var mongoDbConnection = require('./lib/connection.js');
var mongoRespository = require('./mongoRepository.js');
var q = require('q');

var generateRegistrationToken = function () {
    var deferred = q.defer();
    crypto.randomBytes(16, function (ex, buf) {
        if (ex) {
            deferred.reject(ex);
        }
        var registrationToken = [];
        for (var i = 0; i < buf.length; i++) {
            var charCode = String.fromCharCode((buf[i] % 26) + 65);
            registrationToken.push(charCode);
        }
        console.log("Registration Token: ", registrationToken.join(''));
        deferred.resolve(registrationToken.join(''));
    });
    return deferred.promise;
};

var insertRegTokenforEachUser = function(callback){
    // mongoDbConnection(function (qdDb) {
    //     qdDb.collection('users').find({}, function(err, result) {
    //         console.log("resources :" + err + JSON.stringify(result));
    //         callback();
    //     })});

    // mongoRepository.update('users', {}, {great: true}, {multi: true}).then(function(count){
    //     console.log(count);
    // })


    // mongoDbConnection(function (qdDb) {
    //     qdDb.collection('users').update({}, {'$set': { lol: 'c' }}, {multi: true}, function(err, result) {
    //         console.log("Error: " + err + "result: " + result);
    //         callback();
    //     })});

    mongoDbConnection(function (qdDb) {
        qdDb.collection('users').find({}).each(function(err, doc){
            if(null == doc) return;
            generateRegistrationToken().then(function(token){
                qdDb.collection('users').update({_id: doc._id}, {'$set': { registrationToken: token }}, function(err, result){
                    console.log(err);
                });
            });
        });
    });
};


insertRegTokenforEachUser(function(){console.log("done")});
