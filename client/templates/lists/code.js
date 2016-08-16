/*
 *  Copyright 2016 Shaunak Kishore (kshaunak "at" gmail.com)
 *
 *  This file is part of Inkstone.
 *
 *  Inkstone is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  Inkstone is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with Inkstone.  If not, see <http://www.gnu.org/licenses/>.
 */

import {readList, writeList} from '/client/assets';
import {Backdrop} from '/client/backdrop';
import md5 from '/client/external/blueimp/md5';
import {Lists} from '/client/model/lists';
import {Vocabulary} from '/client/model/vocabulary';
import {Popup} from '/client/templates/popup/code';
import {numbersToTones} from '/lib/pinyin';

const kBackdropTimeout = 500;

const disableList = (list) => {
  Vocabulary.dropList(list);
  Lists.disable(list);
}

const enableList = (list) => {
  Backdrop.show();
  readList(list).then((rows) => {
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
  const groups = _.groupBy(_.pairs(lists), (x) => x[1].category);
  const categories = _.keys(groups).sort();
  return categories.map((category) => {
    const lists = groups[category].map((x) => ({
      label: x[1].name,
      variable: `lists.${x[0]}`,
    }));
    return {label: category, lists: lists};
  });
}

// Handlers specific to the import-saved-list template.

const saveList = (category, name, data) => {
  // Compute a name for the new list. This name is a function of its category
  // and its label within that category, so that if we import this list again,
  // it will overwrite the old data.
  category = category.trim();
  name = name.trim();
  if (category.length === 0 || name.length === 0) return;
  const padding = Math.max(category.length, name.length) -
                  Math.min(category.length, name.length);
  const key = `${category}${new Array(padding).join(' ')}${name}`;
  const list = `s/${md5(key)}`;
  // Do error checking and coerce the new list's data from the import format
  // (a tab-separated file with columns `simplified`, `traditional`,
  // `numbered`, and `definition`) into the list-object format used
  // by readList and writeList.
  const rows = [];
  for (let row of data.trim().split('\n')) {
    row = row.replace('\r', '').split('\t');
    const columns = ['word', 'traditional', 'numbered', 'definition'];
    if (row.length !== columns.length) {
      return Promise.reject(`Malformatted row: ${row.join(', ')}`);
    }
    const item = {};
    columns.map((column, i) => item[column] = row[i]);
    const pinyin = numbersToTones(item.numbered);
    if (pinyin.error) {
      return Promise.reject(`Error parsing ${item.numbered}: ${pinyin.error}`);
    }
    item.pinyin = pinyin.result;
    rows.push(item);
  }
  return writeList(list, rows).then(() => Lists.addList(category, name, list));
}

const submitLocalList = () => {
  const errors = [];
  const fields = ['category', 'file', 'name'];
  const submission = {};
  for (let field of fields) {
    const element = $(`.popup input[name="${field}"]`);
    const val = field === 'file' ? element[0].files[0] : element.val().trim();
    if (val) {
      element.removeClass('error');
      submission[field] = val;
    } else {
      element.addClass('error');
      errors.push(`You must provide a ${field}.`);
    }
  }
  if (errors.length > 0) return;

  Popup.hide();
  Backdrop.show();
  const reader = new FileReader;
  reader.onloadend = () => {
    saveList(submission.category, submission.name, reader.result)
        .catch((error) => console.error(error));
    Backdrop.hide(kBackdropTimeout);
  }
  reader.readAsText(submission.file);
}

// Meteor template and event bindings follow.

Template.imports.events({
  'click .option.github': () => {
    Popup.hide(50);
  },
  'click .option.saved': () => {
    const buttons = [
      {label: 'Cancel'},
      {callback: submitLocalList, class: 'bold', label: 'Submit'},
    ];
    Popup.show({
      buttons: buttons,
      template: 'import_saved_list',
      title: 'Import a saved list',
    });
  },
});

Template.lists.events({
  'click .delete': () => console.log('Deleted lists.'),
  'click .import': () => {
    Popup.show({title: 'Import a word list', template: 'imports'});
  },
});

Template.lists.helpers({groups: () => toListTemplate(Lists.getAllLists())});

export {setListStatus};
