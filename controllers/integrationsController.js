var mongoRepository = require('../mongoRepository.js');
var Q = require('q');
var _ = require("underscore");
var sessionManager = require("./../sessionManagement");

module.exports = function (app) {

    var getIntegrationDetails = function (integrationId) {
        var deferred = Q.defer();
        var byIntegrationId = {
            "url_name": integrationId
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

    app.get("/integrations", sessionManager.requiresSession, function (req, res) {
        getActiveIntegrations().then(function (integrations) {
            var integrations = _.collect(integrations, function (int) {
                return {
                    title: int.title,
                    integration_id: int.url_name,
                    icon_url: int.icon_url,
                    bg_color: int.bg_color,
                    fg_color: int.fg_color
                }
            });
            res.render("integrations",
                {
                    integrations: integrations,
                    avatarUrl: req.session.avatarUrl,
                    username: req.session.username
                }
            );
        }).catch(function (err) {
            console.log("Error is", err);
            res.send("Integrations not found.");
        });
    });

    app.get("/integrations/:integration_id", function (req, res) {
        var integrationId = req.param("integration_id");
        console.log("Integrations Id is ", integrationId);

        getIntegrationDetails(integrationId).then(function (int) {
            res.render('integrations_details', {
                title: int.title,
                icon_url: int.icon_url,
                short_desc: int.short_desc,
                long_desc: int.long_desc,
                support_link: int.support_link,
                download_link: int.download_link,
                integration_url: int.integration_url,
                username: req.session.username,
                registrationToken: req.session.registrationToken
            });
        }).catch(function (err) {
            console.log("Error occurred", err);
            res.send(err);
        });
    });

};
