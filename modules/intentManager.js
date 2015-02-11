var IntentManager = function () {
};

IntentManager.prototype.process = function (intent, req, res) {
    var intentName = intent.name;
    var intentData = intent.data;

    if (intentName === "website_signup") {
        res.redirect("http://1self.co/confirmation.html");
    } else if (intentName === "chart.comment") {
        res.redirect(intentData.url);
    }
};

module.exports = new IntentManager();
