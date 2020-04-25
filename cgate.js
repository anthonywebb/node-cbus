var net = require('net');
var carrier = require('carrier');

var control = {};
var events = {};
var statuses = {};

exports.init = function(){
  // TELNET SESSION TO CONTROL
  control = net.createConnection(CONFIG.cgate.contolport,CONFIG.cgate.host);
  control.on('error', function(error){
      console.log('cgate control socket error: ' + error);
  });
  control.on('end', function(){
      console.log('cgate control socket terminated');
  });
  control.on('close', function(){
      console.log('cgate control socket closed');
  });
  control.on('timeout', function(){
      console.log('cgate control socket timed out');
  });
  carrier.carry(control, function(line) {
    pushRealtime('controlStream',line);
  });

  // TELNET CHANNEL TO STATUS UPDATES
  events = net.createConnection(CONFIG.cgate.eventport,CONFIG.cgate.host);
  events.on('error', function(error){
      console.log('cgate events socket error: ' + error);
  });
  events.on('end', function(){
      console.log('cgate events socket terminated');
  });
  events.on('close', function(){
      console.log('cgate events socket closed');
  });
  events.on('timeout', function(){
      console.log('cgate events socket timed out');
  });
  carrier.carry(events, function(line) {
    pushRealtime('eventStream',line);
  });

  // TELNET CHANNEL TO STATUS UPDATES
  statuses = net.createConnection(CONFIG.cgate.statusport,CONFIG.cgate.host);
  statuses.on('error', function(error){
      console.log('cgate statuses socket error: ' + error);
  });
  statuses.on('end', function(){
      console.log('cgate statuses socket terminated');
  });
  statuses.on('close', function(){
      console.log('cgate statuses socket closed');
  });
  statuses.on('timeout', function(){
      console.log('cgate statuses socket timed out');
  });
  carrier.carry(statuses, function(line) {
    pushRealtime('statusStream',line);
  });

  // every time that a message arrives, we need to send it out the realtime websocket
  function pushRealtime(type, message) {
    console.log(type+' : '+message);
    // every message, before being sent out needs to be parsed to create a nice object that can be consumed
    var parsedMessage = parseMessage(message,type);
    IO.emit(type, parsedMessage);
  }

  // periodically list the levels of all devices to make sure they are in sync
  setTimeout(syncLevels, 5000);
  // repeat every 20 mins
  setInterval(syncLevels, 1200000)

  return module.exports;
}

exports.write = function(msg){
  if(msg){
    control.write(msg);
  }
}

exports.cmdString = function(device,command,level,delay) {
    var message = '';

    if(command=='on') {
        message = 'ON //'+CONFIG.cgate.cbusname+'/'+CONFIG.cgate.network+'/'+CONFIG.cgate.application+'/'+device+'\n';
    }
    else if (command=='off') {
        message = 'OFF //'+CONFIG.cgate.cbusname+'/'+CONFIG.cgate.network+'/'+CONFIG.cgate.application+'/'+device+'\n';
    }
    else if (command=='ramp') {

      if (level <= 100) {
        if (delay) {
          message = 'RAMP //'+CONFIG.cgate.cbusname+'/'+CONFIG.cgate.network+'/'+CONFIG.cgate.application+'/'+device+' '+level+'% '+delay+'\n';
        } else {
          message = 'RAMP //'+CONFIG.cgate.cbusname+'/'+CONFIG.cgate.network+'/'+CONFIG.cgate.application+'/'+device+' '+level+'%\n';
        }
      }
    }
    return message;
}

function humanLevelValue(level) {
    // convert levels from 0-255 to 0-100
    var temp = Math.round((level/255)*100)

    if(temp > 100){
        temp = 100;
    }
    else if(temp < 0){
        temp = 0;
    }

    return temp;
}

function syncLevels(){
  console.log('cgate syncing levels');
  var msg = message = 'GET //'+CONFIG.cgate.cbusname+'/'+CONFIG.cgate.network+'/'+CONFIG.cgate.application+'/* level\n';
  control.write(msg);
}

////////////////////////
// MESSAGE PROCESSING
////////////////////////
function parseMessage(data,type) {
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
      packet.level = humanLevelValue(array[3]);
      packet.time = array[4];
      parseunit = array[5];
      parseoid = array[6];
    } else if (packet.action == 'on') {
      packet.level = 100;
    } else if (packet.action == 'off') {
      packet.level = 0;
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
      packet.level = humanLevelValue(temp[1]);
      var ind = (array.length == 3 ? 1 : 0);
      var temp2 = array[ind].match(/\d+/g);
      packet.group = temp2[temp2.length-1];
    }
  }

  console.log(packet);

  // are there custom things we want to do when this event occurs? ONLY do this for the status stream
  if(type=='statusStream'||packet.type=='info'){
    COMMON.processMessage(packet);
  }


  return packet;
}
