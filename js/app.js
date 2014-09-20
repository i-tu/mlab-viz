
var width = $(window).width()// - margin.left - margin.right;
var height = $(window).height()// - margin.top - margin.bottom;

var borders = { left: 0, right: width-250, top: 0, bottom: height-150};

var tdur = 1000;

// read data, and once it is read, call ready.
queue().defer(d3.json, 'data/data.json')
       .await(ready);

function ready(error, jsonData){

    /* DEFINITIONS */
    var skills;
    var students;
    var center;

    var force;
    var forceNodes = [];
    var forceLinks = [];

    var container = d3.select('#content');
    var svg = container.append('svg')
                       .attr("width", width)
                       .attr("height", height);

    var stDDContainer = d3.select('#studentDropdown');
    var skDDContainer = d3.select('#skillDropdown');
    var clDDContainer = d3.select('#classDropdown');

    var xScale = d3.scale.linear()
                   .domain([d3.min(jsonData.students, function(d) { return d.x; }),
                            d3.max(jsonData.students, function(d) { return d.x; })])
                   .range([ 0, width  - 250]);
   
    var yScale = d3.scale.linear()
                   .domain([d3.min(jsonData.students, function(d) { return d.y; }),
                            d3.max(jsonData.students, function(d) { return d.y; })])
                   .range([ height - 150, 0 ]);

    var tip = d3.select("body")
                .append("div")   
                .attr("class", "tooltip")               
                .style("opacity", 0);
   
    function constrain(x, lo, hi) {
      return Math.min(Math.max(x, lo), hi);
    };


    /* BUILDING FUNCTIONS */
    function createInstances(container, objects, type){
        return container.selectAll(type)
                        .data(objects)
                        .enter()    
                        .append(type);
    };

    function createStudents (object){
        object.attr('class', 'student')
              .attr('category', function(d){ return d.category; })
              .attr('cat', function(d){ return d.category; })
              .each(function(d){
                var header = d3.select(this);
                var img_url = 'imgs_40/' + (d.name).replace(' ','%20') + '.png';

                imageExists(img_url, function(u){
                  if (u)
                    header.style('background', 'url(' + img_url + ')');
                  else
                    header.text(function(e){
                        return e.name.split(' ').map(function (f) { return f.charAt(0); }).join('');
                    });
                })
              })
              .style('left', function(d){ return d.x + 'px'; })
              .style('top',  function(d){ return d.y + 'px'; })
              .style('opacity', 0)
              .attr('ox', function(d){ return d.x; })
              .attr('oy', function(d){ return d.y; })
              .on('mouseover', showTip)
              .on('mouseout', hideTip)
              .attr('hover', 0)
              .on('click', highlightStudent);
    };

    function createSkills(object){
      object.attr('class', 'skill')
            .style('opacity', 0)
            .style('left', function(d){ return d.x + 'px'; })
            .style('top', function(d){ return d.y + 'px'; })
            .text( function(d){ return d.name; } )
            .on('click', highlightSkill);
    };

    function createDropdown(object, action){
      object.sort( function(a,b){ return a.name.localeCompare(b.name); } )
            .append('a')
            .attr('cat', function(d){ return d.cat; })
            .text(function(d){ return d.name; })
            .on('click', action);
    };

    function createForce () {
      return d3.layout.force()
        .nodes(forceNodes)
        .links(forceLinks)
        .charge( -3000 )
        .gravity( 0 )
        .friction(0.1)
        .linkDistance(100)
        .alpha(0.05)
        .size([width, height])
        .on('tick', function(e) {
          
          skills.style('left', function(d){ 
            d.x = constrain(d.x, borders.left, borders.right);
            return d.x + 'px';
          })
          .style('top',  function(d){
            d.y = constrain(d.y, borders.top, borders.bottom);
            return d.y + 'px'; });
          
          students.style('left', function(d){
            d.x = constrain(d.x, borders.left, borders.right);
            return d.x + 'px';
          })
          .style('top',  function(d){
            d.y = constrain(d.y, borders.top, borders.bottom);
            return d.y + 'px'; });

          links.attr("x1", function(d) { return d.source.x + 20; })
               .attr("y1", function(d) { return d.source.y + 20; })
               .attr("x2", function(d) { return d.target.x + 20; })
               .attr("y2", function(d) { return d.target.y + 20; });
        });

        forceNodes = force.node();
        forceLinks = force.links();
    };

    function createLinks(){
      links = svg.selectAll(".link")
                 .data(forceLinks)
                 .enter()
                 .append("line")
                 .attr("class", "link")
                 .style("stroke-width", function(d) { return Math.sqrt(d.value); });
    }

    /* TRANSITIONS */
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
       .style('opacity', 0)
       .each('end', function (d) {
         this.style.display = 'none';
         d.x = d.ox;
         d.y = d.oy;
       });
    };

    function appear(d){
      d.transition()
       .duration(tdur)
       .style('opacity', 1)
       .style('display', 'block')
       .each('end', function () {
         this.style.display = 'block';
       });
    };

    function describe(desc){
      $('#hdr').text(desc);
    };

    function moveToStart(s){
       s.style('left', function(d){ d.x = d.ox; return d.ox; })
        .style('top', function(d){ d.y = d.oy; return d.oy; });
    };

    function emptyForce(){
      force.stop();
      while(forceNodes.length > 0) { forceNodes.pop(); }
      while(forceLinks.length > 0) { forceLinks.pop(); }
    }

    function startStudentForce(center){
      emptyForce();

      var included = _.filter( jsonData.students, function(d){ return d.cat === center.cat; })
      .concat( _.filter( jsonData.skills, function(d){ return _.contains(center.skills, d.id); }));

      //moveToStart( students.filter(function(d){ return d.cat !== center.cat; }) );
      //moveToStart( skills.filter(function(d){ return _.contains(center.skills, )}))

      _.each(included, function(d){ forceNodes.push( d ); });
      _.each(included, function(d){ forceLinks.push({ source: center, target: d }); });

      createLinks();

      force.start();
    };

    function startSkillForce(center){
      emptyForce();
      
      var includedStudents = _.filter( jsonData.students, function(d){ return _.contains( d.skills, center.id) ; })
      
      //moveToStart( students.filter(function(d){ return _.contains( center.skills, d.id) ; }) );

      center['fixed'] = true;
      forceNodes.push(center);
      _.each(includedStudents, function(d){
        forceNodes.push( d );
        forceLinks.push({ source: center, target: d });
        _.each(d.skills, function(e){
          var leaf = _.filter(jsonData.skills, function(f){ return e === f.id; })[0]
          forceNodes.push(leaf);
          forceLinks.push({ source: d, target: leaf });
        }
      )});

      createLinks();

      force.start();
    };

    function placeSkills(){
      /*var sForce = d3.layout.force()
           .nodes(jsonData.skills)
           .on('tick', move(skills))
           .start();*/
    };

    /* GROUPS */
    function studentsWithSkill(s){
      return students.filter(function(d){ return $.inArray(s.id, d.skills) !== -1; });
    };

    function studentsNotWithSkill(s){
      return students.filter(function(d){ return $.inArray(s.id, d.skills) === -1; });
    };

    function studentsInClass(c){
      return students.filter(function(d){ return d.cat === c; });
    };

    function studentsNotInClass(c){
      return students.filter(function(d){ return d.cat !== c; });
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


    /* ACTIONS */
    function highlightStudent(student){
      describe(student.name + '\'s network.');

      startStudentForce( student );

      disappear(skillsNotInSkillset(student.skills));
      appear(skillsInSkillset(student.skills));

      disappear(studentsNotInClass(student.cat));
      appear(studentsInClass(student.cat));

      hideTip();
    };

    function highlightSkill(skill){
      describe('People interested in ' + skill.name + ' and their interests.')

      startSkillForce( skill );

      disappear(studentsNotWithSkill(skill));
      appear(studentsWithSkill(skill));

      disappear( skillsNotRelatedToStudents( studentsWithSkill(skill) ));
      appear( skillsRelatedToStudents( studentsWithSkill(skill) ));

      hideTip();
    };

    function highlightClass(c){
      describe('Class of ' + c.name);

      emptyForce(); // No force layout in class

      disappear(skillNotInClass(c));
      appear(skillInClass(c));
      disappear(studentsNotInClass(c.cat));
      appear(studentsInClass(c.cat));

      hideTip();
    };

    function addOriginalXY(s){
      _.each(s, function(d){
        d['ox'] = d.x;
        d['oy'] = d.y;
      });
    };

    function scale(s){
      _.each(s, function(d){
        d.x = xScale(d.x);
        d.y = yScale(d.y);
      });
    };
        
    function imageExists(url, callback) {
      $('<img src="'+ url +'">').load(function() {
        callback( true );
      }).bind('error', function() {
        callback( false );
      });
    };

    /* START/RESET */
    function startViz(){
      // Skills are layed out poorly so we place them with a couple ticks of force layout.
      scale(jsonData.students);
      scale(jsonData.skills);

      addOriginalXY(jsonData.students);
      addOriginalXY(jsonData.skills);

      placeSkills();

      skills = createInstances(container, jsonData.skills, 'text');
      createSkills(skills);

      appear(skills);

      students = createInstances(container, jsonData.students, 'div');
      createStudents(students);
      appear(students);

      studentDropdown = createInstances(stDDContainer, jsonData.students, 'li');
      createDropdown(studentDropdown, highlightStudent);

      skillDropdown = createInstances(skDDContainer, jsonData.skills, 'li');
      createDropdown(skillDropdown, highlightSkill);

      classDropdown = createInstances(clDDContainer, jsonData.classes, 'li');
      createDropdown(classDropdown, highlightClass);

      links = createInstances(svg, [], 'line');

      force = createForce();

      $('#hdr').on('click', resetViz);
      $('#showAll').on('click', resetViz);
    };

    function resetViz(){
      force.stop();
      hideTip();
      moveToStart(students);
      moveToStart(skills);
      appear(students);
      appear(skills);
    };

    startViz();
};
