var dashboardGraphs = ['updateBuildModel', 'updateWTFModel', 'updateHydrationModel', 'updateCaffeineModel', 'updateBuildDurationModel', 'updateHourlyBuildHeatMap', 'updateHourlyWtfHeatMap', 'updateHourlyHydrationHeatMap', 'updateHourlyCaffeineHeatMap', 'updateActiveEvents', 'updateHourlyGithubPushHeatMap', 'updateCorrelationData'];

$("#builds-x").ready(function() {
    window.qd.registerForBuildModelUpdates(function() {
        var displayBuildCountAndBuildComparison = function(buildCount, buildCountElementId, comparisonValue, comparisonElementId) {
            $(buildCountElementId).text(buildCount);
            var buildComparison = Math.abs(comparisonValue);
            if (buildComparison && buildComparison !== Infinity) {
                $(comparisonElementId).text(buildComparison + "%");
                if (comparisonValue < 0) {
                    $(comparisonElementId).addClass("icon-caret-down");
                } else if (comparisonValue > 0) {
                    $(comparisonElementId).addClass("icon-caret-up");
                }
            }
        };

        displayBuildCountAndBuildComparison(window.qd.todaysTotalBuildCount, "#builds-x", window.qd.totalBuildComparison, "#total-build-comparison");
        displayBuildCountAndBuildComparison(window.qd.todaysPassedBuildCount, "#passed-x", window.qd.passedBuildComparison, "#passed-build-comparison");
        displayBuildCountAndBuildComparison(window.qd.todaysFailedBuildCount, "#failed-x", window.qd.failedBuildComparison, "#failed-build-comparison");
    });
});

$(window).resize(function() {
    window.qd.plotGraphs(dashboardGraphs);
});

$(window).load(function() {
    //does not work in document.ready()
    if ($("#showOverlayFlag").attr("showOverlay") == 'true') {
        $("#noDataSourceMessage").modal("show")
    } else {
        window.qd.plotGraphs(dashboardGraphs);
    }
});

$('#last-updated-since').html("Last Updated: " + moment(window.localStorage.lastUpdatedOn).fromNow());

var handleConnectToGithub = function() {
    var button = $("#github-push-events-sync");
    $('#noDataSourceMessage').modal('hide');

    var showGitHubEvents = function(data) {
        var hourlyGithubErrorCallback = function() {
            alert("Github events error");
        };
        var hourlyGithubSuccessCallback = function(hourlyGithubPushEvents) {
            button.prop("disabled", false);
            $('#last-updated-since').html("");
            window.localStorage.lastUpdatedOn = new Date();
            $('#last-updated-since').html("Last Updated: " + moment(window.localStorage.lastUpdatedOn).fromNow());
            window.qd.hourlyGithubPushEvents = hourlyGithubPushEvents;
            window.qd.plotHeatmapWith('#hourlyGithubPush-heat-map-parent', '#hourlyGithubPush-heat-map', hourlyGithubPushEvents);
        };
        postAjax("hourlyGithubPushEvents", hourlyGithubSuccessCallback, hourlyGithubErrorCallback);
    }

    button.prop("disabled", true);
    $("#hourlyGithubPush-heat-map").html("");
    var html_data = '<div class="githubPushEvents text-center grid" ><div  class="grid-row"><div  class="grid-cell" ><img src="/img/loading.gif"></div></div></div>'
    $("#hourlyGithubPush-heat-map").html(html_data);

    postQDRouteAjax("connect_to_github?callback=?", showGitHubEvents, function(error) {
        console.log(error);
    })
}

$("#connect_to_github_btn").click(handleConnectToGithub);
$("#github-push-events-sync").click(handleConnectToGithub);
$("#connect_to_github_link_popup_btn").click(handleConnectToGithub);