import {Backdrop} from '/client/backdrop';
import {lookupList} from '/client/lookup';
import {Lists} from '/client/model/lists';
import {Vocabulary} from '/client/model/vocabulary';

const kBackdropTimeout = 500;

const disableList = (list) => {
  Vocabulary.dropList(list);
  Lists.disable(list);
}

const enableList = (list) => {
  Backdrop.show();
  lookupList(list).then((rows) => {
    rows.forEach((row) => Vocabulary.addItem(row.word, list));
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

Template.lists.helpers({groups: () => toListTemplate(Lists.getAllLists())});

export {setListStatus};
