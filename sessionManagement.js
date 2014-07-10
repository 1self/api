exports.requiresSession = function(req, res, next) {
	// console.log("in requiresSession: req.session.username: " + req.session.username + " req.session.githubUsername : " + req.session.githubUsername);
	if (req.session.username) {
		console.log("calling the next function in line...");
		next();
	} else if (req.session.githubUsername) {
		res.redirect("/claimUsername?username=" + req.session.githubUsername);
	} else {
		res.redirect("/signup");
	}
};