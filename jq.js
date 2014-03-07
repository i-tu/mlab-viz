jQuery(function ($) {
    'use strict';

    var App = {

        init: function() {
          cacheElements();
        },

        cacheElements: function() {
           $.getJSON( "data/data.json",
                function( data ) {
                  JSON.stringify(data);

                  var items = [];
                  $.each( data.classes, function( key, val ) {
                    items.push( "<li id='" + key + "'>" + val.name + "</li>" );
                  });

                $('#classes').append( items.join('') );

                  items = [];
                  $.each( data.skills, function( key, val ) {
                    items.push( "<li id='" + key + "'>" + val.name + "</li>" );
                  });

                $('#skills').append( items.join('') );
                }
        };

    App.init();
});