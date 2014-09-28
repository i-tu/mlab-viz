queue().defer(d3.json, 'data/data.json')
       .defer(d3.json, 'data/broken_images.json')
       .await(ready);

function ready(error, jsonData, jsonBroken_images){
  if(error) console.log(error);
  
  var width, height, borders, w, h;
  var broken_images = [];

  var tdur = 500;

 // NOTE: most stuff is, unconventionally for d3, simple divs. the svg element is just to draw lines.
  var container = d3.select('#content');
  var svg = container.append('svg');

    /* DEFINITIONS */
  var skills; // Skills d3 selection
  var people; // People d3 selection
  var center = {'x':0, 'y':0};
  var links = svg.selectAll("link");
  var dests = [];

  broken_images = jsonBroken_images ? jsonBroken_images.missing : [];

  function set_scale() {
    width = $('#content').width()
    height = $(window).height() - $('#content').offset().top - 40;
    $('#content').height(height);
    
    var margin = 30;
    borders = { left: margin, right: width - (margin*2), top: 0, bottom: height - margin};

    xScale = d3.scale.linear()
                   .domain([original_min_x, original_max_x])
                   .range([ borders.left, borders.right]);
   
    yScale = d3.scale.linear()
                   .domain([original_min_y, original_max_y])
                   .range([ borders.bottom, borders.top ]);

    svg.attr("width", width)
       .attr("height", height);
  };

  set_scale();

  $(window).resize(function(){
    moveToStart(people);
    moveToStart(skills);
    set_scale();
  });

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
  
  function move(s){
    s.style('left', function(d){
      return constrain(xScale(d.x), borders.left, borders.right) + 'px';
    })
    .style('top',  function(d){
      return constrain(yScale(d.y), borders.top, borders.bottom) + 'px';
    });
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
  
  function emptyLinks(){
    $("svg").empty();
   };

  function createLinks(c, dsts){
    center = {'x': c['x'], 'y': c['y']};
    dests = dsts;

    links = svg.selectAll("link")
               .data( _.map(dests[0], function(d){ return d.__data__; }) );

    links.enter()
         .append("line")
         .attr("class", "link")
         .attr('x1', (xScale(center.x) +20) + 'px')
         .attr('y1', (yScale(center.y) +20) + 'px')
         .attr('x2', (xScale(center.x) +20) + 'px')
         .attr('y2', (yScale(center.y) +20) + 'px')
         .transition()
         .duration(tdur)
         .attr('x2', function(d){ return (xScale(d.x)+20) + 'px'; })
         .attr('y2', function(d){ return (yScale(d.y)+20) + 'px'; });
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
        d.px = d.x; 
        d.py = d.y; 
     })

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
  };

  function describe(desc){
    $('#hdr').text(desc);
  };

  function endAll(transition, callback) { 
    var n = 0; 
    transition 
        .each(function() { ++n; }) 
        .each("end", function() { if (!--n) callback.apply(this, arguments); }); 
  };

  function moveToStart(s){
    emptyLinks();

    s.transition()
     .duration(tdur*2)
     .style('left', function(d){ return xScale(d.x) + "px" })
     .style('top', function(d){ return yScale(d.y) + "px" })
     .call(endAll, function(){
        createLinks(center, dests);
     });
  };


  function findPerson(person){
    return people.filter(function(d){ return d.n === person.n; });
  };

  function findSkill(skill){
    return skills.filter(function(d){ return d.id === skill.id; });
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

    disappear(skillsNotInSkillset(person.skills));
    appear(skillsInSkillset(person.skills));

    disappear(peopleNotInClass(person.cat));
    appear(peopleInClass(person.cat));

    emptyLinks();
    createLinks(person, skillsInSkillset(person.skills));
    createLinks(person, peopleInClass(person.cat));

    hideTip();
  };

  function highlightSkill(skill){
    describe('People interested in ' + skill.name)

    disappear(peopleNotWithSkill(skill));
    appear(peopleWithSkill(skill));

    appear( skills.filter(function(d){ return d.id === skill.id; } ));
    disappear( skills.filter(function(d){ return d.id !== skill.id; } ));

    emptyLinks();
    createLinks(skill, peopleWithSkill(skill));

    hideTip();
  };

  function highlightClass(c){
    describe('People in ' + c.name + ' and their interests');

    var p = peopleInClass(c.cat);
    var not_p = d3.selectAll(_.difference(people[0], p[0]));

    var class_skills = skillsRelatedToPeople(p);
    var not_skills = d3.selectAll(_.difference(skills[0], class_skills[0]));

    disappear(not_skills);
    appear(class_skills);
    disappear(not_p);
    appear(p);

    emptyLinks();

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

    people = createInstances(container, 'div.people', jsonData.people, 'div');
    createPeople(people);

    peopleDropdown = createInstances(stDDContainer, 'li', jsonData.people, 'li');
    createDropdown(peopleDropdown, highlightPerson);

    skillDropdown = createInstances(skDDContainer, 'li', jsonData.skills, 'li');
    createDropdown(skillDropdown, highlightSkill);

    classDropdown = createInstances(clDDContainer, 'li', jsonData.classes, 'li');
    createDropdown(classDropdown, highlightClass);

    $('#hdr').on('click', resetViz);
    $('#showAll').on('click', resetViz);

    resetViz();
  };

  function resetViz(){
    set_scale();
    hideTip();
    moveToStart(people);
    moveToStart(skills);
    appear(people);
    appear(skills);
    emptyLinks();
    describe('This is Media Lab. Click on anything!');
  };

  startViz();
};
