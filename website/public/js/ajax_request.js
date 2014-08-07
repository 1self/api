(function($) {

    var url = function(base, resource) {
        var result = "";
        if (location.hostname == "localhost") {
            if (base.length > 0) {
                result = "http://" + location.hostname + ":5000/" + base + "/" + resource;
            } else {
                result = "http://" + location.hostname + ":5000/" + resource;
            }

        } else {
            if(base.length > 0){
                result = "http://app.quantifieddev.org/"+base+"/" + resource;
            }else {
                result = "http://app.quantifieddev.org/"+ resource;
            }
        }
        return result;
    };

    var postQDRouteAjax = function(urlParam, successCallback, failureCallback) {
        $.ajax({
            url: url("", urlParam),
            headers: {
                "Accept": "application/json",
            },
            success: successCallback,
            error: function(xhr, error) {
                console.log("Error occurred for ", urlParam);
                if (failureCallback)
                    failureCallback(error);
            }
        });
    };

    var postAjax = function(urlParam, successCallback, failureCallback) {
        $.ajax({
            url: url("quantifieddev", urlParam),
            headers: {
                "Accept": "application/json",
                "Authorization": $.cookie("_eun")
            },
            success: successCallback,
            error: function(xhr, error) {
                console.log("Error occurred for ", urlParam);
                if (failureCallback)
                    failureCallback(error);
            }
        });
    };

    window.postAjax = postAjax;
    window.postQDRouteAjax = postQDRouteAjax;
    window.url = url;
})(jQuery);
