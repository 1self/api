var mongoDbConnection = require('./lib/connection.js');
var q = require('q');

var insert = function (collection, document) {
    var deferred = q.defer();
    mongoDbConnection(function (qdDb) {
        qdDb.collection(collection).insert(document, function (err, insertedRecords) {
            if (err) {
                console.err(err);
                deferred.reject(err);
            } else {
                deferred.resolve(insertedRecords[0]);
            }
        });
    });
    return deferred.promise;
};

exports.insert = insert;
