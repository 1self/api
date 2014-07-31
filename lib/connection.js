var Connection = require('mongodb').Connection;
var mongoClient = require('mongodb').MongoClient;
//the MongoDB connection
var connectionInstance;

var mongoUri = process.env.DBURI;

module.exports = function(callback) {
    //if already we have a connection, don't connect to database again
    if (connectionInstance) {
        callback(connectionInstance);
        return;
    }

    mongoClient.connect(mongoUri, function(err, databaseConnection) {
        if (err) {
            console.log(err);
        } else {
            connectionInstance = databaseConnection;
            callback(databaseConnection);
        }
    });

};
