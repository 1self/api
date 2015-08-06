var q = require('q');

//var Connection = require('mongodb').Connection;
var mongoClient = require('mongodb').MongoClient;
//the MongoDB connection
var eventDbInstance;
var eventDbUri = process.env.EVENTDBURI;
console.log("mongo uri is: " + process.env.EVENTDBURI);

var eventDbConnection = function(callback) {
    //if already we have a connection, don't connect to database again
    if (eventDbInstance) {
        callback(eventDbInstance);
        return;
    }

    mongoClient.connect(eventDbUri, function(err, databaseConnection) {
        console.log("mongoc: " + err + " " + databaseConnection)
        if (err) {
            console.log(err);
        } else {
            eventDbInstance = databaseConnection;
            callback(databaseConnection);
        }
    });

};

function defaultFor(arg, val) {
    return typeof arg !== 'undefined' ? arg : val;
}

var insert = function (collection, document) {
    var deferred = q.defer();
    eventDbConnection(function (eventDb) {
        eventDb.collection(collection).insert(document, 
            {continueOnError: true},
            function (err, insertedRecords) {
            console.log("response from event db: " + err);
            if (err && err.code !== 11000) {
                console.err(err);
                deferred.reject(err);
            } 
            else {
                if(err && err.code === 11000){
                    console.log("batch included some duplicates");
                    if(insertedRecords === null)
                    {
                        deferred.resolve();
                    }
                    else if(insertedRecords.length){
                        deferred.resolve(insertedRecords[0]);
                    }
                    else{
                        deferred.resolve(insertedRecords);   
                    }
                }
            }
        });
    });
    return deferred.promise;
};

var find = function (collection, query, projection) {
    var deferred = q.defer();
    projection = defaultFor(projection, {});
    eventDbConnection(function (eventDb) {
        eventDb.collection(collection).find(query, projection, function (err, documents) {
            if (err) {
                console.err(err);
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

var findOne = function (collection, query, projection) {
    var deferred = q.defer();
    projection = defaultFor(projection, {});
    eventDbConnection(function (eventDb) {
        eventDb.collection(collection).findOne(query, projection, function (err, document) {
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

var count = function (collection, query) {
    var deferred = q.defer();
    eventDbConnection(function (eventDb) {
        eventDb.collection(collection).count(query, function (err, count) {
            if (err) {
                console.err(err);
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
    eventDbConnection(function (eventDb) {
        eventDb.collection(collection).update(query, updateObject, options, function (err, updateCount) {
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

var remove = function (collection, query, options) {
    var deferred = q.defer();
    options = defaultFor(options, {});
    eventDbConnection(function (eventDb) {
        eventDb.collection(collection).remove(query, options, function (err, removeCount) {
            if (err) {
                console.err(err);
                deferred.reject(err);
            } else {
                deferred.resolve(removeCount);
            }
        });
    });
    return deferred.promise;
};

var aggregate = function (collection, pipeline, options) {
    var deferred = q.defer();
    options = defaultFor(options, {});
    eventDbConnection(function (eventDb) {
        eventDb.collection(collection).aggregate(pipeline, options, function (err, docs) {
            if (err) {
                console.err(err);
                deferred.reject(err);
            } else {
                deferred.resolve(docs);
            }
        });
    });
    return deferred.promise;
};

exports.aggregate = aggregate;
exports.insert = insert;
exports.find = find;
exports.findOne = findOne;
exports.update = update;
exports.count = count;
exports.remove = remove;
