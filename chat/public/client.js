$(function() {
  console.info("page loaded.");
  var allMessages = $('.messages');
  var socket = io();
 // Adds the visual chat message to the message list
  function addChatMessage(data, options) {
    console.info("msg received from server " + JSON.stringify(data));

    var messageDiv = $('<li class="message"/>')
      .text(data.message);

    allMessages.append(messageDiv);
  }

  socket.emit('clientConnected', {
    "username": "chinmay"
  });

  socket.on('snapshot', function(data) {
    console.info("snapshot " , data.message);
    $("h1").text(data.message);
  });

   // Whenever the server emits 'realTimeData', update the chat body
  socket.on('realTimeData', function(data) {
    addChatMessage(data);
  });

 
});