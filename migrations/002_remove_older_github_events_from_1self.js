var mongoClient = require('mongodb').MongoClient;
var _ = require('underscore');

var mongoUri = "";

mongoClient.connect(mongoUri, function (err, qdDb) {

    qdDb.collection('oneself').remove( { "payload.source": "GitHub" }, function(err, data){
        console.log(err);
        console.log(data);
    });

});

