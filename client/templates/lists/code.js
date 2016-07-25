import {Backdrop} from '/client/backdrop';
import {lookupAsset, lookupList} from '/client/lookup';
import {Lists} from '/client/model/lists';
import {Vocabulary} from '/client/model/vocabulary';

const kBackdropTimeout = 500;

const characters = {};

const disableList = (list) => {
  Vocabulary.dropList(list);
  Lists.disable(list);
}

const enableList = (list) => {
  Backdrop.show();
  lookupList(list).then((rows) => {
    rows.forEach((row) => {
      if (!_.all(row.word, (x) => characters[x])) return;
      Vocabulary.addItem(row.word, list);
    });
    Lists.enable(list);
    Backdrop.hide(kBackdropTimeout);
  }).catch((error) => {
    console.error(error);
    Backdrop.hide(kBackdropTimeout);
  });
}

const setListStatus = (list, on) => (on ? enableList : disableList)(list);

const toListTemplate = (lists) => {
  const render = (y) => _.extend({variable: `lists.${y.list}`}, y);
  return lists.map((x) => ({label: x.label, lists: x.lists.map(render)}));
}

// Meteor template helpers and one-time functions to prepare data follow.

lookupAsset('characters/all.txt').then((data) => {
  for (let character of data) characters[character] = true;
}).catch((error) => console.error(error));

Template.lists.helpers({groups: () => toListTemplate(Lists.getAllLists())});

export {setListStatus};
