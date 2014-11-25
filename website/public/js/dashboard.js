var dashboardGraphs = ['updateBuildModel', 'updateWTFModel', 'updateHydrationModel', 'updateCaffeineModel', 'updateBuildDurationModel', 'updateHourlyBuildHeatMap', 'updateHourlyWtfHeatMap', 'updateHourlyHydrationHeatMap', 'updateHourlyCaffeineHeatMap', 'updateActiveEvents', 'updateHourlyGithubPushHeatMap', 'updateCorrelationData'];
$(window).resize(function () {
    window.qd.replotGraphs();
});
$(window).load(function () {
    //does not work in document.ready()
    if ($("#showOverlayFlag").attr("showOverlay") == 'true') {
        $("#connect_to_github_btn").show();
        $("#noDataSourceMessage").modal("show");
        window.qd.plotGraphs(dashboardGraphs);
    } else {
        window.qd.plotGraphs(dashboardGraphs);
    }
});
$('#last-updated-since').html("Last Updated: " + moment(window.localStorage.lastUpdatedOn).fromNow());
var handleConnectToGithub = function () {
    var button = $("#github-push-events-sync");
    $('#noDataSourceMessage').modal('hide');
    var lastUpdatedSince = $('#last-updated-since');
    lastUpdatedSince.html("");
    window.localStorage.lastUpdatedOn = new Date();
    lastUpdatedSince.html("Last Updated: " + moment(window.localStorage.lastUpdatedOn).fromNow());
    button.prop("disabled", true);
    var githubHeatMap = $("#hourlyGithubPush-heat-map");
    githubHeatMap.html("");
    var html_data = '<div class="githubPushEvents text-center grid" ><div  class="grid-row"><div  class="grid-cell" ><img src="/img/loading.gif"></div></div></div>'
    githubHeatMap.html(html_data);
    //If you want the github datasource to run locally, change the window.location
//    window.location = "http://gitplugin.com:5001/authSuccess";
    window.location = "http://github-datasource.1self.co:5001/authSuccess";
};
$(document).ready(function () {
    $(document).on('mouseup keyup', function (e) {
        var e = e || event,
            code = (e.keyCode ? e.keyCode : e.which),
            target = e.srcElement || e.target;
        if (code == 27) {
            $('.helpContainer').hide();
        }
    });
});
var show = function (element) {
    var showElement = "#" + element + " " + ".helpContainer";
    $(showElement).slideToggle();
};
$("#github-push-events-sync").click(handleConnectToGithub);
$("#connect_to_github_link_popup_btn").click(handleConnectToGithub);
$("#connect_to_github_btn").click(handleConnectToGithub)