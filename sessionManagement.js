exports.requiresSession = function(req, res, next) {
	// console.log("in requiresSession: req.session.username: " + req.session.username + " req.session.githubUsername : " + req.session.githubUsername);
	if (req.session.username) {
		next();
	} else if (req.session.githubUsername) {
		res.redirect("/claimUsername?username=" + req.session.githubUsername);
	} else {
		req.session.redirectUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
		console.log("req.session.redirectUrl: ",req.session.redirectUrl);
		res.redirect("/signup");
	}
};