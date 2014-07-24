var dashboardGraphs = ['updateBuildModel', 'updateWTFModel', 'updateHydrationModel', 'updateCaffeineModel', 'updateBuildDurationModel', 'updateHourlyBuildHeatMap', 'updateHourlyWtfHeatMap', 'updateHourlyHydrationHeatMap', 'updateHourlyCaffeineHeatMap', 'updateActiveEvents'];

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


$(window).load(function() {
    //does not work in document.ready()
    if ($("#showOverlayFlag").attr("showOverlay") == 'true') {
        $("#noDataSourceMessage").modal("show")
    } else {
        window.qd.plotGraphs(dashboardGraphs);
    }

});
$(window).resize(function() {
    window.qd.plotGraphs(dashboardGraphs);

});
