var mongoClient = require('mongodb').MongoClient;
var _ = require('underscore');

var mongoUri = "";

mongoClient.connect(mongoUri, function (err, qdDb) {

    qdDb.collection('users').find({}, function (err, results) {
        results.toArray(function (err, data) {
            _.each(data, function (element) {
                console.log("Element is", element.githubUser.githubStreamId);
                qdDb.collection('users').update(
                    { "githubUser.githubStreamId": element.githubUser.githubStreamId },
                    { $pull: { "streams": {"streamid": element.githubUser.githubStreamId}}}
                    , function (err, res) {
                        console.log("Result ->", res)
                    });
            })
        })
    });

    qdDb.collection('users').update({ }, { $unset: { "githubUser.githubStreamId": "", "latestGitHubEventDate": ""} },  {multi: true}, function(err, data){
        console.log(err);
        console.log(data);
    });

});