/*jslint node: true */
'use strict';
var assert = require('assert');


var helpers = require('./helpers.js');

// var assert = function(expected, actual, message){
// 	console.log('testing');
// 	if(expected === actual){
// 		console.log('passed: ', expected, actual, message);
// 	}
// 	else{
// 		console.log('failed: ', expected, actual, message);
// 		console.log('ex: ', expected);
// 		console.log('ac: ', actual);
// 		throw message;
// 	}
// };

var testRedirectUri = function(){
	var expected = 'http://int.example.com?redirect_uri=http%3A%2F%2Fcontext.example.com%2Fintegrations&username=testuser&token=abcdef';
	var actual = helpers.createIntegrationUriWithRedirect('http://int.example.com', 'http://context.example.com', 'testuser', 'abcdef');
	assert(expected, actual, 'create redirect');
};

testRedirectUri();