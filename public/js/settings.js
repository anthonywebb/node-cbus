// POPULATE THE FORM WITH ENTRIES FOR EACH GROUP

$(document).ready(function(){
	$("#sortTable").tablesorter(); 
	
	// get the settings from the server
	$.getJSON('/settings', function(data){
        console.log(data);
        
        // load all the known devices into the grid
        for(var i=0;i<data.devices.length;i++) {
            var elem = data.devices[i];
            console.log(elem);
            
            var dispDate = '';
            if(elem.lastchange){
                dispDate = moment.unix(elem.lastchange).format('MM-DD HH:mm');
            }
            
            var dsp = '<tr><td><input type="hidden" name="id" value="'+elem.group+'">'+elem.group+'</td><td>'+dispDate+'</td><td>'+elem.changecount+'</td><td>'+elem.runtime.toHHMMSS()+'</td><td>'+Math.floor(elem.energyused)+'</td><td><input type="text" name="groupname" placeholder="Type a short name" value="'+elem.name+'"></td><td><input type="text" name="grouplocation" placeholder="Enter the location" value="'+elem.location+'"></td></tr>';
            $('#tblbody').append(dsp);
            
            $("#sortTable").trigger("update"); 
        }        
	});
	
	
});

Number.prototype.toHHMMSS = function () {
    sec_numb    = parseInt(this);
    var hours   = Math.floor(sec_numb / 3600);
    var minutes = Math.floor((sec_numb - (hours * 3600)) / 60);
    var seconds = sec_numb - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    var time    = hours+':'+minutes+':'+seconds;
    return time;
}

// WE WANT SOCKET.IO HERE TO MAKE ASSIGNING LIGHTS EASIER

var socket = io.connect('/');

socket.on('connect', function (data) {
    socket.emit('join_channel', "noderocks" );
});

socket.on('message', function (data) {
    console.log(data);
    if (data.type == 'update_status') {
        
        var msg = "Group " + data.group;
        
        if(data.name){
           msg = data.name;
        }
        
        if(data.location){
            msg = msg + ' in the ' + data.location;
        }
        
        msg = msg + ' is ' + data.status.toUpperCase();
        
        alertify.log(msg);
        
        
    }
});