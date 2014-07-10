var request = require("request");

var githubStrategy = require('passport-github').Strategy;

var GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
var GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
var CONTEXT_URI = process.env.CONTEXT_URI;

module.exports = function(app, passport) {

	var handleGithubCallback = function(req, res) {
		var qdDb = app.getQdDb();
		var githubUser = req.user.profile;
		var githubUserAccessToken = req.user.accessToken;

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
			var options = {
				url: "https://api.github.com/user/emails?access_token=" + githubUserAccessToken,
				headers: {
					"User-Agent": "Quantified Dev Localhost"
				},
			};
			request(options, function(err, res, body) {
				if (!err) {
					var userEmails = JSON.parse(body);
					for (var i in userEmails) {
						githubUser.emails.push(userEmails[i]);
					}
					var githubUserRecord = {
						githubUser: githubUser
					}
					qdDb.collection('users').insert(githubUserRecord, function(err, insertedRecords) {
						if (err) {
							res.status(500).send("Database error");
						} else {
							req.session.githubUsername = githubUser.username;
							console.log("github login done, redirecting to claimUsername " + req.session.githubUsername);
							redirect(githubUser, "/claimUsername");
						}
					});
				} else {
					res.status(500).send("Could not fetch email addresses for user.");
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
				req.session.username = user.username;
				req.session.githubUsername = user.githubUser.username;
				redirect(user, "/dashboard");
			} else {
				req.session.githubUsername = user.githubUser.username;
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
			var githubProfile = {
				profile: profile,
				accessToken: accessToken
			};
			return done(null, githubProfile);
		}
	));
	app.use(passport.initialize());
	app.use(passport.session());

	app.get('/auth/github', passport.authenticate('github', {
		scope: 'user:email'
	}));

	app.get('/auth/github/callback', passport.authenticate('github', {
		failureRedirect: '/signup'
	}), handleGithubCallback);
};