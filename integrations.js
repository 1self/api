'use strict';
var q = require('q');

var hitDatabaseAndCache = function(redis, mongo, logger){
	var query = {
        approved: true,
        active: true
    };

	mongo.find('registeredApps', query)
    .then(function(apps){
    	// caches integrations for 24 hours
    	logger.silly('getting integrations from database, ', query);
    	redis.set('integrations', JSON.stringify(apps), 'NX', 'EX', 60 * 60 * 24 * 7);
    });
};

var getIntegrations = function(redis, mongo, logger){
	var redisClientGet = q.nbind(redis.get, redis);

	return redisClientGet('integrations')
	.then(function(response){
		if(!response){
			return hitDatabaseAndCache(redis, mongo, logger);
		}

		return JSON.parse(response);
	});
};

module.exports.getIntegrations = getIntegrations;