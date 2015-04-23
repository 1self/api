var mongoRepository = require('../mongoRepository.js');
var Q = require('q');
var _ = require("underscore");
var sessionManager = require("./../sessionManagement");

module.exports = function (app) {

    var getIntegrationDetails = function (integrationId) {
        var deferred = Q.defer();
        var byIntegrationId = {
            "urlName": integrationId
        };
        mongoRepository.findOne('registeredApps', byIntegrationId)
            .then(function (integrationDetailObject) {
                if (!(_.isEmpty(integrationDetailObject))) {
                    deferred.resolve(integrationDetailObject);
                }
                else {
                    deferred.reject("Integration not found");
                }
            }, function (err) {
                console.log("Error is", err);
                deferred.reject(err);
            });
        return deferred.promise;
    };

    var getAlreadyIntegratedIntegrationsForUser = function (username) {
        var deferred = Q.defer();
        var byUsername = {
            "username": username
        };
        mongoRepository.findOne('users', byUsername)
            .then(function (user) {
                deferred.resolve(user.integrations);
            }, function (err) {
                console.log("Error is", err);
                deferred.reject(err);
            });
        return deferred.promise;
    };

    var getActiveIntegrations = function () {
        var deferred = Q.defer();
        var query = {
            approved: true
        };
        mongoRepository.find('registeredApps', query)
            .then(function (integrations) {
                if (!(_.isEmpty(integrations))) {
                    deferred.resolve(integrations);
                }
                else {
                    deferred.reject("Integrations not found");
                }
            });
        return deferred.promise;
    };

    var separateIntegrationsAndApps = function(integrations) {
        var apps = [];
        var ints = [];
        _.map(integrations, function(integration){
            if(integration.type==="hosted"){
                ints.push(integration);
            }
            else {
                apps.push(integration);
            }
        });
        return {
            integrations: ints,
            apps: apps
        }
    };

    app.get("/integrations", sessionManager.requiresSession, function (req, res) {
        var totalIntegrationsIntegrated = 0;
        getActiveIntegrations()
            .then(function (integrations) {
                return _.collect(integrations, function (int) {
                    return {
                        title: int.title,
                        integrationId: int.urlName,
                        iconUrl: int.iconUrl,
                        bgColor: int.bgColor,
                        fgColor: int.fgColor,
                        appId: int.appId,
                        type: int.type
                    }
                })
            }).then(function (integrations) {
                var username = req.session.username;
                return getAlreadyIntegratedIntegrationsForUser(username)
                    .then(function (integrationsOfUser) {
                        return _.forEach(integrations, function (integration) {
                            integration.alreadyIntegrated = _.contains(integrationsOfUser, integration.appId);
                            if (integration.alreadyIntegrated) {
                                totalIntegrationsIntegrated++;
                            }
                        })
                    });
            }).then(function (integrations) {
                var separatedIntegrations = separateIntegrationsAndApps(integrations);
                var infoForIntegrations = {
                    integrations: separatedIntegrations.integrations,
                    apps: separatedIntegrations.apps,
                    totalIntegrationsIntegrated: totalIntegrationsIntegrated,
                    avatarUrl: req.session.avatarUrl,
                    username: req.session.username
                };
                if (totalIntegrationsIntegrated === 0) {
                    res.render("integrations", infoForIntegrations);
                }
                else if (totalIntegrationsIntegrated > 0 && totalIntegrationsIntegrated < 3) {
                    res.render("integrationsWithDriveIntoLink", infoForIntegrations);
                }
                else {
                    res.render("integrationWithDriveIntoBtn", infoForIntegrations);
                }

            }).catch(function (err) {
                console.log("Error is", err);
                res.send("Integrations not found.");
            });
    });

    app.get("/integrations/:integrationId", sessionManager.requiresSession, function (req, res) {
        var integrationId = req.param("integrationId");
        getIntegrationDetails(integrationId)
            .then(function (int) {
                return getAlreadyIntegratedIntegrationsForUser(req.session.username)
                    .then(function (integrationsOfUser) {
                        int.alreadyIntegrated = _.contains(integrationsOfUser, int.appId);
                        return int;
                    })
            })
            .then(function (int) {
                res.render('integrations_details', {
                    title: int.title,
                    iconUrl: int.iconUrl,
                    shortDesc: int.shortDesc,
                    longDesc: int.longDesc,
                    creatorName: int.creatorName,
                    supportLink: int.supportLink,
                    downloadLink: int.downloadLink,
                    integrationUrl: int.integrationUrl,
                    alreadyIntegrated: int.alreadyIntegrated,
                    username: req.session.username,
                    registrationToken: req.session.registrationToken,
                    type: int.type,
                    instructions: int.instructions
                });
            })
            .catch(function (err) {
                console.log("Error occurred", err);
                res.send(err);
            });
    });
};
