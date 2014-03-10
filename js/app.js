var margin = {top: 50, right: 50, bottom: 50, left: 50};
var width = $(window).width() - margin.left - margin.right;
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
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
                    .call(profileTooltip);

queue().defer(d3.json, 'data/data.json')
       .await(ready);

function ready(error, jsonData){
    
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


    function createInstances( objects, t ){
        return svgContainer.selectAll(t)
                           .data(objects)
                           .enter()
                           .append(t)
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
        object.append("circle")
              .attr("class", "student")
              .attr("r", function (d) { return 10; })
              .style("fill", colorCode )
              .style("stroke", "rgb(0,0,0)");

        svgContainer.selectAll("circle")
              .on('mouseover', profileTooltip.show)
              .on('mouseout', profileTooltip.hide);
    };

    function createSkills(object){
        object.attr("text-anchor", "middle")
              .html( function(d){return d.name;} );
    };
    
    var students = createInstances( jsonData.students, "g");
    createStudents(students);
    var skills  = createInstances( jsonData.skills, "text");
    createSkills(skills);
};
