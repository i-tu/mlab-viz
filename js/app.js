queue().defer(d3.json, 'data/data.json')
       .defer(d3.json, 'data/broken_images.json')
       .await(ready);

function ready(error, jsonData, jsonBroken_images){
  if(error) console.log(error);
  
  var width, height, borders, w, h;
  var broken_images = [];

  var force_view = false;
  var centered_element = null;

  var tdur = 500;

  /* DEFINITIONS */
  var skills; // Skills d3 selection
  var people; // People d3 selection
  var force;  // D3 force layout
  var forceNodes = []; // Nodes & links for force layout
  var forceLinks = [];
  var people_moving = null;
  var skills_moving = null;

  broken_images = jsonBroken_images ? jsonBroken_images.missing : [];

  // NOTE: most stuff is, unconventionally for d3, simple divs. the svg element is just to draw lines.
  var container = d3.select('#content');
  var svg = container.append('svg');

  set_scale();

  var stDDContainer = d3.select('#peopleDropdown');
  var skDDContainer = d3.select('#skillDropdown');
  var clDDContainer = d3.select('#classDropdown');

  // Since we update xScale and yScale quite often, take min-max functions that return only one value, that shouldn't change and store it as a variable.
  var original_min_x = _.min([d3.min(jsonData.people, function(d) { return d.x; }), d3.min(jsonData.skills, function(d) { return d.x; })]);
  var original_min_y = _.min([d3.min(jsonData.people, function(d) { return d.y; }), d3.min(jsonData.skills, function(d) { return d.y; })]);
  var original_max_x = _.max([d3.max(jsonData.people, function(d) { return d.x; }), d3.max(jsonData.skills, function(d) { return d.x; })]); 
  var original_max_y = _.max([d3.max(jsonData.people, function(d) { return d.y; }), d3.max(jsonData.skills, function(d) { return d.y; })]);

  var xScale = d3.scale.linear()
                 .domain([original_min_x,
                          original_max_x])
                 .range([ borders.left, borders.right]);
 
  var yScale = d3.scale.linear()
                 .domain([original_min_y,
                          original_max_y])
                 .range([ borders.bottom, borders.top ]);

  var tip = d3.select("#content")
              .append("div")   
              .attr("class", "tooltip")               
              .style("opacity", 0);

   $(window).resize(function (){
    set_scale();
    if (force_view) {
      moveToCenter(centered_element)
    } else {
      moveToStart(people);
      moveToStart(skills);      
    }
  });

  // Redefines all of the size-dependant variables set at the initialization. Called every time a resize event occurs.
  function set_scale() {
    width = $('#content').width()
    height = $(window).height() - $('#content').offset().top - 40;    
    $('#content').height(height);
    
    borders = { left: 20, right: width - 60, top: 0, bottom: height - 40};

    w = borders.right - borders.left;
    h = borders.bottom - borders.top;

    xScale = d3.scale.linear()
                   .domain([original_min_x, original_max_x])
                   .range([ borders.left, borders.right]);
   
    yScale = d3.scale.linear()
                   .domain([original_min_y, original_max_y])
                   .range([ borders.bottom, borders.top ]);
    svg.attr("width", w).attr("height", h);
  };

  function constrain(x, lo, hi) {
    return Math.min(Math.max(x, lo), hi);
  };


  /* BUILDING FUNCTIONS */
  function createInstances(container, selector, objects, type){
    return container.selectAll(selector)
                    .data(objects)
                    .enter()    
                    .append(type);
  };

  function createPeople (object){
    object.attr('class', 'people')
          .attr('category', function(d){ return d.category; })
          .attr('cat', function(d){ return d.category; })
          .each(function(d){
            var header = d3.select(this);
            var img_url = 'imgs_40/' + (d.name).replace(' ','%20') + '.png';
            if (broken_images.indexOf(img_url) === -1)
                header.style('background', 'url(' + img_url + ')');
            else
                header.text(function(e){
                    return e.name.split(' ').map(function (f) { return f.charAt(0); }).join('');
                });
          })
          .style('left', function(d){ return xScale(d.x) + 'px'; })
          .style('top',  function(d){ return yScale(d.y) + 'px'; })
          .style('opacity', 0)
          .on('mouseover', showTip)
          .on('mouseout', hideTip)
          .attr('hover', 0)
          .on('click', highlightPerson);
  };

  function createSkills(object){
    object.attr('class', 'skill')
          .style('opacity', 0)
          .style('left', function(d){ return xScale(d.x) + 'px'; })
          .style('top', function(d){ return yScale(d.y) + 'px'; })
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

  // J: Moving only subsets of people and skills. Removed node and lines from initialization, they are added in startPeopleForce and startSkillsForce. 
  function createForce () {
    return d3.layout.force()
      .charge( -3000 )
      .gravity( 0 )
      .size([original_max_x - original_min_x, original_max_y - original_min_y])
      .on('tick', function(e) {
        if (skills_moving) {
          move(skills_moving);
        }
        if (people_moving) {
          move(people_moving);
        }
        move(centered_element);
        links.attr("x1", function(d) { return xScale(d.source.x) + 20; })
             .attr("y1", function(d) { return yScale(d.source.y) + 20; })
             .attr("x2", function(d) { return xScale(d.target.x) + 20; })
             .attr("y2", function(d) { return yScale(d.target.y) + 20; });
      });
  };

  function move(s){
    s.style('left', function(d){
      return constrain(xScale(d.x), borders.left, borders.right) + 'px';
    })
    .style('top',  function(d){
      return constrain(yScale(d.y), borders.top, borders.bottom) + 'px'; });
  };

  function createLinks(){
    links = svg.selectAll("link")
               .data(forceLinks);

    links.enter()
         .append("line")
         .attr("class", "link")
  };

  /* TRANSITIONS */

  function showTip(d){
    tip.html(d.name);
    var tip_w2 = parseInt(tip.style("width")) / 2;
    var tip_h = parseInt(tip.style("height"));
    tip.style("left", (xScale(d.x) - tip_w2 + 20) + "px")
       .style("top", (yScale(d.y) - tip_h + 2) + "px");
    tip.transition()        
       .duration(200)
       .style("opacity", 1.0);
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
     });
  };

  function appear(d){
    f = d.filter(function(e) {return (this.style.display === 'hidden' || this.style.opacity < 1.0) } );
    f.style('display', 'block')
     .each(function(d){ 
        d.x = d.original_x; 
        d.px = d.x; 
        d.y = d.original_y; 
        d.py = d.y; 
     })
     if (force_view) {
       f.transition()
        .duration(tdur)
        .style('opacity', 1)
        .each('end', function () {
         this.style.display = 'block';
       });
     } else {
       f.transition()
        .duration(tdur)
        .style('opacity', 1)
        .style('left', function(d){ return xScale(d.x) + "px" })
        .style('top', function(d){ return yScale(d.y) + "px" })
        .each('end', function () {
         this.style.display = 'block';
         this.style.left = xScale(d.x) + "px";
         this.style.top = xScale(d.y) + "px";
       });
     }
  };

  function describe(desc){
    $('#hdr').text(desc);
  };

  function moveToStart(s){
    s.each(function(d) { d.x = d.original_x; d.px = d.x; d.y = d.original_y; d.py = d.y; });
    s.transition()
     .duration(tdur*2)
     .style('left', function(d){ return xScale(d.x) + "px" })
     .style('top', function(d){ return yScale(d.y) + "px" });
  };

  function moveToCenter(s){
    centered_element = s;
    var center_x = (original_min_x + original_max_x) / 2
    var center_y = (original_min_y + original_max_y) / 2
    s.style('left', function(d) {
       d.px = center_x; 
       d.x = center_x;
       return xScale(d.x) + "px";
     })
     .style('top', function(d){  
       d.py = center_y;
       d.y = center_y;
       return yScale(d.y) + "px"; 
     });
  };

  function emptyForce(){
    force_view = false;
    $('svg').empty();
    while(forceNodes.length > 0) { forceNodes.pop(); }
    while(forceLinks.length > 0) { forceLinks.pop(); }
    people_moving = null;
    skills_moving = null;
  };

  function unfix(){
    people.each(function(d){ d['fixed'] = false; });
    skills.each(function(d){ d['fixed'] = false; });
  };

  function startPeopleForce(center){
    unfix();
    center['fixed'] = true;

    people_moving = people.filter(function (d) {
      return d.cat === center.cat;
    });

    skills_moving = skills.filter(function (d) {
      return _.contains(center.skills, d.id); 
    });

    forceLinks = [];
    people_moving.each(function(d) { 
      forceNodes.push(d);
      forceLinks.push({ source: center, target: d});
      d.px = d.x;
      d.py = d.y;
      }
    );

    skills_moving.each(function(d) { 
      forceNodes.push(d);
      forceLinks.push({ source: center, target: d});
      d.px = d.x;
      d.py = d.y;
      }
    );

    createLinks();

    force_view = true;
    force.start();
  };

  function findPerson(person){
    return people.filter(function(d){ return d.n === person.n; });
  };

  function findSkill(skill){
    return skills.filter(function(d){ return d.id === skill.id; });
  };

  // J: refactored so that we can get 'people_moving' and 'skills_moving' selectors to be used in tick-method of force calculation.
  function startSkillForce(center){
    unfix();
    center['fixed'] = true;

    people_moving = people.filter(function (d) {
      return _.contains( d.skills, center.id);
    });

    skills_moving = null;

    forceNodes.push(center);
    forceLinks = [];
    people_moving.each(function(d) { 
      forceNodes.push(d);
      forceLinks.push({ source: center, target: d});
      d.px = d.x;
      d.py = d.y;
      }
    );

    createLinks();

    force_view = true;
    force.start();
  };

  function placeSkills(){
    var sForce = d3.layout.force()
        .gravity(0)
        .charge(-600)
        .nodes(jsonData.skills)
        .on('tick', function(){move(skills)});

        sForce.start();
        for(var i = 0;i < 2; i++)
          sForce.tick();
        sForce.stop();
  };

  /* GROUPS */
  function peopleWithSkill(s){
    return people.filter(function(d){ return $.inArray(s.id, d.skills) !== -1; });
  };

  function peopleNotWithSkill(s){
    return people.filter(function(d){ return $.inArray(s.id, d.skills) === -1; });
  };

  function peopleInClass(c){
    return people.filter(function(d){ return d.cat === c; });
  };

  function peopleNotInClass(c){
    return people.filter(function(d){ return d.cat !== c; });
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

  function skillsRelatedToPeople(s){
    return skillsInSkillset(_.union(_.flatten(_.map(s[0], function(d){ return d.__data__.skills; }))));
  };

  function skillsNotRelatedToPeople(s){
    return skillsNotInSkillset(_.union(_.flatten(_.map(s[0], function(d){ return d.__data__.skills; }))));
  };


  /* ACTIONS */
  function highlightPerson(person){
    describe(person.name + '\'s interests and others in ' + person.category);
    emptyForce();

    moveToCenter(findPerson(person));
    startPeopleForce( person );

    disappear(skillsNotInSkillset(person.skills));
    appear(skillsInSkillset(person.skills));

    disappear(peopleNotInClass(person.cat));
    appear(peopleInClass(person.cat));

    hideTip();
  };

  function highlightSkill(skill){
    describe('People interested in ' + skill.name)
    emptyForce();

    moveToCenter(findSkill(skill));
    startSkillForce( skill );

    disappear(peopleNotWithSkill(skill));
    appear(peopleWithSkill(skill));

    appear( skills.filter(function(d){ return d.id === skill.id; } ));
    disappear( skills.filter(function(d){ return d.id !== skill.id; } ));

    hideTip();
  };

  function highlightClass(c){
    describe('People in ' + c.name + ' and their interests');
    emptyForce();

    var p = peopleInClass(c.cat);
    var not_p = d3.selectAll(_.difference(people[0], p[0]));

    var class_skills = skillsRelatedToPeople(p);
    var not_skills = d3.selectAll(_.difference(skills[0], class_skills[0]));

    moveToStart(people);
    moveToStart(skills);
    disappear(not_skills);
    appear(class_skills);
    disappear(not_p);
    appear(p);
    hideTip();
  };

  function addOriginalXY(s){
    s.each(function(d){
      d.original_x = d.x;
      d.original_y = d.y;
    });
  };
    
  /* START/RESET */
  function startViz(){
    skills = createInstances(container, 'text.skills', jsonData.skills, 'text');
    createSkills(skills);
    addOriginalXY(skills); 
    placeSkills(); // Skills are layed out poorly so we place them with a couple ticks of force layout. 

    people = createInstances(container, 'div.people', jsonData.people, 'div');
    createPeople(people);
    addOriginalXY(people);

    peopleDropdown = createInstances(stDDContainer, 'li', jsonData.people, 'li');
    createDropdown(peopleDropdown, highlightPerson);

    skillDropdown = createInstances(skDDContainer, 'li', jsonData.skills, 'li');
    createDropdown(skillDropdown, highlightSkill);

    classDropdown = createInstances(clDDContainer, 'li', jsonData.classes, 'li');
    createDropdown(classDropdown, highlightClass);

    links = createInstances(svg, 'link', [], 'link');
    force = createForce();

    $('#hdr').on('click', resetViz);
    $('#showAll').on('click', resetViz);

    resetViz();
  };

  function resetViz(){
    set_scale();
    emptyForce();
    hideTip();
    moveToStart(people);
    moveToStart(skills);
    appear(people);
    appear(skills);

    describe('This is Media Lab. Click on anything!');
  };

  startViz();
};
