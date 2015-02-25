$(function () {
    var connect = $("#connect");
    connect.click(function () {
        var url = connect.attr("url") + "?username=" + connect.attr("username") + "&token=" + connect.attr("token");
        window.location.href = url;
    });
});
