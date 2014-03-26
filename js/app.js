var margin = {top: 50, right: 20, bottom: 20, left: 20};
var width = $("#content").width() - margin.left - margin.right;
var height = $(window).height() - margin.top - margin.bottom;
var tdur = 1000;

queue().defer(d3.json, 'data/data.json')
       .await(ready);

function ready(error, jsonData){

    function translation(d){
        return "translate(" + xScale(d.x) + "," + yScale(d.y) + ")";
    };

    var xScale = d3.scale.linear()
                   .domain([d3.min(jsonData.students, function(d) { return d.x; }),
                            d3.max(jsonData.students, function(d) { return d.x; })])
                   .range([ margin.left, width - margin.right ]);
   
    var yScale = d3.scale.linear()
                   .domain([d3.min(jsonData.students, function(d) { return d.y; }),
                            d3.max(jsonData.students, function(d) { return d.y; })])
                   .range([ height - margin.top, margin.bottom ]);


    function createInstances(objects, type){
        return svgContainer.selectAll(type)
                           .data(objects)
                           .enter()
                           .append(type)
                           .attr("x", function(d){return xScale(d.x);})
                           .attr("y", function(d){return yScale(d.y);})
    };

    function colorCode(object){
        var r=0, g=0, b=0;
        if(object.cat <= 10)     { r = 255 - object.cat*10;      }
        else if(object.cat <= 15){ g = 255 - (object.cat-10)*10; }
        else if(object.cat <= 18){ b = 255 - (object.cat-18)*10; }
        return "rgb("+r+","+g+","+b+")";
    };

    function createStudents (object){
        object.attr("class", "student")
              .attr("category", function(d){return d.category;})
              .attr("r", 15)
              .style("fill", colorCode )
              .style("stroke", "rgb(0,0,0)")
              .attr("opacity", 0)
              .attr("transform", translation)
              .on('mouseover', profileTooltip.show)
              .on('mouseout', profileTooltip.hide)
              .on('click', makeRelatedAppear );
    };

    var changeColor = (function(){
      return function(){
        d3.select(this).style("fill", "rgb(255,0,0)");
      }})();
    
    function createSkills(object){
      object.attr("text-anchor", "middle")
            .attr("opacity", 0)
            .text( function(d){return d.name;} )
            .on('click', highlightSkill );
    };

    function makeDisappear(d){
      d.transition()
       .duration(tdur)
       .attr("opacity",0)
       .attr("r",1);
    };

    function makeAppear(d){
      d.transition()
       .duration(tdur)
       .attr("opacity", 1)
       .attr("r", 15)
    }

    function skilledStudents(s){
      return students.filter(function(d){return $.inArray(s.id, d.skills) !== -1;});
    };

    function unSkilledStudents(s){
      return students.filter(function(d){return $.inArray(s.id, d.skills) === -1;});
    };

    function studentsInClass(className){
      return students.filter(function(d){ return d.category === className; });
    };

    function notStudentsInClass(className){
      return students.filter(function(d){ return d.category !== className; });
    };

    function skillInClass(c){
      return skills.filter(function(d){return $.inArray(d.id, c.skills) !== -1;});
    };

    function skillNotInClass(c){
      return skills.filter(function(d){return $.inArray(d.id, c.skills) === -1;});
    };

    function relatedSkills( skillSet ){
      return skills.filter(function(d){return $.inArray(d.id, skillSet) !== -1;});
    };

    function unRelatedSkills( skillSet ){
      return skills.filter(function(d){return $.inArray(d.id, skillSet) === -1;});
    };

    function skillsRelatedTo( studs ){
      return relatedSkills(_.union(_.flatten(_.map(studs[0], function(d){return d.__data__.skills;}))));
    };

    function skillsNotRelatedTo( studs ){
      return unRelatedSkills(_.union(_.flatten(_.map(studs[0], function(d){return d.__data__.skills;}))));
    };

    function makeRelatedAppear(student){
       makeDisappear(unRelatedSkills(student.skills));
       makeAppear(relatedSkills(student.skills));

       makeDisappear(notStudentsInClass(student.category));
       makeAppear(studentsInClass(student.category));
    };

    function highlightClass(c){
      makeDisappear(skillNotInClass(c));
      makeAppear(skillInClass(c))

      makeDisappear(notStudentsInClass(c.name));
      makeAppear(studentsInClass(c.name));
    };

    function highlightSkill(s){
      makeDisappear(unSkilledStudents(s));
      makeAppear(skilledStudents(s));

      makeDisappear( skillsNotRelatedTo( skilledStudents(s) ));
      makeAppear( skillsRelatedTo( skilledStudents(s) ));
    };

    function createSidebar(d){
      d3.select("#buttons")
        .selectAll("button")
        .data(d)
        .enter() 
        .append("button")
        .attr("type", "button")
        .attr("class", "btn btn-default")
        .text(function(d){ return d.name; })
        .on("click", highlightClass );
    };

    function profileText( d ) {
      return "<strong>" + d.name + "</strong>";
    };

    function resetViz(){
      makeAppear(students);
      makeAppear(skills);
    };

    var profileTooltip = d3.tip().attr('class', 'profile')
                                 .offset([-20, 0])
                                 .html( profileText );

    var svgContainer = d3.select("#content")
                         .append("svg")
                         .attr("width", width)
                         .attr("height", height)
                         .call(profileTooltip);

    var skills  = createInstances( jsonData.skills, "text");
    createSkills(skills);
    skills.transition().duration(tdur).attr("opacity", 1);

    var students = createInstances( jsonData.students, "circle" );
    createStudents(students);
    students.transition().duration(tdur).attr("opacity", 1).attr("r", 10);
    createSidebar( jsonData.classes );

};
