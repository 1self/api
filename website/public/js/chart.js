window.charts = window.charts || {};

var getEventsFor = function (streamId, objectTags, actionTags, operation, period) {
    return $.ajax({
        url: "/v1/streams/" + streamId + "/events/" + objectTags + "/" + actionTags + "/" + operation + "/" + period + "/" + "type/json",
        headers: {
            "Accept": "application/json"
        }
    });
};

$(document).ready(function () {
    console.log("", streamId);
    $.when(getEventsFor(streamId, objectTags, actionTags, operation, period))
        .done(function (events) {
            if (renderType === "barChart") {
                charts.plotBarChart("#chart", events, null, null);
            }
        })
        .fail();
});