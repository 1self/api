var mongoDbConnection = require('./lib/connection.js');
var q = require('q');

function defaultFor(arg, val) {
    return typeof arg !== 'undefined' ? arg : val;
}

var insert = function (collection, document, logger) {
    var deferred = q.defer();
    mongoDbConnection(function (qdDb) {
        qdDb.collection(collection).insert(document, function (err, result) {
            if (err) {
                console.error(err);
                deferred.reject(err);
            } else {
                if(logger){
                    logger.debug(JSON.stringify(result));
                }
                deferred.resolve(result.ops[0]);
            }
        });
    });
    return deferred.promise;
};

var find = function (collection, query, projection) {
    var deferred = q.defer();
    projection = defaultFor(projection, {});
    mongoDbConnection(function (qdDb) {
        qdDb.collection(collection).find(query, projection, function (err, documents) {
            if (err) {
                console.error(err);
                deferred.reject(err);
            } else {
                documents.toArray(function (err, docs) {
                    deferred.resolve(docs);
                });
            }
        });
    });
    return deferred.promise;
};

var findLimit = function (collection, query, projection, limit) {
    var deferred = q.defer();
    projection = defaultFor(projection, {});
    mongoDbConnection(function (qdDb) {
        qdDb.collection(collection).find(query, projection).limit(limit).toArray(function (err, documents) {
            if (err) {
                console.error(err);
                deferred.reject(err);
            } else {
                deferred.resolve(documents);
            }
        });
    });
    return deferred.promise;
};

var findOne = function (collection, query, projection) {
    var deferred = q.defer();
    projection = defaultFor(projection, {});
    mongoDbConnection(function (qdDb) {
        qdDb.collection(collection).findOne(query, projection, function (err, document) {
            if (err) {
                console.error(err);
                deferred.reject(err);
            } else {
                deferred.resolve(document);
            }
        });
    });
    return deferred.promise;
};

var findAndRemove = function (collection, query, projection) {
    var deferred = q.defer();
    mongoDbConnection(function (qdDb) {
        var options = {
            projection: projection
        };
        qdDb.collection(collection).findOneAndDelete(query, options, function (err, document) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(document.value);
            }
        });
    });
    return deferred.promise;
};

var count = function (collection, query) {
    var deferred = q.defer();
    mongoDbConnection(function (qdDb) {
        qdDb.collection(collection).count(query, function (err, count) {
            if (err) {
                console.error(err);
                deferred.reject(err);
            } else {
                deferred.resolve(count);
            }
        });
    });
    return deferred.promise;
};

var update = function (collection, query, updateObject, options) {
    var deferred = q.defer();
    options = defaultFor(options, {});
    mongoDbConnection(function (qdDb) {
        qdDb.collection(collection).update(query, updateObject, options, function (err, updateCount) {
            if (err) {
                console.error(err);
                deferred.reject(err);
            } else {
                deferred.resolve(updateCount);
            }
        });
    });
    return deferred.promise;
};

var remove = function (collection, query, options) {
    var deferred = q.defer();
    options = defaultFor(options, {});
    mongoDbConnection(function (qdDb) {
        qdDb.collection(collection).remove(query, options, function (err, removeCount) {
            if (err) {
                console.error(err);
                deferred.reject(err);
            } else {
                deferred.resolve(removeCount);
            }
        });
    });
    return deferred.promise;
};

exports.insert = insert;
exports.find = find;
exports.findOne = findOne;
exports.update = update;
exports.count = count;
exports.remove = remove;
exports.findAndRemove = findAndRemove;
exports.findLimit = findLimit;