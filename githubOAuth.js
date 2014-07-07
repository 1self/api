var githubStrategy = require('passport-github').Strategy;


var GITHUB_CLIENT_ID = "cc6753d5fc88fa5bcdef"
var GITHUB_CLIENT_SECRET = "80068a017d434fc51a190206e0ec798a3bb1b1bf";

module.exports = function(app, passport) {
	console.log("Oauth config initialized")
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
		},
		function(accessToken, refreshToken, profile, done) {
			console.log("accessToken :: ", accessToken);
			console.log("refreshToken :: ", refreshToken);
			return done(null, profile);
		}
	));
	app.use(passport.initialize());
	app.use(passport.session());

	app.get('/auth/github', passport.authenticate('github'));

	app.get('/auth/github/callback', passport.authenticate('github', {
		failureRedirect: '/signup'
	}), function(req, res) {
		res.redirect('/dashboard');
	});
};