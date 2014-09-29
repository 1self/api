var Q = require('q');

module.exports = function (mongoConnection) {
    this.mongoConnection = mongoConnection;

    this.findById = function (id) {
        console.log("Here's your record " + id);
        console.log("connection object is : " + this.mongoConnection);
    };

    this.findByGithubUsername = function (username) {
        var deferred = Q.defer();
        var query = {
            githubUsername: username
        };
        mongoConnection.collection('users').findOne(query, function (error, user) {
            if (error) {
                deferred.reject(error);
            } else {
                deferred.resolve(user);
            }
        });
        return deferred.promise;
    };

    this.insert = function (document) {
        var deferred = Q.defer();
        mongoConnection.collection('users').insert(document, function (error, numberOfDocsInserted) {
            if (error) {
                deferred.reject(error);
            } else {
                deferred.resolve(document);
            }
        });
        return deferred.promise;
    };

    this.update = function (findQuery, updateQuery) {
        var deferred = Q.defer();
        mongoConnection.collection('users', function (err, collection) {
            collection.update(findQuery, {
                $set: updateQuery
            }, {
                upsert: true
            }, function (error, data) {
                if (error) {
                    deferred.reject(error);
                } else {
                    deferred.resolve(data);
                }
            });
        });
        return deferred.promise;
    };

};
