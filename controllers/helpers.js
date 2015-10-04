/*jslint node: true */
'use strict';

var createIntegrationUriWithRedirect = function(integrationUrl, contextUri, username, regToken) {
	var result = integrationUrl + '?redirect_uri=' + 
		encodeURIComponent(contextUri + '/integrations') +
		'&username=' + username + 
		'&token=' + regToken;
	return result;
};

module.exports.createIntegrationUriWithRedirect = createIntegrationUriWithRedirect;