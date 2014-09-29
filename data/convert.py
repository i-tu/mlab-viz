import json

data = json.loads(open('data.json', 'r').read())

newClasses = []

def updateSkills(source, additions):
    for s in additions:
        source[s] += 1
    return source

for s in data['people']:
    for nc in newClasses:
        if s['cat'] == nc['cat']:
            nc['skills'] = updateSkills( nc['skills'], s['skills'] )
        else:
            newClasses.append( {'cat':  s['cat'], 'name': s['category'], 'skills': updateSkills([], s['skills']) } )

for skill in data['skills']:
    skill.pop('heatmap', 0)

with open('data2.json', 'w') as outfile:
      json.dump(data, outfile)
