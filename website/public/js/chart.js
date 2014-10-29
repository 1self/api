window.charts = window.charts || {};

var getEventsFor = function (type, typeId, objectTags, actionTags, operation, period) {
    return $.ajax({
        url: "/v1/"+ type +"/"+ typeId + "/events/" + objectTags + "/" + actionTags + "/" + operation + "/" + period + "/" + "type/json",
        headers: {
            "Accept": "application/json",
            "Authorization": $.cookie("_eun")
        }
    });
};

var plotChart = function (events) {
    if (renderType === "barchart") {
        charts.plotBarChart("#chart", events, null, null);
    }
};

$(document).ready(function () {
    if (isUserLoggedIn === "true") {
        $(".apiUrl").html("/v1/users/" + username + "/events/" + objectTags + "/" + actionTags + "/" + operation
            + "/" + period + "/" + renderType);
        $.when(getEventsFor("users", username, objectTags, actionTags, operation, period))
            .done(plotChart)
            .fail();   }
    else {
        $(".apiUrl").html("/v1/streams/" + streamId + "/events/" + objectTags + "/" + actionTags + "/" + operation
            + "/" + period + "/" + renderType);
        $.when(getEventsFor("streams", streamId, objectTags, actionTags, operation, period))
            .done(plotChart)
            .fail();
    }
});