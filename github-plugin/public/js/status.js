var socket = io();

var getURLParameter = function(name) {
    return decodeURIComponent(
        (RegExp(name + '=' + '(.+?)(&|$)').exec(location.search) || [, null])[1]
    );
};

var githubUsername = getURLParameter("githubUsername");

$(document).ready(function () {
    socket.emit('clientConnected', githubUsername);
});

socket.on('status', function (data) {
    document.getElementById('status').innerHTML = data;
});


