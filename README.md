### Overview
Wanting a way to control my clipsal lights over http I started this project to do just that.  At its core it is an easy web api to the cgate connector to my CNI.  A full web UI will be added in the future.

### Install
From the base directory of the project type:
```sh
$ npm install
```

### Configure
A sample configuration script can be found in the project.  Note that currently only the CGATE connector exists, but I do expect in the future to add direct CNI connection, and potentially others.

### Run
From the base directory of the project type: 
```sh
$ node server.js
```

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
