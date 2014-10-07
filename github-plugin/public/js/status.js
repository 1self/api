var socket = io();

var getURLParameter = function (name) {
    return decodeURIComponent(
        (RegExp(name + '=' + '(.+?)(&|$)').exec(location.search) || [, null])[1]
    );
};

var githubUsername = getURLParameter("githubUsername");

$(document).ready(function () {
    socket.emit('clientConnected', githubUsername);
});

socket.on('status', function (data) {
    var dashboardLocation = "http://localhost:5000/dashboard?streamId="+data.streamid+"&readToken="+data.readToken;
    document.getElementById('status').innerHTML = data.status;
    setTimeout(function(){
        window.location = dashboardLocation;
    }, 5000);
});


