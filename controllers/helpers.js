/*jslint node: true */
'use strict';

var createIntegrationUriWithRedirect = function(integrationUrl, contextUri) {
	var result = integrationUrl + '?redirect_uri=' + encodeURIComponent(contextUri + '/integrations');
	return result;
};

module.exports.createIntegrationUriWithRedirect = createIntegrationUriWithRedirect;