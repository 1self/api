var passport = require('passport');
var githubStrategy = require('passport-github').Strategy;

var GITHUB_CLIENT_ID = "cc6753d5fc88fa5bcdef"
var GITHUB_CLIENT_SECRET = "80068a017d434fc51a190206e0ec798a3bb1b1bf";


passport.use(new githubStrategy({
    clientID: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    callbackURL: "http://localhost:5000/auth/github/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    console.log("accessToken :: ",accessToken);
    console.log("accessToken :: ",refreshToken);
  }
));
 
