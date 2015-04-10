window.charts = window.charts || {};

charts.graphUrl; // /v1/users/... without query params
charts.dataPoints = [];

var getEventsFor = function (type
                            , typeId
                            , objectTags
                            , actionTags
                            , operation
                            , period
                            , shareToken
                            , readToken
                            , fromDate
                            , toDate) {
    var url = "/v1/" 
            + type + "/" + typeId 
            + "/events/" + objectTags
            + "/" + actionTags
            + "/" + operation 
            + "/" + period + "/" + "type/json"
            + "?" 
            + (fromDate ? "from=" + fromDate + "&" : "")
            + (toDate ? "to=" + toDate + "&" : "");
    return $.ajax({
        url: url,
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
            charts.plotBarChart("#chart", events, fromDate, toDate);
            $('.detailsSection').show();
            $('.share-button-container').show();
        }
    }
};

charts.addComment = function () {
    var commentText = $("#commentText").val();

    if ("" == commentText.trim()) return;

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

    //disable further commenting until current one completes
    $('#commentAddButton').attr('disabled', 'disabled');
    $('#addText').hide();
    $('.sending_comment_loader').show();

    $.ajax({
        url: "/v1/comments",
        method: "POST",
        data: graph,
        headers: {
            "Accept": "application/json",
            "Authorization": $.cookie("_eun")
        }
    }).done(function (data) {
        //enable the add button
        $('#commentAddButton').removeAttr('disabled');
        $('#addText').show();
        $('.sending_comment_loader').hide();


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
            url: "/v1/graph/share",
            data: {
                graphUrl: window.location.pathname,
                bgColor: getBackgroundColor(),
                from: fromDate,
                to: toDate
            },
            success: function (data) {
                $("#shareModal").modal({show: true});
                $("#loadingDiv").hide();
                var link = window.location.origin + data.graphShareUrl;
                var graphShareLink = "<a href='" + link + "'> " + link + " </a>";
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
                var graphShareLink = "<a href='" + link + "'>" + link + "</a>";
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
        $.when(getEventsFor("users", graphOwner, objectTags, actionTags, operation, period, shareToken, readToken, fromDate, toDate))
            .done(plotChart)
            .fail();
    } else {
        $.when(getEventsFor("streams", streamId, objectTags, actionTags, operation, period, shareToken, readToken, fromDate, toDate))
            .done(plotChart)
            .fail();
    }
};

var getBackgroundColor = function () {
    var colorFromQueryParam = getParameterByName('bgColor');
    if (colorFromQueryParam && colorFromQueryParam !== 'undefined') {
        return colorFromQueryParam;
    } else {
        return "fdc526";
    }
};

var setBackgroundColor = function () {
    document.body.style.backgroundColor = "#" + getBackgroundColor();
};

var submitShare = function () {
    var emailId = $("#emailId").val();
    var graphShareUrl = $("#graphShareHyperLink a:first-child").attr("href");

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
        var currentDataPointDate = moment.utc(toDate).subtract(i, 'days').format("YYYY-MM-DD"); // "2014-11-14"
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

    $("#signup").click(function () {
        if (window.parent !== window) {
            var parentWindow = window.parent;
            var msg = {
                msgType: 'auth',
                loginUrl: oneselfAppUrl + "/signup",
                oneselfAppUrl: oneselfAppUrl,
                intent: 'chart.comment'
            };
            parentWindow.postMessage(msg, "*");
        } else {
            $("#signup").attr('href', '/signup?intent=chart.comment&redirectUrl=' + encodeURIComponent(window.location.href));
        }
    });
    $("#login").click(function () {
        if (window.parent !== window) {
            var parentWindow = window.parent;
            var msg = {
                msgType: 'auth',
                loginUrl: oneselfAppUrl + "/login",
                oneselfAppUrl: oneselfAppUrl,
                intent: 'chart.comment'
            };
            parentWindow.postMessage(msg, "*");
        } else {
            $("#login").attr('href', '/login?intent=chart.comment&redirectUrl=' + encodeURIComponent(window.location.href));
        }
    });

    setBackgroundColor();
    showChartTitle();

    var url = "/v1/comments";
    var params = ["from=" + fromDate
                , "to=" + toDate];
    url += "?" + params.join("&");

    $.ajax({
        url: url,
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
    $('.avatar_group').css({'height': ch + 'px'});

    setTimeout(function () {
        charts.showComments();
        if (isUserLoggedIn) {
            if (window.localStorage.selectedDate) {
                delete window.localStorage.selectedDate;
            }
        }
    }, 3000)
});
