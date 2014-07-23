var validateStreamDetails = function() {
    $("#stream-error").hide();
    var streamId = $("#streamId").val();
    var readToken = $("#readToken").val();
    if (streamId.trim() && readToken.trim()) {
        return true;
    }
    $("#stream-error").show();

    return false;
};