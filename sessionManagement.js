var CONTEXT_URI = process.env.CONTEXT_URI;

exports.requiresSession = function (req, res, next) {
    if (req.session.encodedUsername) {
        res.cookie('_eun', req.session.encodedUsername);
        next();
    } else if (req.session.githubUsername) {
        if (req.url.indexOf('claimUsername') > -1) {
            next();
        } else {
            res.redirect(CONTEXT_URI + "/claimUsername?username=" + req.session.githubUsername);
        }
    } else {
        req.session.redirectUrl = CONTEXT_URI + req.originalUrl;
        res.redirect(CONTEXT_URI + "/signup" + "?" + req.url.split('?')[1]);
    }
};
