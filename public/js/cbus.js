var classon = "item-on";
var classoff = "item-off";

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
              //console.log(data[i].group+" is valid with: "+data[i].status);
              //console.log('adding '+data[i].group);
              if (!data[i].name){
                 data[i].name = "Group "+data[i].group;
              }
              var newItem = $('<div onclick="clicker('+data[i].group+')" id="group'+data[i].group+'" status="'+data[i].status+'" level="'+data[i].level+'" class="item '+thisclass+'" location="'+convertToSlug(data[i].location)+'" groupname="'+convertToSlug(data[i].name)+'"><div class="element"><p class="level">'+data[i].level+'</p><h3 class="name">'+data[i].name+'</h3><p class="location">'+data[i].location+'</p><p class="group">ID: '+data[i].group+'</p></div></div>');
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
    console.log(data);
    if (data.type == 'update_status') {
        var elem = $('#group'+data.group);
        $('#group'+data.group).attr("status", data.status);
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

function clicker(id) {
    var elem = $('#group'+id);
    var currval = elem.attr("status");
    if(currval=="off") {
        turnme = "on";

        // send these to the api
        apilevel = 100;
        apidelay = 0;
        apitimeout = 0;

        elem.removeClass(classoff);
        elem.addClass(classon);
        elem.attr("status", "on");
        elem.attr("level", "100");
        elem.find('div.element > p.level').html("100");
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
    $container.isotope( 'updateSortData', elem ).isotope();
    //window.scrollTo(0, 0);
};
