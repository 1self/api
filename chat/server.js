// Setup basic express server
var express = require('express');
var events = require('events');
var eventEmitter = new events.EventEmitter();
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;
// var clients = {};
server.listen(port, function() {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));

var dataCounter = 0;

app.post("/data", function(req, res) {
  console.log("got real time data from mobile.")
  eventEmitter.emit('realTimeData', ++dataCounter);
  res.send("Data Received.");
});

var handleRealTimeData = function(data) {
  console.log("sending real time data to platform : ");
  console.log("broadcasting real time data to browser now..");
  io.in("chinmay").emit('realTimeData', {
    message: "real time data"
  });
};

eventEmitter.on('realTimeData', handleRealTimeData);

io.on('connection', function(socket) {
  console.log("Somebody hit the server");

  socket.on('clientConnected', function(data) {
    console.log("new client logged in." + data.username);
    socket.join(data.username);
    io.in("chinmay").emit('snapshot', {
      message: "snapshot data"
    });
    console.log("Sending snapshot data ");
  });

  socket.on('disconnect', function() {
    console.log("client logged out.")
  });
});