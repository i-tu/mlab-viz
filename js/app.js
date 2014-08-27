var margin = {top: 50, right: 20, bottom: 20, left: 20};
var width = $("#content").width() - margin.left - margin.right;
var height = $(window).height() - margin.top - margin.bottom;
var tdur = 1000;

queue().defer(d3.json, 'data/data.json')
       .await(ready);

function ready(error, jsonData){

    var xScale = d3.scale.linear()
                   .domain([d3.min(jsonData.students, function(d) { return d.x; }),
                            d3.max(jsonData.students, function(d) { return d.x; })])
                   .range([ 0,width]); //margin.left, width - margin.right ]);
   
    var yScale = d3.scale.linear()
                   .domain([d3.min(jsonData.students, function(d) { return d.y; }),
                            d3.max(jsonData.students, function(d) { return d.y; })])
                   .range([ height - margin.top, margin.bottom ]);

    function createInstances(container, objects, type){
        return container.selectAll(type)
                        .data(objects)
                        .enter()    
                        .append(type);
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
              .style("background", function(d){ return "url(imgs_40/" + (d.name).replace(' ','%20') + ".png)";})
              .style("stroke", colorCode)
              .style("left", function(d){ return xScale(d.x) + "px";})
              .style("top", function(d){return yScale(d.y) + "px";})
              .style("opacity", 0)
            /*
              .on('mouseover', profileTooltip.show)
              .on('mouseout', profileTooltip.hide)
            */
              .on('click', makeRelatedAppear );
    };

    var changeColor = (function(){
      return function(){
        d3.select(this).style("fill", "rgb(255,0,0)");
      }})();
    
    function createSkills(object){
      object.attr("class", "skill")
            .attr("opacity", 0)
            .style("left", function(d){return xScale(d.x) + "px";})
            .style("top", function(d){return yScale(d.y) + "px";})
            .text( function(d){return d.name;} )
            .on('click', highlightSkill );     
    };

    function disappear(d){
      d.transition()
       .duration(tdur)
       .style("opacity",0);
    };

    function appear(d){
      d.transition()
       .duration(tdur)
       .style("opacity", 1);
    };

    function studentsWithSkill(s){
      return students.filter(function(d){return $.inArray(s.id, d.skills) !== -1;});
    };

    function studentsNotWithSkill(s){
      return students.filter(function(d){return $.inArray(s.id, d.skills) === -1;});
    };

    function studentsInClass(c){
      return students.filter(function(d){ return d.category === c; });
    };

    function studentsNotInClass(c){
      return students.filter(function(d){ return d.category !== c; });
    };

    function skillInClass(c){
      return skills.filter(function(d){return c.skills[d.id] !== 0;});
    };

    function skillNotInClass(c){
      return skills.filter(function(d){return c.skills[d.id] === 0;});
    };

    function skillsInSkillset( skillSet ){
      return skills.filter(function(d){return $.inArray(d.id, skillSet) !== -1;});
    };

    function skillsNotInSkillset( skillSet ){
      return skills.filter(function(d){return $.inArray(d.id, skillSet) === -1;});
    };

    function skillsRelatedToStudents(s){
      return skillsInSkillset(_.union(_.flatten(_.map(s[0], function(d){return d.__data__.skills;}))));
    };

    function skillsNotRelatedToStudents(s){
      return skillsNotInSkillset(_.union(_.flatten(_.map(s[0], function(d){return d.__data__.skills;}))));
    };

    function makeRelatedAppear(student){
       disappear(skillsNotInSkillset(student.skills));
       appear(skillsInSkillset(student.skills));

       disappear(studentsNotInClass(student.category));
       appear(studentsInClass(student.category));

       describe(student.name + '\'s network.');
    };

    function highlightClass(c){
      disappear(skillNotInClass(c));
      appear(skillInClass(c));

      disappear(studentsNotInClass(c.name));
      appear(studentsInClass(c.name));

      describe('Class of ' + c.name);
    };

    function highlightSkill(s){
      disappear(studentsNotWithSkill(s));
      appear(studentsWithSkill(s));

      disappear( skillsNotRelatedToStudents( studentsWithSkill(s) ));
      appear( skillsRelatedToStudents( studentsWithSkill(s) ));

      describe('People interested in ' + s.name + ' and their interests.')
    };

    function describe(desc){
      $('#hdr').text(desc);
    };

    function createSidebar(d){

      var getID = function(x) { return "class_" + x.name.slice(-2); };
      var getYear = function(x) {return "Class of 20" + x.name.slice(-2);};
      var getIcon = function(x) {
        var icon = "";

        if(x.indexOf("Sound") > -1)
          icon = "headphones";
        else if(x.indexOf("Games") > -1)
          icon = "tower";
        else if(x.indexOf("ma") > -1)
          icon = "asterisk";
        else
          icon = "briefcase";

        return "glyphicon glyphicon-" + icon;
      };

      d3.select("#buttonYears")
        .selectAll("btn-group")
        .data( _.uniq(d))//_.map(d, getID)) )
        .enter()
        .append("p")
        .text( getYear )
        .append("btn-group")
        .attr("type", "button-group")
        .attr("class", "btn-group btn-group-sm")
        .attr("id", getID);

      _.each( _.groupBy(d, getID), function(x) {
        d3.select("#" + getID(x[0]) )
          .selectAll("button")
          .data(x)
          .enter()
          .append("button")
          .attr("type", "button")
          .attr("class", "btn btn-default btn-sm")
          .append("span")
          .attr("class", function(x){ return getIcon(x.name); })
          .on("click", highlightClass );
      } );
    };

    function layoutStudents(){
      force = d3.layout.force()
                       .nodes(students)
                       .on("tick", move)                       
                       .gravity(0)
                       .charge(1)
                       .friction(0.87)
                       .start();
    };

    function move(){
      students.style("left", function(d){return d.x + "px";})
              .style("top",  function(d){return d.y + "px";});
    };

    function profileText( d ) {
      return "<strong>" + d.name + "</strong>";
    };

    function resetViz(){
      appear(students);
      appear(skills);
    };
    
    var force;

    function startViz(){
      skills  = createInstances(container, jsonData.skills, "text");
      createSkills(skills);
      skills.transition().duration(tdur).style("opacity", 1);

      students = createInstances(container, jsonData.students, "div" );
      createStudents(students);
      students.transition().duration(tdur).style("opacity", 1)

      createSidebar( jsonData.classes );
      layoutStudents();
    };

    $('#hdr').on('click', resetViz);

    var container = d3.select("#content")
                         .attr("width", width)
                         .attr("height", height);
    var skills;
    var students;

    startViz();
};
