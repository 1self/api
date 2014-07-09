var githubStrategy = require('passport-github').Strategy;

var GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
var GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
var CONTEXT_URI = process.env.CONTEXT_URI;

module.exports = function(app, passport) {

	var handleGithubCallback = function(req, res) {
		var qdDb = app.getQdDb();
		var githubUser = req.user;
		console.log("githubUser " + JSON.stringify(githubUser));

		var isNewUser = function(user) {
			return !user;
		};
		var isUserRegisteredWithOneself = function(user) {
			return user && user.username;
		};
		var redirect = function(user, url) {
			res.redirect(url + "?username=" + user.username);
		};
		var insertGithubProfileInDb = function() {
			var githubUserRecord = {
				githubUser: githubUser
			}
			qdDb.collection('users').insert(githubUserRecord, function(err, insertedRecords) {
				if (err) {
					res.status(500).send("Database error");
				} else {
					redirect(githubUser, "/claimUsername");
				}
			});
		};

		var byGitHubUsername = {
			"githubUser.username": githubUser.username
		};
		qdDb.collection('users').findOne(byGitHubUsername, function(err, user) {
			if (isNewUser(user)) {
				insertGithubProfileInDb();
			} else if (isUserRegisteredWithOneself(user)) {
				redirect(user, "/dashboard");
			} else {
				redirect(githubUser, "/claimUsername");
			}
		});
	};

	passport.serializeUser(function(user, done) {
		done(null, user);
	});

	passport.deserializeUser(function(obj, done) {
		done(null, obj);
	});

	passport.use(new githubStrategy({
			clientID: GITHUB_CLIENT_ID,
			clientSecret: GITHUB_CLIENT_SECRET,
			callbackURL: CONTEXT_URI + "/auth/github/callback"
		},
		function(accessToken, refreshToken, profile, done) {
			return done(null, profile);
		}
	));
	app.use(passport.initialize());
	app.use(passport.session());

	app.get('/auth/github', passport.authenticate('github'));

	app.get('/auth/github/callback', passport.authenticate('github', {
		failureRedirect: '/signup'
	}), handleGithubCallback);
};