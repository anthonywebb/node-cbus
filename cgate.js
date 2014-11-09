var net = require('net');
var carrier = require('carrier');
var common = require('./common');
var config = require('./config');

// TELNET SESSION TO CONTROL
var control = net.createConnection(config.cgate.contolport,config.cgate.host);

// TELNET CHANNEL TO STATUS UPDATES
var events = net.createConnection(config.cgate.eventport,config.cgate.host);

// TELNET CHANNEL TO STATUS UPDATES
var statuses = net.createConnection(config.cgate.statusport,config.cgate.host);

exports.init = function(io){
  carrier.carry(control, function(line) {
    pushRealtime('controlStream',line);
  });

  carrier.carry(events, function(line) {
    pushRealtime('eventStream',line);
  });

  carrier.carry(statuses, function(line) {
    pushRealtime('statusStream',line);
  });

  // every time that a message arrives, we need to send it out the realtime websocket
  function pushRealtime(type, message) {
    console.log(type+' : '+message);
    // every message, before being sent out needs to be parsed to create a nice object that can be consumed
    var parsedMessage = parseMessage(message);
    io.emit(type, parsedMessage);
  }
}

exports.write = function(msg){
  control.write(msg);
}

////////////////////////
// MESSAGE PROCESSING
////////////////////////
function parseMessage(data) {
  console.log(data);

  var packet = {raw:data};
  packet.type = 'unknown';
  packet.source = 'cbus';

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
  common.processMessage(packet);

  return packet;
}
