var util = require('./util.js');
var _ = require("underscore");

exports.validate = function (req, res, next) {
    if (req.headers["content-type"] !== "application/json") {
        res.send(400, {message: "Invalid content type, are you missing application/json?"});
    } else {
        next();
    }
};

exports.validateStreamIdAndReadToken = function (req, res, next) {
    var readToken = req.headers.authorization; // REST endpoint has readToken in headers
    var streamId = req.params.streamId;
    if (_.isEmpty(readToken)) {
        readToken = req.query.readToken; // website has readToken in query params
    }
    util.streamExists(streamId, readToken)
        .then(function (streamFound) {
            if (!streamFound) {
                res.status(401).send("It looks like you are using an old version of the app. Please upgrade the app to see your visualizations.");
            }
            next();
        }, function (err) {
            console.error(err);
            res.status(500).send({message: "Error while validating streamId/readToken combination"});
        });
};

exports.validateDateRange = function(req, res, next) {
    var result = "";
    var error = false;

    if(req.query.from === undefined){
        result += " a from date (in UTC) is required (&from=20150115T10:00:00.000Z)\n";
        error = true;
    }
    if(req.query.to === undefined){
        result += " a to date (in UTC) is required (&to=20150115T10:00:00.000Z)\n";
        error = true;
    }

    if(error === true){
        res.status(400).send(result);
    }

    next();
}
