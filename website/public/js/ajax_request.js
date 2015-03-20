(function ($) {

    var postAjax = function (urlParam, successCallback, failureCallback) {
        return $.ajax({
            url: "/quantifieddev/" + urlParam,
            headers: {
                "Accept": "application/json",
                "Authorization": $.cookie("_eun")
            },
            success: successCallback,
            error: function (xhr, error) {
                console.log("Error occurred for ", urlParam);
                if (failureCallback)
                    failureCallback(error);
            }
        });
    };
//:objectTags/:actionTags/:operation/:period
    var postV1Ajax = function (objectTags, actionTags, operation, period) {
        if (period === "daily") {
            var oneMonthAgo = encodeURIComponent(moment.utc().startOf('day').subtract('days', 30).toISOString());
            var today = encodeURIComponent(moment.utc().endOf('day').toISOString());
            var dataDuration = "?from=" + oneMonthAgo + "&to=" + today;
        }
        else {
            var epochDate = encodeURIComponent(moment.unix(1).utc().toISOString());
            var today = encodeURIComponent(moment.utc().endOf('day').toISOString());
            var dataDuration = "?from=" + epochDate + "&to=" + today;
        }
        return $.ajax({
            url: "/v1/users/" + username + "/events/" + objectTags + "/" + actionTags + "/" + operation + "/" + period + "/type/json" + dataDuration,
            headers: {
                "Accept": "application/json",
                "Authorization": $.cookie("_eun")
            }
        });
    };

// /v1/users/:username/correlate/:period/type/json?firstEvent=:objectTags/:actionTags/:operation&secondEvent=:objectTags/:actionTags/:operation
    var postV1CorrelateAjax = function (period, firstEvent, secondEvent) {
        var epochDate = encodeURIComponent(moment.unix(1).utc().toISOString());
        var today = encodeURIComponent(moment.utc().endOf('day').toISOString());
        var dataDuration = "&from=" + epochDate + "&to=" + today;
        return $.ajax({
            url: "/v1/users/" + username + "/correlate/" + period + "/type/json?firstEvent=" + firstEvent + "&secondEvent=" + secondEvent + dataDuration,
            headers: {
                "Accept": "application/json",
                "Authorization": $.cookie("_eun")
            }
        });
    };

    var postAjaxWithData = function (url, data, successCallback, failureCallback) {
        $.ajax({
            url: url,
            headers: {
                "Accept": "application/json"
            },
            data: data,
            success: successCallback,
            error: function (xhr, error) {
                console.log("Error occurred for ", url);
                if (failureCallback)
                    failureCallback(error);
            }
        });
    };
    window.postAjaxWithData = postAjaxWithData;
    window.postAjax = postAjax;
    window.postV1Ajax = postV1Ajax;
    window.postV1CorrelateAjax = postV1CorrelateAjax;
})(jQuery);
