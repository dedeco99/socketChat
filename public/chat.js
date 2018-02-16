// Make connection
var socket = io.connect('https://dedeco99.herokuapp.com/');

// Query DOM
var message = document.getElementById('message'),
      handle = document.getElementById('handle'),
      btn = document.getElementById('send'),
      output = document.getElementById('output'),
      feedback = document.getElementById('feedback');

// Emit events
message.addEventListener('keyup', function(event) {
    event.preventDefault();
    if (event.keyCode == 13) {
      socket.emit('chat', {
          message: message.value,
          handle: handle.value
      });
      message.value = "";
    }
});

btn.addEventListener('click', function(){
    socket.emit('chat', {
        message: message.value,
        handle: handle.value
    });
    message.value = "";
});

message.addEventListener('keypress', function(){
    socket.emit('typing', handle.value);
})

// Listen for events
socket.on('chat', function(data){
    feedback.innerHTML = '';
    output.innerHTML += '<p><strong>' + data.handle + ': </strong>' + data.message + '</p>';
    document.getElementById( 'feedback' ).scrollIntoView();
});

socket.on('typing', function(data){
    feedback.innerHTML = '<p><em>' + data + ' is typing a message...</em></p>';
});

socket.on("msgs",function(data){
  for(var i=data.length-1;i>=0;i--){
    output.innerHTML += '<p><strong>xixo: </strong>' + data[i].item + '</p>';
  }
});
