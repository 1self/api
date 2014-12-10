window.charts = window.charts || {};

charts.graphUrl; // /v1/users/... without query params
charts.dataPoints = [];

var getEventsFor = function (type, typeId, objectTags, actionTags, operation, period, shareToken, readToken) {
    return $.ajax({
        url: "/v1/" + type + "/" + typeId + "/events/" + objectTags + "/" + actionTags + "/" + operation + "/" + period + "/" + "type/json",
        data: {
            shareToken: shareToken,
            readToken: readToken
        },
        headers: {
            "Accept": "application/json",
            "Authorization": $.cookie("_eun")
        }
    });
};

var plotChart = function (events) {
    if (renderType === "barchart") {
        if (events === null || events.length == 0) {
            $(".no-data").show();
        } else {
            charts.plotBarChart("#chart", events, null, null);
            $('.detailsSection').show();
            $('.share-button-container').show();
        }
    }
};

charts.addComment = function () {
    var commentText = $("#commentText").val();
    var comment = {
        text: commentText,
        user: username,
        avatarUrl: avatarUrl
    };
    var graph = {
        graphUrl: charts.graphUrl,
        dataPointDate: charts.selectedDate,
        username: graphOwner,
        objectTags: objectTags,
        actionTags: actionTags,
        operation: operation,
        period: period,
        renderType: renderType,
        comment: comment
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
        var displayedComment = {text: commentText, avatarUrl: graphOwnerAvatarUrl};
        var selectedDataPoint = _.find(charts.dataPoints, function (dataPoint) {
            return dataPoint.dataPointDate === charts.selectedDate;
        });
        if (_.isEmpty(selectedDataPoint)) {
            var newDataPoint = {
                dataPointDate: charts.selectedDate,
                avatars: [graphOwnerAvatarUrl],
                comments: [displayedComment]
            };
            charts.dataPoints.push(newDataPoint);
        } else {
            selectedDataPoint.comments.push(displayedComment);
        }
        $(".commentList").append("<li><div class='commenter' style='display:table-cell'><img src='" + comment.avatarUrl + "' width='50'/></div>" +
            "<div class='commentText'><p>" + comment.text + "</p>" +
            "</div></li>");
        $("#commentText").val("");
    });
};

$("#addCommentInput").keyup(function (e) {
    if (e.keyCode == 13) {
        charts.addComment();
    }
});

var handleAddComment = function () {
    if (isUserLoggedIn) {
        $("#addCommentInput").show();
    }
    else {
        window.localStorage.selectedDate = charts.selectedDate;
        $("#loginModal").modal({show: true});
    }
};

var handleShareGraph = function () {
    var unregisteredUserOnStreamsPage = function () {
        return !isUserLoggedIn && (window.location.pathname.search("streams") !== -1);
    };

    if (isUserLoggedIn) {
        $.ajax({
            url: "/v1/graph/share?graphUrl=" + window.location.pathname,
            success: function (data) {
                $("#shareModal").modal({show: true});
                $("#loadingDiv").hide();
                var link = window.location.origin + data.graphShareUrl;
                var graphShareLink = "<a href='"+link+"'> "+link+" </a>";
                $("#graphShareHyperLink").html(graphShareLink);
                $("#graphShareLink").html(link);
                $("#shareModal").modal({show: true});
            },
            error: function () {
                alert("some problem. Please try again later.");
            }
        });
    } else if (unregisteredUserOnStreamsPage()) {
        $("#loginModal").modal({show: true});
    } else {
        $.ajax({
            url: "/v1/graph/share?graphUrl=" + window.location.pathname,
            success: function (data) {
                $("#shareModal").modal({show: true});
                $("#loadingDiv").hide();
                var link = window.location.origin + data.graphShareUrl;
                var graphShareLink = "<a href='"+link+"'>"+link+"</a>";
                $("#graphShareHyperLink").html(graphShareLink);
                $("#graphShareLink").html(link);
            },
            error: function () {
                alert("some problem. Please try again later.");
            }
        });
    }
};

var showChartTitle = function () {
    $("#chartTitle").html(chartTitle);
    if (isUserLoggedIn) {
        $("#avatar").html("<img src='" + avatarUrl + "' />").addClass('avatar');
    }
    if (isUserLoggedIn || (!isUserLoggedIn && !(_.isEmpty(shareToken)))) {
        $.when(getEventsFor("users", graphOwner, objectTags, actionTags, operation, period, shareToken, readToken))
            .done(plotChart)
            .fail();
    } else {
        $.when(getEventsFor("streams", streamId, objectTags, actionTags, operation, period, shareToken, readToken))
            .done(plotChart)
            .fail();
    }
};

var submitShare = function () {
    var emailId = $("#emailId").val();
    var graphShareUrl = $("#graphShareLink").html();

    $.ajax({
        url: "/v1/share_graph",
        method: "POST",
        data: { graphShareUrl: graphShareUrl, toEmailId: emailId },
        success: function () {
            $(".shareEmailNoticeMessage").html("Graph link emailed successfully");
        },
        error: function () {
            alert("some problem. Please try again later.");
        }
    });
};

charts.showComments = function () {
    var commentsDiv = $(".commentList");
    commentsDiv.empty();

    charts.dataPoints
        .filter(function (dataPoint) {
            return dataPoint.dataPointDate === charts.selectedDate;
        })
        .forEach(function (dataPoint) {
            dataPoint.comments.forEach(function (comment) {
                commentsDiv.append("<li><div class='commenter' style='display:table-cell'><img src='" + comment.avatarUrl + "' width=50/></div>" +
                    "<div class='commentText'>" + comment.text + "</div></li>");
            });
        });
};

var displayCommentsSummary = function () {
    for (var i = 6; i >= 0; i--) {
        var currentDataPointDate = moment.utc().subtract(i, 'days').format("YYYY-MM-DD"); // "2014-11-14"
        var currentDataPoint = _.findWhere(charts.dataPoints, {"dataPointDate": currentDataPointDate});
        if (!_.isEmpty(currentDataPoint)) {
            var latest3Avatars = currentDataPoint.avatars.slice(0, 3);
            latest3Avatars.forEach(function (avatarUrl, j) {
                $("#group" + i + "-avatar" + j).css({'background-image': 'url(' + avatarUrl + ')'});
            });
            if (currentDataPoint.comments.length > 3) {
                $("#group" + i + "-commentCount").addClass("count").html(currentDataPoint.comments.length);
            }
        }
    }
};

$(document).ready(function () {
    showChartTitle();
    $.ajax({
        url: "/v1/comments",
        method: "GET",
        data: {
            username: graphOwner,
            objectTags: objectTags,
            actionTags: actionTags,
            operation: operation,
            period: period,
            renderType: renderType
        },
        headers: {
            "Accept": "application/json",
            "Authorization": $.cookie("_eun")
        }
    }).done(function (comments) {
        charts.dataPoints = comments;
        displayCommentsSummary();
    });
    $("#shareSubmit").click(submitShare);

    var cw = $('.avatar_group').width();
    var ch = $(window).width() * (cw / 100);
    $('.avatar_group').css({'height': ch+'px'});

    setTimeout(function(){charts.showComments();}, 3000)
});
