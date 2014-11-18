var mongoDbConnection = require('./lib/connection.js');
var _ = require("underscore");

exports.validate = function (req, res, next) {
    if (req.headers["content-type"] !== "application/json"){
        res.send(400, {message: "Invalid content type, are you missing application/json?"});
    } else {
        next();
    }
};

exports.validateStreamIdAndReadToken = function(req, res, next) {
    var readToken = req.headers.authorization;
    if (_.isEmpty(readToken)) {
        readToken  = req.query.readToken;
    }

    var spec = {
        streamid: req.params.streamId
    };
    mongoDbConnection(function (qdDb) {
        qdDb.collection('stream').find(spec, function (err, docs) {
            docs.toArray(function (err, streamArray) {
                var stream = streamArray[0] || {};
                if (stream.readToken !== readToken) {
                    // TODO Throw error when it's invalid streamId/readToken combination.
                    console.log("\nWARNING: Invalid streamId/readToken combination; still continuing\n");
                    next();
                    // res.send(400, {message: "Invalid stream/readToken combination"});
                } else {
                    console.log("\nValid stream/readToken combination\n");
                    next();
                }
            });
        });
    });
};
