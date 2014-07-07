var githubStrategy = require('passport-github').Strategy;


var GITHUB_CLIENT_ID = "6d5e909097263fcfb218"
var GITHUB_CLIENT_SECRET = "f1a1135bc128f99f83aa7d5614bdecc284a4210b";

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
			callbackURL: "http://app.quantifieddev.org/auth/github/callback"
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