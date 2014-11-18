exports.validate = function (req, res, next) {
    if (req.headers["content-type"] !== "application/json"){
        res.send(400, {message: "Invalid content type, are you missing application/json?"});
    } else {
        next();
    }
};
