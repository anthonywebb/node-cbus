var _ = require('underscore');
CONFIG = require('./config');

////////////////////////
// LOAD THE CONNECTORS
////////////////////////
if(CONFIG.cgate){
  console.log('Initializing the cgate connector');
  CBUS = require('./cgate').init();
}

//////////////////////////
// GLOBAL HELPER METHODS
//////////////////////////
COMMON = require('./common');

// TODO: should check and see if this file exists first, and if not, create it
DB = require('./db.json');

////////////////////////
// WEBSERVER SETUP
////////////////////////
var express = require('express');
var app = express();
var server = require('http').Server(app);
IO = require('socket.io')(server);

app.use('/',express.static(__dirname + '/public'));
server.listen(CONFIG.webserver.port,CONFIG.webserver.host);
console.log('Console on: http://'+CONFIG.webserver.host+':'+CONFIG.webserver.port+'/console.html');

// HTTP ROUTES
app.get('/cgate', function (req, res) {
  if (req.query.cmd) {
    var command = req.query.cmd.trim() + '\r';
    console.log('remoteCommand : ' + command);
    CBUS.write(command);
    res.send({ status: 'ok', executed: req.query.cmd});
  }
  else {
    res.send({ status: 'error', message: 'you must specify a command'},400);
  }
});

app.get('/cmd', function (req, res) {
    console.log(req.query);
    var commandArray = [{type:'lighting',group:req.query.device,level:parseInt(req.query.level),delay:parseInt(req.query.delay),timeout:parseInt(req.query.timeout)}];
    COMMON.doCommands(commandArray);
    res.send(JSON.stringify({ status: 'ok'}));
});

app.get('/locations', function (req, res) {
    // loop over the keys and build the response (an array of objects)
    var resp = _.uniq(_.pluck(COMMON.deviceObjToArray(DB.devices), 'location'));
    resp = _.sortBy(resp, function(str){ return str; });
    res.json(resp);
});
app.get('/scenes', function (req, res) {
    res.json(DB.scenes);
});

app.get('/devices', function (req, res) {
    res.json(COMMON.deviceObjToArray(DB.devices));
});

/////////////////////////////
// SCHEDULED TASKS
/////////////////////////////
var cronjobs = {};
var cronjob = require('cron').CronJob;
// load up everything currently in the DB
_.each(DB.tasks,function(task){
    // only create cron jobs for tasks that are enabled
    if (task.enabled) {
        addCronJob(task.id,task.cronstring,task.expression,task.commands,CONFIG.location.timezone);
    }
})

function addCronJob(id,cronstring,expression,commands,timezone){
    try {
        console.log('Adding cronjob task: '+id);
        cronjobs[id] = new cronjob(cronstring, function(){
            console.log('Starting Cronjob Task: '+id);
            // some of these tasks may have a conditional expression, some can just run
            if(expression){
                if(eval(expression)) {
                    COMMON.doCommands(commands);
                }
            }
            else {
                COMMON.doCommands(commands);
            }
        }, function(){console.log('Cronjob stopped: '+id)}, true, timezone);
    } catch(ex) {
        console.log("cronstring pattern not valid for "+id+": "+cronstring);
    }
}

function deleteCronJob(id) {
    console.log('Killing cronjob '+id);
    if(cronjobs[id]){
        cronjobs[id].stop();
    }
    delete cronjobs[id];
}
