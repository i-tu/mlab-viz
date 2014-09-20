
var width = $(window).width()// - margin.left - margin.right;
var height = $(window).height()// - margin.top - margin.bottom;

var borders = { left: 0, right: width-250, top: 0, bottom: height-150};

var tdur = 500;

// read data, and once it is read, call ready.
queue().defer(d3.json, 'data/data.json')
       .await(ready);

function ready(error, jsonData){

  /* DEFINITIONS */
  var skills;    // Skills d3 selection
  var people;    // People d3 selection
  var force;     // d3 force layout
  var forceNodes = []; // nodes & links for force layout
  var forceLinks = [];

  // NOTE: most stuff is, unconventionally for d3, simple divs. the svg element is just to draw lines.
  var container = d3.select('#content');
  var svg = container.append('svg')
                     .attr("width", width-250)
                     .attr("height", height-150);

  var stDDContainer = d3.select('#peopleDropdown');
  var skDDContainer = d3.select('#skillDropdown');
  var clDDContainer = d3.select('#classDropdown');

  var xScale = d3.scale.linear()
                 .domain([d3.min(jsonData.people, function(d) { return d.x; }),
                          d3.max(jsonData.people, function(d) { return d.x; })])
                 .range([ borders.left, borders.right]);
 
  var yScale = d3.scale.linear()
                 .domain([d3.min(jsonData.people, function(d) { return d.y; }),
                          d3.max(jsonData.people, function(d) { return d.y; })])
                 .range([ borders.bottom, borders.top ]);

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

  function createPeople (object){
      object.attr('class', 'people')
            .attr('category', function(d){ return d.category; })
            .attr('cat', function(d){ return d.category; })
            .each(function(d){
              var header = d3.select(this);
              var img_url = 'imgs_40/' + (d.name).replace(' ','%20') + '.png';

              // If someone's picture is not present, add their initials to their node instead
              imageExists(img_url, function(u){
                if (u)
                  header.style('background', 'url(' + img_url + ')');
                else
                  header.text(function(e){
                      return e.name.split(' ').map(function (f) { return f.charAt(0); }).join('');
                  });
              });
            })
            .style('left', function(d){ return d.x + 'px'; })
            .style('top',  function(d){ return d.y + 'px'; })
            .style('opacity', 0)
            .on('mouseover', showTip)
            .on('mouseout', hideTip)
            .attr('hover', 0)
            .on('click', highlightPerson);
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
      .charge( -2000 )
      .gravity( 0 )
      //.friction(0.1)
      //.linkDistance(100)
      .alpha(0.005)
      .size([width, height])
      .on('tick', function(e) {
        move(skills);
        move(people);
        links.attr("x1", function(d) { return d.source.x + 20; })
             .attr("y1", function(d) { return d.source.y + 20; })
             .attr("x2", function(d) { return d.target.x + 20; })
             .attr("y2", function(d) { return d.target.y + 20; });
      });
  };

  function move(s){
       s.style('left', function(d){
          d.x = constrain(d.x, borders.left, borders.right);
          return d.x + 'px';
        })
        .style('top',  function(d){
          d.y = constrain(d.y, borders.top, borders.bottom);
          return d.y + 'px'; });
  };

  function createLinks(){
    // This is where JQuery acts as Force Majore and saves the day,
    // since I can't get the damn thing to work otherwise.
    $('svg').empty();

    links = svg.selectAll("link")
               .data(forceLinks);

    links.enter()
         .append("line")
         .attr("class", "link")

    links.exit()
         .remove();

  };

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

  function moveToCenter(s){
     s.style('left', function(d){
        var cx = (borders.right - borders.left)/2;
        d.px = cx; d.x = cx; return cx; })
      .style('top', function(d){  var cy = (borders.bottom - borders.top)/2; d.py = cy; d.y = cy; return cy; });
  };

  function emptyForce(){
    while(forceNodes.length > 0) { forceNodes.pop(); }
    while(forceLinks.length > 0) { forceLinks.pop(); }
  };

  function unfix(){
    people.each(function(d){ d['fixed'] = false; })
    skills.each(function(d){ d['fixed'] = false; })
  };

  function startPeopleForce(center){
    var included = _.filter( jsonData.people, function(d){ return d.cat === center.cat; })
    .concat( _.filter( jsonData.skills, function(d){ return _.contains(center.skills, d.id); }));
    
    unfix();
    center['fixed'] = true;

    _.each(included, function(d){ forceNodes.push(d); });
    _.each(included, function(d){ forceLinks.push({ source: center, target: d }); });

    createLinks();

    force.start();
  };

  function findPerson(person){
    return people.filter(function(d){ return d.n === person.n; });
  };

  function findSkill(skill){
    return skills.filter(function(d){ return d.id === skill.id; });
  };

  function startSkillForce(center){
    unfix();
    center['fixed'] = true;

    forceNodes.push(center);
    _.each(_.filter( jsonData.people, function(d){ return _.contains( d.skills, center.id) ; }),
        function(d){
          forceNodes.push( d );
          forceLinks.push({ source: center, target: d });
        //_.each(d.skills, function(e){
      //  var leaf = _.filter(jsonData.skills, function(f){ return e === f.id; })[0]
      //  forceNodes.push(leaf);
      //  forceLinks.push({ source: d, target: leaf });
      //}
    });

    createLinks();

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
    describe(person.name + '\'s network.');
    
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

    disappear( skills.filter(function(d){ return d.id !== skill.id; } ));

  //  disappear( skillsNotRelatedToPeople( peopleWithSkill(skill) ));
  //  appear( skillsRelatedToPeople( peopleWithSkill(skill) ));

    hideTip();
  };

  function highlightClass(c){
    describe('Class of ' + c.name);

    emptyForce(); // No force layout in class

    disappear(skillNotInClass(c));
    appear(skillInClass(c));
    disappear(peopleNotInClass(c.cat));
    appear(peopleInClass(c.cat));

    hideTip();
  };

  function addOriginalXY(s){
    _.each(s, function(d){
      d['ox'] = d.x;
      d['oy'] = d.y;
    });
  };

  function scale(s, t){
    _.each(s, function(d){
        d.x = t * xScale(d.x) + (1-t)*(borders.right - borders.left )/2;
        d.y = t * yScale(d.y) + (1-t)*(borders.bottom - borders.top )/2;
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
    scale(jsonData.people, 1);
    scale(jsonData.skills, 0.8); // for the force layout, since negative charge expands

    skills = createInstances(container, jsonData.skills, 'text');
    createSkills(skills);
    
    appear(skills);
    placeSkills();

    people = createInstances(container, jsonData.people, 'div');
    createPeople(people);
    appear(people);

    addOriginalXY(jsonData.people);
    addOriginalXY(jsonData.skills);

    peopleDropdown = createInstances(stDDContainer, jsonData.people, 'li');
    createDropdown(peopleDropdown, highlightPerson);

    skillDropdown = createInstances(skDDContainer, jsonData.skills, 'li');
    createDropdown(skillDropdown, highlightSkill);

    classDropdown = createInstances(clDDContainer, jsonData.classes, 'li');
    createDropdown(classDropdown, highlightClass);

    links = createInstances(svg, [], 'link');
    force = createForce();

    $('#hdr').on('click', resetViz);
    $('#showAll').on('click', resetViz);

    describe('This is Media Lab. Click on anything!');
  };

  function resetViz(){
    force.stop();
    hideTip();
    moveToStart(people);
    moveToStart(skills);
    appear(people);
    appear(skills);
    describe('This is Media Lab. Click on anything!');
  };

  startViz();
};
