### Overview
Wanting a way to control my clipsal lights over http I started this project to do just that.  At its core it is an easy web api to the cgate connector to my CNI.  A full web UI will be added in the future.

### Install
From the base directory of the project type:
```sh
$ npm install
```

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

From the web console, you may execute any cgate command you wish, for instance to toggle group 10 you may do something like:
```sh
lighting off //HOME/254/56/10
lighting on //HOME/254/56/10
```
If you are looking for a simple http endpoint to integrate with, the same cgate commands may also be sent over http by doing an HTTP GET to the /do endpoint like this:
```
http://localhost:8080/do?cmd=lighting on //HOME/254/56/10
```
