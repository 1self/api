var mongoRepository = require('../mongoRepository.js');
var Q = require('q');
var _ = require("underscore");

module.exports = function (app) {

    var getIntegrationDetails = function (integrationId) {
        var deferred = Q.defer();

        var byIntegrationId = {
            "title": integrationId.toLowerCase()
        };

        mongoRepository.findOne('integrations', byIntegrationId)
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

    var getIntegrations = function () {
        var deferred = Q.defer();
        var query = {};

        mongoRepository.find('integrations', query)
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


    var getIntegrationIdFromTitle = function(title){
       var result =  title.toLowerCase().split(/\s+/g).join("-")
        return result;
    };

    app.get("/integrations", function (req, res) {
        console.log("HIT1")
        getIntegrations().then(function(integrations){
            var integrations = _.collect(integrations, function(int){
                return {
                    title: int.title,
                    integration_id: getIntegrationIdFromTitle(int.title)
                }
            });
            console.log("Integrations are here", JSON.stringify(integrations));
            res.render("integrations",
                {
                    integrations: integrations
                }
            );
        }).catch(function(err){
            console.log("Error is", err);
            res.send("Integrations not found.");
        });
    });

    app.get("/integrations/:integration_id", function (req, res) {
        var integrationId = req.param("integration_id");
        console.log("Integrations Id is ", integrationId);

        getIntegrationDetails(integrationId).then(function (integrationDetailObject) {
            res.render('integrations_details', {
                title: integrationDetailObject.title,
                icon_url: integrationDetailObject.icon_url,
                short_desc: integrationDetailObject.short_desc,
                long_desc: integrationDetailObject.long_desc,
                support_link: integrationDetailObject.support_link,
                download_link: integrationDetailObject.download_link,
                integration_url: integrationDetailObject.integration_url,
                username: req.session.username,
                eun: req.session.encodedUsername
            });
        }).catch(function (err) {
            console.log("Error occurred", err);
            res.send(err);
        });
    });

};