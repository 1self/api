'use strict';
var _ = require('lodash');

var getEmail = function(user){
	var result;
	if(user.profile.provider === 'facebook'){
		result = user.profile.emails[0].value;
	}
	else if(user.profile.provider === 'github'){
		var email = _(user.profile.emails).find(function(e){
			return e.primary;
		});

		result = email.email;
	}

	return result;
};

module.exports.getEmail = getEmail;

