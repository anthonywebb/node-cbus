var net = require('net');
var sys = require('sys');
var carrier = require('carrier');
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
console.log('Ready on: http://'+config.webserver.host+':'+config.webserver.port);

app.get('/do', function (req, res) {
	if (req.query.cmd) {
		var command = req.query.cmd.trim() + '\r';
		console.log('remoteCommand : ' + command);
		control.write(command);
		res.send({ status: 'ok', executed: req.query.cmd});
	}
	else {
		res.send({ status: 'error', message: 'you must specify a command'},400);
	}
	
});

////////////////////////
// CGATE CONNECTION
////////////////////////

// TELNET SESSION TO CONTROL
var control = net.createConnection(config.cgate.contolport,config.cgate.host);
carrier.carry(control, function(line) {
	pushRealtime('controlStream',line);
});

// TELNET CHANNEL TO STATUS UPDATES
var events = net.createConnection(config.cgate.eventport,config.cgate.host);
carrier.carry(events, function(line) {
	pushRealtime('eventStream',line);
});

// TELNET CHANNEL TO STATUS UPDATES
var statuses = net.createConnection(config.cgate.statusport,config.cgate.host);
carrier.carry(statuses, function(line) {
	pushRealtime('statusStream',line);
});

function pushRealtime(type, message) {
	console.log(type+' : '+message);
	// every message, before being sent out needs to be parsed to create a nice object that can be consumed
  io.emit(type, parseMessage(message));
}

////////////////////////
// MESSAGE PROCESSING
////////////////////////
function parseMessage(data) {
	console.log(data);

	var packet = {raw:data};
	packet.type = 'unknown';

	var array = data.match(/\b[\S]+\b/g);

	// is this a lighting packet?
	if (array[0]=='lighting') {
		packet.type = 'lighting';
		
		packet.action = array[1];

		// last element of arr2 is the group
		temp = array[2].match(/\d+/g);
		packet.group = temp[2];

		var parseunit = array[3];
		var parseoid = array[4];

		if (packet.action == 'ramp') {
			packet.level = array[3];
			packet.time = array[4];
			parseunit = array[5];
			parseoid = array[6];
		}

		temp = parseunit.split('=');
		packet.sourceunit = temp[1];

		temp = parseoid.split('=');
		packet.oid = temp[1];
	}

	// are we getting group level report?
	if (array[0].substring(0, 3) == '300') {
    var temp = array[array.length-1].split('=');
		if(temp[0] == 'level') {
			packet.type = 'info';
      packet.level = temp[1];
			var ind = (array.length == 3 ? 1 : 0); 
      var temp2 = array[ind].match(/\d+/g);
			packet.group = temp2[2];
		}
	}

	console.log(packet);

	// are there custom things we want to do when this event occurs?
	processMessage(packet);

	return packet;
}

function processMessage(msg) {
  
}