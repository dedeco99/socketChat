var express = require('express');
var mongoose = require('mongoose');
var socket = require('socket.io');

// App setup
var app = express();
app.set('port', (process.env.PORT || 5000));

var server=app.listen(app.get('port'),function(){
  console.log('Node app is running on port',app.get('port'));
});

// Static files

app.use(express.static('public'));
app.use("/assets",express.static("assets"));
app.use("/jquery",express.static("jquery"));
app.use("/bootstrap",express.static("bootstrap"));

mongoose.Promise = global.Promise;
mongoose.connect("mongodb://dedeco99:dedeco-00@ds161012.mlab.com:61012/housekeeper",{useMongoClient:true},function(err){
  if(err) console.log(err);
  console.log("Connected to database");
});

var schema=new mongoose.Schema({
  item:String,
  created:{type:Date,default:Date.now}
});

var Meal=mongoose.model("HouseKeeper",schema);

// Socket setup & pass server
var io = socket(server);
io.sockets.on('connection', function(socket){

  console.log('made socket connection', socket.id);

  var query=Meal.find({});
  query.sort("-created").limit(5).exec(function(err,docs){
    if(err) throw err;
    socket.emit("msgs",docs);
  });

  // Handle chat event
  socket.on('chat', function(data){
      console.log(data);
      var newMsg=new Meal({item:data.message});
      newMsg.save(function(err){
        if(err) throw err;
        io.sockets.emit('chat', data);
      });
  });

  // Handle typing event
  socket.on('typing', function(data){
      socket.broadcast.emit('typing', data);
  });

});
