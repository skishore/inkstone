import {Backdrop} from '/client/backdrop';
import {lookupList} from '/client/lookup';
import {Lists} from '/client/model/lists';
import {Vocabulary} from '/client/model/vocabulary';

const kBackdropTimeout = 500;

const characters = {};

// TODO(skishore): The list metadata should go in the model, not here.
const groups = [
  {
    label: 'General',
    lists: [
      {label: '100 Common Radicals', list: '100cr'},
    ],
  },
  {
    label: 'Hanyu Shuiping Kaoshi',
    lists: [
      {label: 'HSK Level 1', list: 'nhsk1'},
      {label: 'HSK Level 2', list: 'nhsk2'},
      {label: 'HSK Level 3', list: 'nhsk3'},
      {label: 'HSK Level 4', list: 'nhsk4'},
      {label: 'HSK Level 5', list: 'nhsk5'},
      {label: 'HSK Level 6', list: 'nhsk6'},
    ],
  },
];

const enableList = (list, callback) => {
  Backdrop.show();
  lookupList(list).then((rows) => {
    rows.map((row) => {
      if (!_.all(row.word, (x) => characters[x])) return;
      Vocabulary.addItem(row.word, list);
    });
    Backdrop.hide(kBackdropTimeout);
    callback();
  }).catch((error) => {
    Backdrop.hide(kBackdropTimeout);
    console.error(error);
  });
}

const toggleListState = (list) => {
  if (Lists.get(list)) {
    Vocabulary.dropList(list);
    Lists.delete(list);
  } else {
    enableList(list, () => Lists.set(list, true));
  }
}

// Meteor template helpers and one-time functions to prepare data follow.

$.ajax({url: 'characters.txt'}).then((data) => {
  for (let character of data) characters[character] = true;
}).fail((x) => console.error(x));

groups.map((x) => x.lists.map((y) => y.variable = `lists.${y.list}`));

Template.lists.helpers({groups: () => groups});

export {toggleListState};
