var margin = {top: 20, right: 40, bottom: 40, left: 40};
var width = $(window).width()// - margin.left - margin.right;
var height = $(window).height()// - margin.top - margin.bottom;
var tdur = 1000;

queue().defer(d3.json, 'data/data.json')
       .await(ready);

function ready(error, jsonData){
  
    var tickLimit = Math.pow(jsonData.students[0].length, 2);
    var skills;
    var students;
    var nodeBaseRad = 40;
    var container = d3.select('#content')
    var stDDContainer = d3.select('#studentDropdown');
    var skDDContainer = d3.select('#skillDropdown');
    var clDDContainer = d3.select('#classDropdown');

    var xScale = d3.scale.linear()
                   .domain([d3.min(jsonData.students, function(d) { return d.x; }),
                            d3.max(jsonData.students, function(d) { return d.x; })])
                   .range([ margin.left, width - margin.right]);
   
    var yScale = d3.scale.linear()
                   .domain([d3.min(jsonData.students, function(d) { return d.y; }),
                            d3.max(jsonData.students, function(d) { return d.y; })])
                   .range([ height - margin.top, margin.bottom ]);

    var tip = d3.select("body")
                .append("div")   
                .attr("class", "tooltip")               
                .style("opacity", 0);;

    var svg = d3.select("body")
                .append("svg")
                .attr("width", width)
                .attr("height", height)

    var changeColor = (function(){
      return function(){
        d3.select(this).style('fill', 'rgb(255,0,0)');
      }})();

    
    // Common pattern: append objects into container as type
    function createInstances(container, objects, type){
        return container.selectAll(type)
                        .data(objects)
                        .enter()    
                        .append(type);
    };

    // Create student divs and define default behaviour
    function createStudents (object){
        object.attr('class', 'student')
              .attr('category',    function(d){ return d.category; })
              .style('background', function(d){ return 'url(imgs_40/' + (d.name).replace(' ','%20') + '.png)'; })
              .style('left',       function(d){ return xScale(d.x) + 'px'; })
              .style('top',        function(d){ return yScale(d.y) + 'px'; })
              .style('opacity', 0)
              .on('mouseover', showTip)
              .on('mouseout', hideTip)
              .on('click', makeRelatedAppear)
              .each(createLinks);
    };

    function createLinks (d){
      /*_.each(d, function(e){
          svg.append("line")
             .style("stroke", "black")
             .attr("x1", function(g){return g.x;})
             .attr("y1", 0)
             .attr("x2", 1000)
             .attr("y2", 1000);
           });*/
    };

    // Create skill divs and define default behaviour
    function createSkills(object){
      object.attr('class', 'skill')
            .attr('opacity', 0)
            .style('left', function(d){ return xScale(d.x) + 'px'; })
            .style('top', function(d){ return yScale(d.y) + 'px'; })
            .text( function(d){ return d.name; } )
            .on('click', highlightSkill);
    };

    function createDropdown(object, action){
      object.text(function(d){ return d.name; })
            .on('click', action);
    };

    function showTip(d){
      tip.html(d.name)
         .style("left", (d3.event.pageX) + "px")
         .style("top", (d3.event.pageY - 28) + "px");
     
      tip.transition()        
         .duration(200)
         .style("opacity", 0.9);
     };
    
    function hideTip(d){
      tip.transition()
         .duration(200)
         .style("opacity", 0);
     };
      
    function disappear(d){
      d.transition()
       .duration(tdur)
       .style('opacity',0);
    };

    function appear(d){
      d.transition()
       .duration(tdur)
       .style('opacity', 1);
    };

    function glow(d){
      d.transition()
       .duration(tdur)
       .style('border-color', '#000000')
    };

    function unglow(d){
      d.transition()
       .duration(tdur)
      .style('border-color', '#FFFFFF')
    };

    // These define groups. negations could be defined in terms of 
    function studentsWithSkill(s){
      return students.filter(function(d){ return $.inArray(s.id, d.skills) !== -1; });
    };

    function studentsNotWithSkill(s){
      return students.filter(function(d){ return $.inArray(s.id, d.skills) === -1; });
    };

    function studentsInClass(c){
      return students.filter(function(d){ return d.category === c; });
    };

    function studentsNotInClass(c){
      return students.filter(function(d){ return d.category !== c; });
    };

    function skillInClass(c){
      return skills.filter(function(d){ return c.skills[d.id] !== 0; });
    };

    function skillNotInClass(c){
      return skills.filter(function(d){ return c.skills[d.id] === 0; });
    };

    function skillsInSkillset(skillSet){
      return skills.filter(function(d){ return $.inArray(d.id, skillSet) !== -1; });
    };

    function skillsNotInSkillset(skillSet){
      return skills.filter(function(d){ return $.inArray(d.id, skillSet) === -1; });
    };

    function skillsRelatedToStudents(s){
      return skillsInSkillset(_.union(_.flatten(_.map(s[0], function(d){ return d.__data__.skills; }))));
    };

    function skillsNotRelatedToStudents(s){
      return skillsNotInSkillset(_.union(_.flatten(_.map(s[0], function(d){ return d.__data__.skills; }))));
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

    // Force directed stuff
//    var force = d3.layout.force()
  //                .size([width, height]);



    function resetViz(){
      appear(students);
      appear(skills);
    };

  function constrain(x, lo, hi) {
    return Math.min(Math.max(x, lo), hi);
  };

    function startViz(){

      skills = createInstances(container, jsonData.skills, 'text');
      createSkills(skills);
      skills.transition().duration(tdur).style('opacity', 1);

      students = createInstances(container, jsonData.students, 'div');
      createStudents(students);
      students.transition().duration(tdur).style('opacity', 1);

      studentDropdown = createInstances(stDDContainer, jsonData.students, 'li');
      createDropdown(studentDropdown, makeRelatedAppear);

      skillDropdown = createInstances(skDDContainer, jsonData.skills, 'li');
      createDropdown(skillDropdown, highlightSkill);

      classDropdown = createInstances(clDDContainer, jsonData.classes, 'li');
      createDropdown(classDropdown, highlightClass);


      var force = d3.layout.force()
        .nodes((  jsonData.students).concat(jsonData.skills))
        .linkDistance(50)
        .charge(-120)
        .friction(0.7)
        .alpha(0.05)
        .size([width, height])
        .start();


      force.on('tick', function(e) {
        skills.style('left', function(d){ 
         // d.x = constrain(d.x, margin.left, width-margin.right);
          return d.x + 'px';
        })
        .style('top',  function(d){
          d.y = constrain(d.y, 0, height-margin.bottom - margin.top);
          return d.y + 'px'; });

        students.style('left', function(d){
        //  d.x = constrain(d.x, margin.left, width-margin.right);
          return d.x + 'px';
        })
        .style('top',  function(d){
          d.y = constrain(d.y, 0, height-margin.bottom);
          return d.y + 'px'; });


      });

    };

    $('#hdr').on('click', resetViz);

    startViz();
};
