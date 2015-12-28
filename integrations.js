'use strict';
var q = require('q');
var _ = require('lodash');

var hitDatabaseAndCache = function(redis, mongo, logger){
	var query = {
        approved: true,
        active: true
    };

	return mongo.find('registeredApps', query)
    .then(function(apps){
    	// caches integrations for 24 hours
    	logger.silly('getting integrations from database, ', query);
    	var integrationsDict = {};

    	_.forEach(apps, function(app){
    		integrationsDict[app._id] = app;
    	});
    	redis.set('integrations', JSON.stringify(integrationsDict), 'NX', 'EX', 60 * 60 * 24 * 7);
    	return integrationsDict;
    });
};

var getIntegrations = function(redis, mongo, logger){
	var getFromCache = q.nbind(redis.get, redis);

	return getFromCache('integrations')
	.then(function(response){
		if(!response){
			return hitDatabaseAndCache(redis, mongo, logger);
		}

		return JSON.parse(response);
	});
};

module.exports.getIntegrations = getIntegrations;