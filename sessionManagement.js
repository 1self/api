var CONTEXT_URI = process.env.CONTEXT_URI;

exports.requiresSession = function (req, res, next) {
    if (req.session.encodedUsername) {
        res.cookie('_eun', req.session.encodedUsername);
        next();
    } else {
        req.session.redirectUrl = CONTEXT_URI + req.originalUrl;
        if (req.url.split('?')[1] !== undefined) {
            var intent = "session.redirect";
            var redirectUrl = CONTEXT_URI + req.url;
            res.redirect(CONTEXT_URI + "/signup" + "?intent=" + intent + "&redirectUrl=" + encodeURIComponent(redirectUrl));
        } else {
            res.redirect(CONTEXT_URI + "/signup");
        }
    }
};

exports.setSession = function (req, res, user) {
    req.session.username = user.username;
    req.session.encodedUsername = user.encodedUsername;
    req.session.githubUsername = user.githubUser.username;
    req.session.avatarUrl = user.githubUser._json.avatar_url;
    res.cookie('_eun', req.session.encodedUsername);
};


exports.resetSession = function (req) {
    req.session.destory;
    req.session.encodedUsername = null;
    req.session.auth = null;
    req.session.intent = null;
    req.session.oneselfUsername = null;
    req.session.username = null;
    req.session.githubUsername = null;
    req.session.avatarUrl = null;
};
