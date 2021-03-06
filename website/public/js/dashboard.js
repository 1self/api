var dashboardGraphs = ['updateBuildModel'
                        , 'updateWTFModel'
                        , 'updateNoiseModel'
                        , 'updateTweetModel'
                        , 'updateSongsByDayModel'
                        , 'updateStepsModel'
                        , 'updateBuildDurationModel'
                        , 'updateMeanBuildDurationModel'
                        , 'updateHourlyBuildHeatMap'
                        , 'updateHourlyStepsHeatMap'
                        , 'updateHourlyTracksHeatMap'
                        , 'updateHourlyWtfHeatMap'
                        , 'updateActiveEvents'
                        , 'updateHourlyGithubPushHeatMap'
                        , 'updateHourlyGithubCommitHeatMap'
                        , 'updateHourlyActivityHeatMap'
                        , 'updateCorrelationData'
                        , 'updateStepsVsTracksCorrelationData'
                        , 'updateIDEActivityVsTracksCorrelationData'
                        , 'updateTwitterFollowerCount'
                        , 'updateTwitterFollowingCount'
                        , 'updateTwitterFollowersVsTweetsCorrelationData'
                        , 'updateInstagramFollowerCount'
                        , 'updateInstagramFollowingCount'];
$(window).resize(function() {
    window.qd.replotGraphs();
});
$(window).load(function() {
    window.qd.initProgress(dashboardGraphs.length, function(){
        $('#spinner').hide();
        if(window.qd.showNoDataMessage) {
            $("#noDataMessage").show();
        }
    });
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
