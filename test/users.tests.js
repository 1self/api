'use strict';

var assert = require('assert');
var userModule = require('../user.js');

// eas: these test cases are derived from going through the 
// users in the live database and looking at how their emails
// are set

describe('user', function() {
    it('facebook email', function() {
        var user = {
        	profile: {
        		provider: 'facebook',
        		emails: [
        			{value: 'test@example.com'}
        		]
        	}

        };

        assert.equal(userModule.getEmail(user), 'test@example.com');
    });

    it('primary private github email', function() {
        var user = {
        	profile: {
        		provider: 'github',
        		emails: [
        			{value: null},
        			{
						email : 'test1@example.com',
						primary: true,
						verified : true
					},
					{
						email : 'test2@example.com',
						primary: false,
						verified : true
					},
					{
						email : 'test3@example.com',
						primary: false,
						verified : true
					}
        		]
        	}

        };

        assert.equal(userModule.getEmail(user), 'test1@example.com');
    });

    it('primary private github email', function() {
        var user = {
        	profile: {
        		provider: 'github',
        		emails: [
        			{value: null},
        			{
						email : "test1@example.com",
						primary: true,
						verified : true
					},
					{
						email : "test2@example.com",
						primary: false,
						verified : true
					},
					{
						email : "test3@example.com",
						primary: false,
						verified : true
					}
        		]
        	}

        };

        assert.equal(userModule.getEmail(user), 'test1@example.com');
    });

    it('github primary does not match public', function() {
        var user = {
        	profile: {
        		provider: 'github',
        		emails: [
        			{value: 'public@example.com'},
        			{
						email : 'test1@example.com',
						primary: true,
						verified : true
					},
					{
						email : 'test2@example.com',
						primary: false,
						verified : true
					},
					{
						email : 'test3@example.com',
						primary: false,
						verified : true
					}
        		]
        	}

        };

        assert.equal(userModule.getEmail(user), 'test1@example.com');
    });

    it('github primary does not match public', function() {
        var user = {
        	profile: {
        		provider: 'github',
        		emails: [
        			{value: 'test1@example.com'},
        			{
						email : 'test1@example.com',
						primary: true,
						verified : true
					},
					{
						email : 'test2@example.com',
						primary: false,
						verified : true
					},
					{
						email : 'test3@example.com',
						primary: false,
						verified : true
					}
        		]
        	}

        };

        assert.equal(userModule.getEmail(user), 'test1@example.com');
    });
});