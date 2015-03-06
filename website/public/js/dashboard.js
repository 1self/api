var dashboardGraphs = ['updateBuildModel'
                        , 'updateWTFModel'
                        , 'updateNoiseModel'
                        , 'updateTweetModel'
                        , 'updateSongsByDayModel'
                        , 'updateHydrationModel'
                        , 'updateCaffeineModel'
                        , 'updateBuildDurationModel'
                        , 'updateHourlyBuildHeatMap'
                        , 'updateHourlyWtfHeatMap'
                        , 'updateHourlyHydrationHeatMap'
                        , 'updateHourlyCaffeineHeatMap'
                        , 'updateActiveEvents'
                        , 'updateHourlyGithubPushHeatMap'
                        , 'updateCorrelationData'];
$(window).resize(function() {
    window.qd.replotGraphs();
});
$(window).load(function() {
    window.qd.plotGraphs(dashboardGraphs);
});
$(document).ready(function() {
    $(document).on('mouseup keyup', function(e) {
        var e = e || event,
            code = (e.keyCode ? e.keyCode : e.which),
            target = e.srcElement || e.target;
        if (code == 27) {
            $('.helpContainer').hide();
        }
    });
});
var show = function(element) {
    var showElement = "#" + element + " " + ".helpContainer";
    $(showElement).slideToggle();
};