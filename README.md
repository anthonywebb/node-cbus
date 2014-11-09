### Overview
Wanting a way to control my clipsal lights over http I started this project to do just that.  At its core it is an easy web api to the cgate connector to my CNI.  A full web UI will be added in the future.

### Install
From the base directory of the project type:
```sh
$ npm install
```

### Configure
A sample configuration script can be found in the project along with a "db.json" files.  Note that currently in the config only the CGATE connector exists, but I do expect in the future to add direct CNI connection, and potentially others.  The db.json file should give you a template of how to set up your devices, rules, tasks, etc.  Details can be found below.

### Run
From the base directory of the project type: 
```sh
$ node server.js
```

### Rules 
The rules engine will fire anytime there is a level change on a group.  Rules have an expression that will evaluate the javascript, and fire the command(s) associated with the rule.  The expression can use variables such as group level, or even some canned variables that are available such as sunset, sunrise, time, etc.  Here is an example of a rule that ramps up the hall light if motion is sensed in a given area after 11PM (and before dawn):
```
{
    "id":"1",
    "name":"Late night motion on",
    "expression":"group=='95' && level > 0 && (time > '23:00' || time < dawn)",
    "commands":[
        {"type":"lighting","group":"46","level":20,"delay":0,"timeout":0}
     ]
}
```

###Tasks 
Task are recurring tasks that should fire command(s) on a given interval.  In order to do that a CRON string is given which allows for very complex scheduled tasks to run at various intervals, on certain days, etc.  CRON strings seemed like a great way to do recurring tasks.  Here is an example that turns on the night lights every day of the week at 8:30PM:
```
{
    "id":"1",
    "name":"Turn on night lights",
    "cronstring":"00 30 20 * * 1-7",
    "expression":"",
    "commands":[
        {"type":"lighting","group":"46","level":20,"delay":0,"timeout":0}
    ]
}
```

### Scenes
Scenes are pretty straight forward, when triggered and array of commands are fired.  Here is a complex group of commands, first a light fades up to 20%, then there is a delay of 2 seconds, then a URL is called (callbacks can be useful), and finally a light comes up to 75%:
```
{
    "id":"3",
    "name":"Reading",
    "commands":[
        {"type":"lighting","group":"51","level":20,"delay":0,"timeout":0},
        {"type":"delay","delay":2},
        {"type":"url","url":"http://requestb.in/1jjdtu61"},
        {"type":"lighting","group":"53","level":75,"delay":0,"timeout":0}
     ]
}
```

### Commands 
As illustrated above commands are an array of things that should happen when a task happens, a rule is matched, or a scene fires.  Commands generally are just modifying the level of light, but each command has a "type" which allows for more flexible scenarios.  Other types include: lighting, delay, url, email, sms, etc.  Ever wanted to get a url callback when a button on the wall is pressed?  You can do that.  Need an SMS when motion is detected during certain hours? You can do that.  The command types should allow for a lot of use cases.  When using the lighting command you may also add a delay (which is the ramp delay), and/or also a timeout which allows the group to auto turn off after X seconds.

### Other
Once the project is running you may visit in a browser 
```
http://localhost:8080/console.htm
```

You will note that there are 3 different types of messages that will be send over the websocket.  The web console listens for all of them, but you may elect to listen on whichever channel(s) you feel you need.
```
controlStream
eventStream
statusStream
```

From the web console, you may execute any cgate command you wish, for instance to toggle group 10 you may do something like:
```sh
lighting off //HOME/254/56/10
lighting on //HOME/254/56/10
```
If you are looking for a simple http endpoint to integrate with, the same cgate commands may also be sent over http by doing an HTTP GET to the /do endpoint like this:
```
http://localhost:8080/do?cmd=lighting on //HOME/254/56/10
```
