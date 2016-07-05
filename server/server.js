const fs = Npm.require('fs');

const Issues = new Meteor.Collection('issues');

const Tuple = (...args) => {
  return Match.Where((x) => {
    check(x, Array);
    args.forEach((y, i) => check(x[i], y));
    return x.length === args.length;
  });
}

const Character = Match.Where((x) => {
  check(x, String);
  return x.length === 1;
});

const Stroke = [Tuple(Number, Number)];

Meteor.methods({
  getCharacter: (character) => {
    const codepoint = character.codePointAt(0);
    const directory = 'cordova-build-override/www/assets/characters';
    const filename = `${process.env.PWD}/${directory}/${codepoint}`;
    const readFileSync = Meteor.wrapAsync(fs.readFile, fs);
    return JSON.parse(readFileSync(filename));
  },
  reportIssue: (issue) => {
    // TODO(zhaizhai): Maybe do further validation of character_data here.
    // TODO(skishore): Maybe pass other data about the character, such as the
    // post-corner-detection medians (which may change with future updates to
    // our recognition algorithm).
    check(issue, {
      character_data: Object,
      message: String,
      recording: [{
        index: Match.Integer,
        stroke: Stroke,
      }],
    });
    check(issue.character_data.character, Character);
    Issues.insert(issue);
  },
});
