$(function(){
    var connect =  $("#connect");
    connect.click(function(){
        var url = connect.attr("url") + "?username=" + connect.attr("username") + "&eun=" + connect.attr("eun");
        var win = window.open(url, '_blank');
        win.focus();
    });
});
