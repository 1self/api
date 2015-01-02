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

var find = function (collection, query, projection) {
    var deferred = q.defer();
    mongoDbConnection(function (qdDb) {
        qdDb.collection(collection).find(query, projection, function (err, documents) {
            if (err) {
                console.err(err);
                deferred.reject(err);
            } else {
                deferred.resolve(documents.toArray());
            }
        });
    });
    return deferred.promise;
};

function defaultFor(arg, val) {
    return typeof arg !== 'undefined' ? arg : val;
}

var findOne = function (collection, query, projection) {
    var deferred = q.defer();
    projection = defaultFor(projection, {});
    mongoDbConnection(function (qdDb) {
        qdDb.collection(collection).findOne(query, projection, function (err, document) {
            if (err) {
                console.err(err);
                deferred.reject(err);
            } else {
                deferred.resolve(document);
            }
        });
    });
    return deferred.promise;
};

var update = function (collection, query, updateObject) {
    var deferred = q.defer();
    mongoDbConnection(function (qdDb) {
        qdDb.collection(collection).update(query, updateObject, function (err, updateCount) {
            if (err) {
                console.err(err);
                deferred.reject(err);
            } else {
                deferred.resolve(updateCount);
            }
        });
    });
    return deferred.promise;
};

exports.insert = insert;
exports.find = find;
exports.findOne = findOne;
exports.update = update;
