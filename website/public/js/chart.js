window.charts = window.charts || {};

charts.graphUrl; // /v1/users/... without query params
charts.defaultSelectedDate;

var getEventsFor = function (type, typeId, objectTags, actionTags, operation, period, shareToken) {
    return $.ajax({
        url: "/v1/" + type + "/" + typeId + "/events/" + objectTags + "/" + actionTags + "/" + operation + "/" + period + "/" + "type/json",
        data: {
            shareToken: shareToken
        },
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

charts.addComment = function () {
    var commentText = $("#commentText").val();
    var comment = {
        text: commentText,
        timestamp: new Date(),
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
        $(".commentList").append("<li><div class='commenter' style='display:table-cell'><img src='" + comment.avatarUrl + "' width='50'/></div>" +
            "<div class='commentText'><p>" + comment.text + "</p>" +
            "</div></li>");
        console.info("awesome. comment added." + JSON.stringify(comment));
        $("#commentText").val("");
        $("#addCommentInput").hide();
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
                $("#graphShareLink").html(window.location.origin + data.graphShareUrl);
                $("#shareModal").modal({show: true});
            },
            error: function () {
                alert("some problem. Please try again later.");
            }
        });
    } else if (unregisteredUserOnStreamsPage()) {
        $("#shareLoginModal").modal({show: true});
    } else {
        $.ajax({
            url: "/v1/graph/share?graphUrl=" + window.location.pathname,
            success: function (data) {
                $("#shareModal").modal({show: true});
                $("#loadingDiv").hide();
                $("#graphShareLink").html(window.location.origin + data.graphShareUrl);
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
        $.when(getEventsFor("users", graphOwner, objectTags, actionTags, operation, period, shareToken))
            .done(plotChart)
            .fail();
    } else {
        $.when(getEventsFor("streams", streamId, objectTags, actionTags, operation, period, shareToken))
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
    $.ajax({
        url: "/v1/comments?graphUrl=" + charts.graphUrl,
        headers: {
            "Accept": "application/json",
            "Authorization": $.cookie("_eun")
        }
    }).done(function (comments) {
        var commentsDiv = $(".commentList");
        commentsDiv.empty();
        comments.forEach(function (comment) {
            commentsDiv.append("<li><div class='commenter' style='display:table-cell'><img src='" + comment.avatarUrl + "' width=50/></div>" +
                "<div class='commentText'>" + comment.text +"</div></li>");
        });
    });
};

$(document).ready(function () {
    showChartTitle();
    $("#shareSubmit").click(submitShare);
});
