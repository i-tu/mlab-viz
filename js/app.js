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
        return "translate(" + xScale(d.xCoord) + "," + yScale(d.yCoord) + ")";
    };

    var xScale = d3.scale.linear()
                   .domain([d3.min(jsonData.students, function(d) { return d.xCoord; }),
                            d3.max(jsonData.students, function(d) { return d.xCoord; })])
                   .range([ 0, width ]);
   
    var yScale = d3.scale.linear()
                   .domain([d3.min(jsonData.students, function(d) { return d.yCoord; }),
                            d3.max(jsonData.students, function(d) { return d.yCoord; })])
                   .range([ height, 0 ]);

    function createInstances( objects ){
        return svgContainer.selectAll("g")
                           .data( objects )
                           .enter()
                           .append("g")
                           .attr("x", function(d){return xScale(d.xCoord);})
                           .attr("y", function(d){return yScale(d.yCoord);})
                           .attr("transform", function(d){return translation(d);});
    };

    function createStudents (object){
        object.append("circle")
              .attr("class", "student")
              .attr("r", function (d) { return 10; })
              .style("fill", "black")
              
        svgContainer.selectAll("circle")
              .on('mouseover', profileTooltip.show)
              .on('mouseout', profileTooltip.hide);
    };

    var students = createInstances(jsonData.students);
    createStudents(students);
};
