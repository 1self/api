window.charts = window.charts || {};

var getEventsFor = function (type, typeId, objectTags, actionTags, operation, period) {
    return $.ajax({
        url: "/v1/" + type + "/" + typeId + "/events/" + objectTags + "/" + actionTags + "/" + operation + "/" + period + "/" + "type/json",
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

var addComment = function () {
    var commentText = $("#commentText").val();
    var graphUrl = window.location.href.split(window.location.origin)[1].split("?")[0]; // /v1/users/... without query params
    var commentData = {
        text: commentText,
        timestamp: new Date(),
        user: username
    };
    var graph = {
        graphUrl: graphUrl,
        username: graphOwner,
        objectTags: objectTags,
        actionTags: actionTags,
        operation: operation,
        period: period,
        renderType: renderType,
        comment: commentData
    };
    $.ajax({
        url: "/v1/comments",
        method: "POST",
        data: graph,
        headers: {
            "Accept": "application/json",
            "Authorization": $.cookie("_eun")
        }
    }).done(function (data) {
        $("#addCommentModal").modal({show: false});
        console.info("awesome. comment added." + JSON.stringify(commentData));
    });
};

var handleAddComment = function () {
    if (isUserLoggedIn) {
        $("#addCommentModal").modal({show: true});
    }
    else {
        $("#loginModal").modal({show: true});
    }
};

$(document).ready(function () {
    if (isUserLoggedIn) {
        $(".apiUrl").html("/v1/users/" + graphOwner + "/events/" + objectTags + "/" + actionTags + "/" + operation
            + "/" + period + "/" + renderType);
        $.when(getEventsFor("users", graphOwner, objectTags, actionTags, operation, period))
            .done(plotChart)
            .fail();
    }
    else {
        $(".apiUrl").html("/v1/streams/" + streamId + "/events/" + objectTags + "/" + actionTags + "/" + operation
            + "/" + period + "/" + renderType);
        $.when(getEventsFor("streams", streamId, objectTags, actionTags, operation, period))
            .done(plotChart)
            .fail();
    }
});