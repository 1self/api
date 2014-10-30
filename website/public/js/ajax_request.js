(function ($) {

    var postAjax = function (urlParam, successCallback, failureCallback) {
        $.ajax({
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
})(jQuery);
