var CONTEXT_URI = process.env.CONTEXT_URI;

var _ = require('underscore');

var IntentManager = function () {
};

IntentManager.prototype.process = function (intent, req, res) {

    var redirect = function (url) {
        console.log("And CONTEXT URI IS ->", CONTEXT_URI);
        res.redirect(CONTEXT_URI + url + "?username=" + req.session.oneselfUsername);
    };

    if (_.isEmpty(intent)) {
        res.redirect("/dashboard");
    } else {
        var intentName = intent.name;
        var intentData = intent.data;
        console.log("intentName -#-#->", intentName);
        console.log("intentData -#-#->", intentData);
        if (intentName === "website_signup") {
            res.redirect(intentData.url);
        }
        else if (intentName === "website_login") {
            res.redirect("/dashboard");
        } else if (intentName === "chart.comment") {
            res.redirect(intentData.url);
        } else if (intentName === "session.redirect") {
            res.redirect(intentData.url);
        }
        else {
            redirect("/dashboard");
        }
    }
};

IntentManager.prototype.handleError = function (errorCode, req, res) {
    if (errorCode === "invalid_username") {
        res.redirect('/unknownLogin');
    } else if (errorCode === "auth_exists_cant_signup") {
        res.redirect('/signupError');
    } else {
        console.log("Error occurred", errorCode);
        res.send(400, "Error occurred");
    }
}

module.exports = new IntentManager();
