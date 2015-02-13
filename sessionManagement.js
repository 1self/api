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
        if (req.url.split('?')[1] !== undefined) {
            res.redirect(CONTEXT_URI + "/signup" + "?" + req.url.split('?')[1]);
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


exports.resetSession = function(req){
    req.session.auth = null;
    req.session.intent = null;
    req.session.oneselfUsername = null;
    req.session.username = null;
    req.session.githubUsername = null;
    req.session.avatarUrl = null;
};
