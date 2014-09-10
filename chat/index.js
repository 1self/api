// Setup basic express server
var express = require('express');
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

io.on('connection', function(socket) {
  console.log("Somebody hit the server");

  socket.on('clientConnected', function(data) {
    console.log("new client logged in." + data.username);
    socket.join(data.username);
    /*clients[data.username] = socket.id
    console.log("clients : ", JSON.stringify(clients));*/
  });

  socket.emit('snapshot', {
    message: "snapshot data"
  });
  console.log("Sending snapshot data ");


  setInterval(function() {
    console.log("broadcasting data every 5 sec..");
    socket.emit('new message', {
      message: "data"
    });
  }, 5000);

  

  socket.on('disconnect', function() {
    console.log("client logged out.")
  });
});