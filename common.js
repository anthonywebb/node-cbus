var moment = require('moment');
var _ = require('underscore');
var tm = require('time');
var suncalc = require('suncalc');
var request = require('request');

var timers = {};


////////////////////////////
// MESSAGE/RULES PROCESSING
////////////////////////////

exports.processMessage = function(packet){
  // process rules that are contingent on msg events and update the DB model

  // just ignore packets of devices that are not in our DB
  if(DB.devices[packet.group]){
    var oldLevel = DB.devices[packet.group].level;

    // record the timestamp of this level change and update the current level
    DB.devices[packet.group].lastchange = moment().unix();
    DB.devices[packet.group].level = packet.level;

    processRules(packet.group,DB.devices[packet.group]);

    // TODO: not sure how to accomplish this without knowing that the status event was driven by a button press  (is sourceunit == 1 what I am after?)
    // kill any timers that might be running for this group if we got a manual state change
    //if (packet.level > 0 && packet.sourceunit > 1) {
    //    killTimer(packet.group);
    //}
  }
}

exports.doCommands = function(cmdArray,level) {
  processCommands(cmdArray,level);
}

function processCommands(cmdArray,level) {
    // how many commands are we looping over?
    var i = 0;

    // define the delayed loop function
    function delayedLoop() {

        var waitTillNextCommand = 0;
        var command = cmdArray[i];

        if(command.type=='lighting') {
            processLightingCommand(command,level);
        }
        else if(command.type == 'delay') {
            waitTillNextCommand = command.delay;
        }
        else if(command.type == 'url') {
            processUrlCommand(command);
        }
        else if(command.type == 'email') {
            // TODO: email someone
        }
        else if(command.type == 'sms') {
            // TODO: send sms
        }
        else if(command.type == 'rule') {
            // TODO: enable/disable a rule
        }
        else if(command.type == 'task') {
            // TODO: enable/disable a task
        }
        else if(command.type == 'scene') {
            // TODO: trigger a scene
        }
        else {
            console.log('Did not recognize command:');
            console.log(command);
        }

        // if the end of the array has been reached, stop
        if(++i == cmdArray.length) {
            return;
        }

        // recursively call the delayed loop function with a delay
       setTimeout(delayedLoop, 1000 * waitTillNextCommand);
    }
    // kick off these commands one at a time
    delayedLoop();
}

function processRules(id,device) {
    // first off we need to extract some values so we can process the expression
    var dd = new tm.Date();
    dd.setTimezone(CONFIG.location.timezone);

    var times = suncalc.getTimes(dd,CONFIG.location.latitude,CONFIG.location.longitude);

    // variables we can use in our expressions
    var time = getTimeString(dd,dd.getTimezoneOffset()); // the current time
    var sunset = getTimeString(times.sunset,dd.getTimezoneOffset()); // sun starts to set
    var dusk = getTimeString(times.dusk,dd.getTimezoneOffset()); // sun has fully set and it is starting to get dark
    var sunrise = getTimeString(times.sunrise,dd.getTimezoneOffset()); // sun has started to rise
    var dawn = getTimeString(times.dawn,dd.getTimezoneOffset()); // sun has not risen but it is starting to get light
    var group = id; // group address of the group that triggered the rules engine
    var level = device.level; // this is the level of the group that triggered the rules engine, the rules say this is 0-100

    console.log('---------------START PROCESSING RULES---------------');
    console.log('rule vars: ' + time + ' ' + sunset + ' ' + dusk + ' ' + dawn + ' ' + sunrise + ' ' + group + ' ' + level);

    _.each(DB.rules,function(rule,ind){
        // only process enabled rules
        if(rule.enabled){
            if(eval(rule.expression)) {
                console.log('----------- BINGO --------------')
                console.log(rule);
                var therules = rule.commands;
                processCommands(therules,level);
            }
        }
        if(DB.rules.length==ind+1){
          console.log('---------------DONE PROCESSING RULES---------------');
        }
    })
}

function processUrlCommand(command) {
    request(command.url, function (error, response, body) {
        if (error && response.statusCode != 200) {
            console.log('got back an error when calling '+command.url+': ('+response.statusCode+') '+err.message); // Print the google web page.
        }
    });
}

function processLightingCommand(command,level) {
    // only need to adjust the actual lighting level (which we will cast to 0-100) if it is not at the level the scene says it needs to be
    var changeto = command.level;
    var cmdtext = 'ramp';

    if(command.level!=DB.devices[command.group].level){
      // they might have a command passed from a rule, and want to use the level from the group that triggered the rule (useful for syncing)
      if(command.level == 'level') {
        changeto = level;
      }

      if(changeto==100){
        cmdtext = 'on';
      }
      else if (changeto==0) {
        cmdtext = 'off';
      }

      // if they want to fade up slowly
      if(command.delay) {
        cmdtext = 'ramp';
      }

      sendLightingCommand(command.group,cmdtext,changeto,command.delay,DB.devices[command.group].vendor);
    }

    // TIMERS SUPPORT
    if(command.timeout > 0 && command.level > 0){
      // if there is already a timer running, lets clear it and start it up again
      killTimer(command.group);

      console.log('TIMER: will turn off group '+command.group+' in '+command.timeout+' seconds')
      timers[command.group] = setTimeout(function(){
        sendLightingCommand(command.group,'off',0,0,DB.devices[command.group].vendor);
      }, command.timeout*1000);
    }

    function sendLightingCommand(device,command,level,delay,vendor){
      if(vendor=='cbus'){
        var cmd = CBUS.cmdString(device,command,level,delay);
        CBUS.write(cmd);
      }
      // TODO: integration with other vendors here?
    }
}

function killTimer(group) {
    if(timers[group]) {
        console.log('Killing TIMER: '+group);
        clearTimeout(timers[group]);
    }
}

function getTimeString(dd,tzoffset) {
    // we may need to adjust these times based on the offset
    dd = new Date(dd.getTime() - tzoffset*60000);

    var hh = dd.getHours();
    var mm = dd.getMinutes();

    mm = ( mm < 10 ? "0" : "" ) + mm;
    hh = ( hh < 10 ? "0" : "" ) + hh;

    return hh + ":" + mm;
}
