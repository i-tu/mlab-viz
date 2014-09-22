
var width = $('#content').width();// - margin.left - margin.right;
var height = $(window).height() - $('#content').offset().top;// - margin.top - margin.bottom;

var borders = { left: 20, right: width - 60, top: 0, bottom: height - 40};
var w = borders.right - borders.left;
var h = borders.bottom - borders.top;

// J: We collect broken_images as an array, either it is read from data/broken_images.json to avoid failed loading attempts or it is created on the fly, so that it can be copy pasted from console to serve as a base for broken_images.json.  
var broken_images = [];

// J: These are needed to know what is the z-index to return to after an element has been lifted to large z-index for hover effect.
var person_z_index = 20;
var skill_z_index = 10;

// J: This flag is to tell if we are in force mode or if the elements should be in their original computed positions.  
var force_view = false;
// J: When in force mode, there is always one centered element. Store this here so that it can be reached in order to e.g. update where the center point of the screen is. 
var centered_element = null;

var tdur = 500;

// J: We add a new slider to fade away skills or people, to get better view on the other. 
var people_skills_slider = $("input.slider").slider();

// J: queue is now trying to read data/broken_images too.
// read data, and once it is read, call ready.
queue().defer(d3.json, 'data/data.json')
       .defer(d3.json, 'data/broken_images.json') // J:comment away if you don't have this file
       .await(ready);

function ready(error, jsonData, jsonBroken_images){
  if(error) console.log(error);
  /* DEFINITIONS */
  var skills;    // Skills d3 selection
  var people;    // People d3 selection
  var force;     // d3 force layout
  var forceNodes = []; // nodes & links for force layout
  var forceLinks = [];
  var people_moving = null;
  var skills_moving = null;
  // J: broken images is received from json.
  broken_images = (jsonBroken_images) ? jsonBroken_images.missing : [];

  // NOTE: most stuff is, unconventionally for d3, simple divs. the svg element is just to draw lines.
  var container = d3.select('#content');
  var svg = container.append('svg')
                     .attr("width", w)
                     .attr("height", h);

  var stDDContainer = d3.select('#peopleDropdown');
  var skDDContainer = d3.select('#skillDropdown');
  var clDDContainer = d3.select('#classDropdown');

  // J: since we update xScale and yScale quite often, took the min-max functions that return only one value, that shouldn't change and stored it as a variable.
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

  // J: moved tooltip to #content, because it is now positioned relative to elements that use #content's coordinates instead of previous mouse coordinates, that use document's coordinates.
  var tip = d3.select("#content")
              .append("div")   
              .attr("class", "tooltip")               
              .style("opacity", 0);
 

  // J: setting up slider. 
  var slider_last_value = 3;

  people_skills_slider.on('slide', update_people_skills_ratio);
  people_skills_slider.on('click', update_people_skills_ratio);
  people_skills_slider.on('slideStop', update_people_skills_ratio);

  // J: Resizing without reloading is kind of important. Enabling this has caused lots of changes around the code.
  // most important is that everywhere we are placing something to screen with d.x or d.y, we scale if with scaling function xScale or yScale. 
  // in principle, d.x and d.y should be untouchable: they are the original data, and we shouldn't modify it.
  // unfortunately, d3.force likes to use d.x and d.y for its own calculations, like you had noticed and some kind of x_original or xo value is required, so we can return it after d3.force has finished modifying our data.   
  $(window).resize(function (){
    set_scale();
    if (force_view) {
      moveToCenter(centered_element)
    } else {
      moveToStart(people);
      moveToStart(skills);      
    }
  });

  // J: This redefines all of the size-dependant variables set at the initialization. Called every time a resize event occurs.
  // J: The reference is changed to be #content instead of window, as this will be the reference point for coordinates anyway.     
  function set_scale() {

    width = $('#content').width() - 80// - margin.left - margin.right;
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
  }

  // J: This is a bit ugly handler for the slider, but it gets the work done  
  function update_people_skills_ratio() {
    v = $(this).slider('getValue');
    if (v != slider_last_value) {
      slider_last_value = v;
      resetViz();
      switch (v) {
        case 1: // Hide people, show only skills
          person_z_index = 10;
          skill_z_index = 20;
          people.style('display','block')
          .transition()
          .duration(tdur)
          .style({'opacity': 0, 'z-index': person_z_index})
          .each('end', function (d) {
            this.style.display = 'none';
          });
          skills.style('display','block')
          .transition()
          .duration(tdur)
          .style({'opacity': 1, 'z-index': skill_z_index});
          break;
        case 2: // People transparent and behind, skills on top
          person_z_index = 10;
          skill_z_index = 20;
          people.style('display','block')
          .transition()
          .duration(tdur)
          .style({'opacity': 0.5, 'z-index': person_z_index});
          skills.style('display','block')
          .transition()
          .duration(tdur)
          .style({'opacity': 1, 'z-index': skill_z_index});
          break;
        case 3: // Both visible, people on top
          person_z_index = 20;
          skill_z_index = 10;
          people.style('display','block')
          .transition()
          .duration(tdur)
          .style({'opacity': 1, 'z-index': person_z_index});
          skills.style('display','block')
          .transition()
          .duration(tdur)
          .style({'opacity': 1, 'z-index': skill_z_index});
          break;
        case 4: // People on top, skills transparent and behind
          person_z_index = 20;
          skill_z_index = 10;
          people.style('display','block')
          .transition()
          .duration(tdur)
          .style({'opacity': 1, 'z-index': person_z_index});
          skills.style('display','block')
          .transition()
          .duration(tdur)
          .style({'opacity': 0.5, 'z-index': skill_z_index});
          break;
        case 5: // Only people visible
          person_z_index = 20;
          skill_z_index = 10;
          people.style('display','block')
          .transition()
          .duration(tdur)
          .style({'opacity': 1, 'z-index': person_z_index});
          skills.style('display','block')
          .transition()
          .duration(tdur)
          .style({'opacity': 0, 'z-index': skill_z_index})
          .each('end', function (d) {
            this.style.display = 'none';
          });
          break;
      }
    }
  };


  function constrain(x, lo, hi) {
    return Math.min(Math.max(x, lo), hi);
  };


  /* BUILDING FUNCTIONS */
  // J: added a 'selector' argument that is separate from the 'type', as container may now have e.g. 
  // div.tooltip and div.person, and we are interested in one of them. Append(type) doesn't
  // recognize .class:s, so these arguments selector and type have to be different. This is all 
  // because .tooltip moved into #content -container.    
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
              // J: we use the broken_images array to avoid 'Failed to load resources' -errors
              if (broken_images.indexOf(img_url) == -1) {
                // If someone's picture is not present, add their initials to their node instead
                imageExists(img_url, function(u){
                  if (u) {
                    header.style('background', 'url(' + img_url + ')');
                  }
                  else {
                    header.text(function(e){
                        return e.name.split(' ').map(function (f) { return f.charAt(0); }).join('');
                    });
                    broken_images.push(img_url);
                  }
                });
              } else { // J: img_url was found in broken_images, put the placeholder initials 
                  header.text(function(e){
                      return e.name.split(' ').map(function (f) { return f.charAt(0); }).join('');
                  });
              }
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
  // J: Added some gravity and removed center locking for people. This creates a nice bouncy effect.
  function createForce () {
    return d3.layout.force()
      .charge( -3000 )
      .gravity( 0.2 )
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
    // This is where JQuery acts as Force Majore and saves the day,
    // since I can't get the damn thing to work otherwise.

    links = svg.selectAll("link")
               .data(forceLinks);

    links.enter()
         .append("line")
         .attr("class", "link")
  };

  /* TRANSITIONS */

  // J: Modified to use the position of person as a base of tooltip instead of mouse event.
  // Mouse event -based position depended on what direction the mouse pointer entered the
  // person's area and it looked haphazard, as sometimes the tag went over the face, and sometimes
  // beside the face  
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

  // J: Appear applies only to elements that are hidden or faded, and it also tries to put items back to their to original position. This double action is necessary, as there cannot be two separate transitions going on for one element. Movement to original position doesn't work well if the force visualization is on, so there is a condition for that. 
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

  // J: Animate moving back to original position  
  function moveToStart(s){
      s.each(function(d) { d.x = d.original_x; d.px = d.x; d.y = d.original_y; d.py = d.y; });
      s.transition()
        .duration(tdur*2)
        .style('left', function(d){  return xScale(d.x) + "px" })
        .style('top', function(d){ return yScale(d.y) + "px" });

  };

  // J: Store centered_element so it can be updated in resize -event
  function moveToCenter(s){
     centered_element = s;
     var center_x = (original_min_x + original_max_x) / 2
     var center_y = (original_min_y + original_max_y) / 2
     s.style('left', function(d) {
        d.px = center_x; 
        d.x = center_x;
        return xScale(d.x); + "px"})
      .style('top', function(d){  
        d.py = center_y;
        d.y = center_y;
        return yScale(d.y) + "px"; 
      });
  };

  function emptyForce(){
    force_view = false;
    $('svg').empty();
    // J: it is probably unnecessary to empty these here
    forceNodes = [];
    forceLinks = [];
    people_moving = null;
    skills_moving = null;
  };

  function unfix(){
    people.each(function(d){ d['fixed'] = false; })
    skills.each(function(d){ d['fixed'] = false; })
  };

  // J: refactored so that we can get 'people_moving' and 'skills_moving' selectors to be used in tick-method of force calculation.
  function startPeopleForce(center){
    unfix();
    //center['fixed'] = true;
    people_moving = people.filter(function (d) {
      return d.cat === center.cat;
    });
    skills_moving = skills.filter(function (d) {
      return _.contains(center.skills, d.id); 
    });
    forceNodes[center];
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
    force.nodes(forceNodes);
    force.links(forceLinks);
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

    forceNodes = [center];
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
    force.nodes(forceNodes);
    force.links(forceLinks);
    force.start();
  };

  function placeSkills(){
    var sForce = d3.layout.force()
         .gravity(0)
         .charge(-600)
         .nodes(jsonData.skills)
         .on('tick', function(){move(skills)});

         sForce.start();
         for(var i = 0;i < 3; i++)
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
    return skills.filter(function(d){ 
      return c.skills[d.id] !== 0; });
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

  // J: Data for classes seems to be broken, see Sound in NM -classes in original, none of them have Sound Design, though it is the most popular interest. Instead of using class data, this just counts the interests of people in that class.
  function highlightClass(c){
    describe('People in ' + c.name + ' and their interests');

    emptyForce(); // No force layout in class

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
      
  function imageExists(url, callback) {
    $('<img src="'+ url +'">').load(function() {
      callback( true );
    }).bind('error', function() {
      callback( false );
    });
  };

  /* START/RESET */
  function startViz(){

    skills = createInstances(container, 'text.skills', jsonData.skills, 'text');
    createSkills(skills);
    
    // J: disabled next one, as it is valuable to have the original SOM computation there too. Force networks are all kind of similar after seeing few, that SOM makes this more interesting 

    // Skills are layed out poorly so we place them with a couple ticks of force layout.
    //placeSkills();

    people = createInstances(container, 'div.people', jsonData.people, 'div');
    createPeople(people);

    addOriginalXY(people);
    addOriginalXY(skills);

    // J: appear now needs original_x and original_y, so moved them to after addOriginalXY 
    appear(people);
    appear(skills);

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

    // Create listeners for hover-events. We need to use jQuery, since slider overrides z-index definitions from css-file.  
    $('div.person').hover(function() {
      $(this).css('z-index', 200);
    }, function() { 
      $(this).css('z-index', person_z_index)
    });
    $('text.skill').hover(function() {
      $(this).css('z-index', 200);
    }, function() { 
      $(this).css('z-index', skill_z_index)
    });

    describe('This is Media Lab. Click on anything!');
  };

  function resetViz(){
    emptyForce();
    hideTip();
    moveToStart(people);
    moveToStart(skills);
    appear(people);
    appear(skills);
    describe('This is Media Lab. Click on anything!');
    // comment this away to get broken_images.json -data
    //console.log(JSON.stringify(broken_images));
  };

  startViz();
};
