var githubStrategy = require('passport-github').Strategy;


var GITHUB_CLIENT_ID = "cc6753d5fc88fa5bcdef"
var GITHUB_CLIENT_SECRET = "80068a017d434fc51a190206e0ec798a3bb1b1bf";

module.exports = function(app, passport) {
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
			console.log("User profile :: ", profile.username);
			return done(null, profile);
		}
	));
	app.use(passport.initialize());
	app.use(passport.session());

	app.get('/auth/github', passport.authenticate('github'));

	app.get('/auth/github/callback', passport.authenticate('github', {
		failureRedirect: '/signup'
	}), function(req, res) {
		console.log("Inside redirect callback ");
		res.redirect('/dashboard');
	});
};