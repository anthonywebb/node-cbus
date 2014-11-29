var classon = "item-on";
var classoff = "item-off";

// DIM THE LIGHTS STUFF
var pos, thisid;
var speed = 2.8;
var moved = false;

var $container = $('#content');

$(document).ready(function(){
  // get the devices from the server
  console.log("I am ready");
  $.getJSON('/devices',
      function( data ) {
          //console.log(data);

          // load all the known devices into the grid
          for(var i=0;i<data.length;i++) {

              if(data[i].level==0){
                  thisclass = classoff;
              }
              else{
                  thisclass = classon;
              }

              if (!data[i].name){
                 data[i].name = "Group "+data[i].group;
              }
              if(data[i].level>0){
                data[i].status = 'on';
              } else {
                data[i].status = 'off';
              }
              var newItem = $('<div onclick="adjustLevel('+data[i].group+')" id="'+data[i].group+'" status="'+data[i].status+'" level="'+data[i].level+'" class="item '+thisclass+'" location="'+convertToSlug(data[i].location)+'" groupname="'+convertToSlug(data[i].name)+'"><div class="element"><p class="level">'+data[i].level+'</p><h3 class="name">'+data[i].name+'</h3><p class="location">'+data[i].location+'</p><p class="group">ID: '+data[i].group+'</p></div></div>');
              $('#content').isotope( 'insert', newItem );
              //console.log('added '+newItem);
          }
      }
  );

  $.getJSON('/locations',
      function( data ) {
          //console.log(data);

          // load all the known devices into the grid
          for(var i=0;i<data.length;i++) {
              var locname = data[i];
              //console.log(locname);
              if(locname){
                  var selector = 'div[location=\''+convertToSlug(locname)+'\']';
                  var newItem = $('<li><a href="#" data-filter="'+selector+'">'+locname+'</a></li>');
                  $('#filters').append( newItem );
                  //console.log('added '+newItem);
              }

          }
      }
  );

  // filter items when filter link is clicked
  $('#filters').on('click','a',function(event){
      var selector = $(this).attr('data-filter');
      //console.log('filtering for: '+selector);
      $('#content').isotope({ filter: selector });
      $('#roomlabel').html($(this).text());
      $('#searchbox').val('');
  });

  $.getJSON('/scenes',
      function( data ) {
          //console.log(data);

          // load all the known devices into the grid
          for(var i=0;i<data.length;i++) {
              var scene = data[i];
              //console.log(locname);

              var newItem = $('<li><a href="#" data-scene="'+scene.id+'">'+scene.name+'</a></li>');
              $('#scenes').append( newItem );
              //console.log('added '+newItem);

          }
      }
  );

  // filter items when filter link is clicked
  $('#scenes').on('click','a',function(event){
      var sceneid = $(this).attr('data-scene');
      $.getJSON('/cmd/scene/'+sceneid);
  });


  $('#searchbox').keydown($.debounce( 250, findthis ));

  // listen for a div click
  $(document).on(TouchMouseEvent.UP,function(event){
    
    $(document).unbind(TouchMouseEvent.MOVE);
    if(moved) {
        //alert('dimming '+thisid+' to '+pos.toFixed());
        adjustLevel(thisid, pos.toFixed());
    }
    
  });

  $(document).delegate('.item',TouchMouseEvent.DOWN,function(event){
      var previous_x_position = event.pageX;
      thisid = this.id;
      moved = false;
      pos = parseInt($('#'+thisid).attr('level'));

      // add mouse move
      $(document).bind(TouchMouseEvent.MOVE,function(event){
        moved = true;
        var x_position = event.pageX;

          // we are moving right  
        if(previous_x_position < x_position)
        {
            if(pos<100) {
                pos = pos + speed;
            }         
        }

          // we are moving left
        else if (previous_x_position > x_position)
        {
            if(pos>0) {
                pos = pos - speed;
            }
        }

          // set some absolute maximums
          if(pos>100)pos=100;
          if(pos<0)pos=0;
        
         $('#'+thisid).attr('level',pos.toFixed());
         $('#'+thisid+' .level').html(pos.toFixed());
         previous_x_position = x_position;
      })
  })


});

function findthis(){
    var searchval =  $('#searchbox').val().trim();
    if(searchval.length){
        var selector = 'div[location*=\''+convertToSlug(searchval)+'\'],div[groupname*=\''+convertToSlug(searchval)+'\']';
        $('#content').isotope({ filter: selector });
    }
    else{
        $('#content').isotope({ filter: '*' });
    }
    $('#roomlabel').html('All Rooms');

}

function convertToSlug(Text)
{
    return Text
        .toLowerCase()
        .replace(/[^\w ]+/g,'')
        .replace(/ +/g,'-')
        ;
}

// REALTIME SOCKET STUFF

var socket = io.connect();

socket.on('connect', function (data) {
  console.log('connected to socket.io');
  // bootstrap
});

socket.on('statusStream', function (data) {
    //console.log(data);
    if (data.type == 'update_status') {
        var elem = $('#'+data.group);

        if(data.level==0){
            data.status = 'off';
            elem.removeClass(classon);
            elem.addClass(classoff);
            elem.attr("level", "0");
            elem.find('div.element > p.level').html("0");
        }
        else {
            data.status = 'on';
            data.level = data.level;
            elem.removeClass(classoff);
            elem.addClass(classon);
            elem.attr("level", data.level);
            elem.find('div.element > p.level').html(data.level);
        }

        $('#'+data.group).attr("status", data.status);

        updateData(elem);

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

$container.isotope({
  // options
  itemSelector : '.item',
  sortBy : 'level',
  sortAscending : false,
  layoutMode: 'cellsByRow',
  cellsByRow: {
    columnWidth: 120,
    rowHeight: 120
  },
  getSortData : {
    level : function ( $elem ) {
      return parseInt($elem.find('.level').text());
    },
    location : function ( $elem ) {
      return $elem.find('.location').text();
    }
  }
});

// if no dimlevel is specified, the light will toggle on/off
function adjustLevel(id, dimlevel) {
    if(moved==true && !dimlevel){
      //console.log('this is a dim event, not a click');
      return;
    }
    var elem = $('#'+id);
    var currval = elem.attr("status");
    if(currval=="off" || dimlevel > 0) {
        turnme = "on";

        // send these to the api
        apilevel = 100;
         
        // if they specified a dimlevel, use that instead of 100
        if(dimlevel) {
          apilevel = dimlevel;
          turnme = "dim to "+dimlevel;
        }
      
        apidelay = 0;
        apitimeout = 0;

        elem.removeClass(classoff);
        elem.addClass(classon);
        elem.attr("status", "on");
        elem.attr("level", apilevel);
        elem.find('div.element > p.level').html(apilevel);
    }
    else {
        turnme = "off";

        // send these to the api
        apilevel = 0;
        apidelay = 0;
        apitimeout = 0;

        elem.removeClass(classon);
        elem.addClass(classoff);
        elem.attr("status", "off");
        elem.attr("level", "0");
        elem.find('div.element > p.level').html("0");
    }

    updateData(elem);

    console.log("Turning "+id+" "+turnme);
    $.getJSON('/cmd?device='+id+'&level='+apilevel+'&timeout='+apitimeout+'&delay='+apidelay);
};

function updateData(elem){
  //console.log('sorting the grid');
  $container.isotope( 'updateSortData', elem ).isotope();
  //window.scrollTo(0, 0);
};
