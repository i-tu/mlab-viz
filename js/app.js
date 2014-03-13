var margin = {top: 50, right: 50, bottom: 50, left: 50};
var width = $("#content").width() - margin.left - margin.right;
var height = $(window).height() - margin.top - margin.bottom;

function profileText( d ) {
    return "<strong>" + d.name + "</strong>";
};

var profileTooltip = d3.tip().attr('class', 'profile')
                             .offset([-20, 0])
                             .html( profileText );

var svgContainer = d3.select("#content")
                    .append("svg")
                    .attr("width", width)
                    .attr("height", height)
                    //.append("g")
                    //.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
                    .call(profileTooltip);

queue().defer(d3.json, 'data/data.json')
       .await(ready);

function ready(error, jsonData){
    console.log(jsonData);
    function translation(d){
        return "translate(" + xScale(d.x) + "," + yScale(d.y) + ")";
    };

    var xScale = d3.scale.linear()
                   .domain([d3.min(jsonData.students, function(d) { return d.x; }),
                            d3.max(jsonData.students, function(d) { return d.x; })])
                   .range([ 0, width ]);
   
    var yScale = d3.scale.linear()
                   .domain([d3.min(jsonData.students, function(d) { return d.y; }),
                            d3.max(jsonData.students, function(d) { return d.y; })])
                   .range([ height, 0 ]);


    function createInstances( objects, type ){
        return svgContainer.selectAll(type)
                           .data(objects)
                           .enter()
                           .append(type)
                           .attr("x", function(d){return xScale(d.x);})
                           .attr("y", function(d){return yScale(d.y);})
                           .attr("transform", translation);
    };

    function colorCode(object){
        var r = 0;
        var g = 0;
        var b = 0;

        if(object.cat <= 10){
            r = 255 - object.cat*10;
        }
        else if(object.cat <= 15){
            g = 255 - (object.cat-10)*10;
        }
        else if(object.cat <= 18){
            b = 255 - (object.cat-18)*10;
        }

        return "rgb("+r+","+g+","+b+")";
    };

    function createStudents (object){
        object.attr("class", "student")
              .attr("category", function(d){return d.category;})
              .attr("r", 15)//function (d) { return 10; })
              .style("fill", colorCode )
              .style("stroke", "rgb(0,0,0)")
              .attr("opacity", 0)
              .on('mouseover', profileTooltip.show)
              .on('mouseout', profileTooltip.hide)
              .on('click', clicky );
    };

    function clicky(d){
        console.log(d.name);
    };

    var changeColor = (function(){
        return function(){
            d3.select(this).style("fill", "rgb(255,0,0)");
        }
    })();
    
    function createSkills(object){
        object.attr("text-anchor", "middle")
              .html( function(d){return d.name;} );
    };


    function selectClass( c ) {
        d3.select("#" + c);
    };

    function createSidebar(d){

        d3.select("#buttons")
          .selectAll("button")
          .data(d)
          .enter() 
          .append("button")
          .attr("type", "button")
          .attr("class", "btn btn-default")
          .text(function(d){ return d; })
     //     .on("click", make);
    };


    var students = createInstances( jsonData.students, "circle");
    createStudents(students);
    students.transition().duration(1000).attr("opacity", 1).attr("r", 10);


    var skills  = createInstances( jsonData.skills, "text");
    createSkills(skills);
    
    createSidebar( jsonData.classes );

    console.log(students.select(function(d){return d.category.equals("ma10");}))
        //.style("fill","rgb(255,255,0)"));
    

};
