var githubStrategy = require('passport-github').Strategy;

console.log("GITHUB_CLIENT_ID : " + process.env.GITHUB_CLIENT_ID);
console.log("GITHUB_CLIENT_SECRET : " + process.env.GITHUB_CLIENT_SECRET);

var GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
var GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

// production
// var GITHUB_CLIENT_ID = "6d5e909097263fcfb218"
// var GITHUB_CLIENT_SECRET = "f1a1135bc128f99f83aa7d5614bdecc284a4210b";
// localhost
// var GITHUB_CLIENT_ID = "cc6753d5fc88fa5bcdef"
// var GITHUB_CLIENT_SECRET = "80068a017d434fc51a190206e0ec798a3bb1b1bf";

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
			callbackURL: "http://localhost:5000/auth/github/callback"
			// callbackURL: "http://app.quantifieddev.org/auth/github/callback"
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