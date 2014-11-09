var config = require('./config');

////////////////////////
// WEBSERVER SETUP
////////////////////////
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

app.use('/',express.static(__dirname + '/public'));
server.listen(config.webserver.port,config.webserver.host);
console.log('Console on: http://'+config.webserver.host+':'+config.webserver.port+'/console.htm');

// HTTP ROUTES
app.get('/do', function (req, res) {
  if (req.query.cmd) {
    var command = req.query.cmd.trim() + '\r';
    console.log('remoteCommand : ' + command);
    cbus.write(command);
    res.send({ status: 'ok', executed: req.query.cmd});
  }
  else {
    res.send({ status: 'error', message: 'you must specify a command'},400);
  }
});

////////////////////////
// CBUS CONNECTOR
////////////////////////
if(config.cgate){
  var cbus = require('./cgate').init(io);
}
