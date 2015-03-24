// /v1/users/:username/correlate/:period/.json?firstEvent=:objectTags/:actionTags/:operation&secondEvent=:objectTags/:actionTags/:operation
var correlateEvents = function (username, period, firstEvent, secondEvent, fromDate, toDate) {
    var url = "/v1/users/"
        + username + "/correlate/" + period
        + "/type/.json?firstEvent=" + firstEvent
        + "&secondEvent=" + secondEvent
        + (fromDate ? "&from=" + fromDate : "")
        + (toDate ? "&to=" + toDate : "");
    return $.ajax({
        url: url,
        method: "GET",
        headers: {
            "Accept": "application/json",
            "Authorization": $.cookie("_eun")
        }
    });
};

var showChartTitle = function () {
    var chartTitle = firstEventTitle + " vs " + secondEventTitle;
    $("#chartTitle").html(chartTitle);
    $("#avatar").html("<img src='" + graphOwnerAvatarUrl + "' />").addClass('avatar');
    $.when(correlateEvents(username, period, firstEvent, secondEvent, fromDate, toDate))
        .done(function (events) {
            charts.plotScatterPlot("#chart", events, firstEventTitle, secondEventTitle);
        })
        .fail();
};

var getBackgroundColor = function () {
    var colorFromQueryParam = getParameterByName('bgColor');
    if (colorFromQueryParam && colorFromQueryParam !== 'undefined') {
        return colorFromQueryParam;
    } else {
        return "249BBA";
    }
};

var setBackgroundColor = function () {
    document.body.style.backgroundColor = "#" + getBackgroundColor();
};

$(document).ready(function () {
    setBackgroundColor();
    showChartTitle();
});
