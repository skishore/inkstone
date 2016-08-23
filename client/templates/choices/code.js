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

import {writeList} from '/client/assets';
import {Backdrop} from '/client/backdrop';
import md5 from '/client/external/blueimp/md5';
import {Lists} from '/client/model/lists';
import {setListStatus, toListTemplate} from '/client/templates/lists/code';
import {Popup} from '/client/templates/popup/code';
import {assert} from '/lib/base';
import {numbersToTones} from '/lib/pinyin';

const kBackdropTimeout = 500;

const kImportColumns = ['word', 'traditional', 'numbered', 'definition'];

const deleteAllLists = () => {
  // TODO(skishore): Consider deleting the lists from the asset store here.
  for (let list of _.keys(Lists.getImportedLists())) {
    setListStatus(list, /*on=*/false);
    if (!Lists.isListEnabled(list)) Lists.deleteList(list);
  }
  Popup.hide(50);
}

const deleteList = (list) => {
  // TODO(skishore): Consider deleting the list from the asset store here.
  setListStatus(list, /*on=*/false);
  if (!Lists.isListEnabled(list)) Lists.deleteList(list);
  Popup.hide(50);
}

const getMissingCharacterWarning = (missing) => {
  if (missing.length === 0) return '';
  if (missing.length === 1) {
    return ` One character was not in the dictionary: ${missing[0]}.`;
  }
  const m = missing.sort();
  if (missing.length === 2) {
    return ` Two characters were not in the dictionary: ${m[0]} and ${m[1]}.`;
  } else if (missing.length === 3) {
    return ' Three characters were not in the dictionary: ' +
           `${m[0]}, ${m[1]}, and ${m[2]}.`;
  }
  return ' Some characters were not in the dictionary: ' +
         `${m.slice(0, 3).join(', ')} and ${m.length - 3} ` +
         `other${m.length === 4 ? '' : 's'}.`;
}

const importList = (category, name, data) => {
  // Compute a name for the new list. This name is a function of its category
  // and its label within that category, so that if we import this list again,
  // it will overwrite the old data.
  category = category.trim();
  name = name.trim();
  if (category.length === 0) return Promise.reject('No category provided.');
  if (name.length === 0) return Promise.reject('No name provided.');
  const padding = Math.max(category.length, name.length) -
                  Math.min(category.length, name.length);
  const key = `${category}${new Array(padding).join(' ')}${name}`;
  const list = `s/${md5(key)}`;
  // Do error checking and coerce the new list's data from the import format
  // (a tab-separated file with columns kImportColumns) into the list-object
  // format used by readList and writeList.
  const rows = [];
  for (let row of data.split('\n')) {
    if (!row) continue;
    row = row.replace('\r', '').split('\t');
    if (row.length !== kImportColumns.length) {
      return Promise.reject(`Malformatted row: ${row.join(', ')}`);
    }
    const item = {};
    kImportColumns.map((column, i) => item[column] = row[i]);
    const pinyin = numbersToTones(item.numbered);
    if (pinyin.error) {
      return Promise.reject(`Error parsing ${item.numbered}: ${pinyin.error}`);
    }
    item.pinyin = pinyin.result;
    rows.push(item);
  }
  // Write the actual list and return a Promise with a success message.
  return writeList(list, rows).then((result) => {
    const length = _.keys(result.items).length;
    const warning = getMissingCharacterWarning(_.keys(result.missing));
    if (length > 0) {
      Lists.addList(category, name, list);
      return `Imported ${length} items for ${name}.${warning}`;
    }
    throw `No items found for ${name}.${warning}`;
  });
}

const showDeleteAllDialog = () => {
  const buttons = [
    {callback: deleteAllLists, label: 'Yes'},
    {class: 'bold', label: 'No'},
  ];
  const text = 'Do you really want to delete all of your imported lists?';
  Popup.show({title: 'Delete All', text: text, buttons: buttons});
}

const showDeletionDialog = (list) => {
  const data = Lists.getAllLists()[list];
  if (!data) return;
  const buttons = [
    {callback: () => deleteList(list), label: 'Yes'},
    {class: 'bold', label: 'No'},
  ];
  const text = `Do you really want to delete ${data.name}?`;
  Popup.show({title: 'Delete List', text: text, buttons: buttons});
}

const showImportMessage = (message, success) => {
  Backdrop.hide(kBackdropTimeout, () => Popup.show({
    buttons: [{class: 'bold', label: 'Okay'}],
    text: `${message}`,
    title: success ? 'Import Successful' : 'Import Failed',
  }));
}

const submitLocalList = () => {
  // Validate the form submission.
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
  // Read the file and actually write the list. Print the success message
  // or any error message that is returned.
  Popup.hide();
  Backdrop.show();
  const reader = new FileReader;
  reader.onloadend = () => {
    const buttons = [{class: 'bold', label: 'Okay'}];
    importList(submission.category, submission.name, reader.result)
        .then((x) => showImportMessage(x, /*success=*/true))
        .catch((x) => showImportMessage(x, /*success=*/false));
  }
  reader.readAsText(submission.file);
}

// Meteor template and event bindings follow.

['delete_lists', 'import_lists'].map((x) => Router.route(x, {template: x}));

Template.delete_lists.events({
  'click .delete-lists-options .delete-all': () => {
    showDeleteAllDialog();
  },
  'click .delete-lists-options .go-back': () => {
    history.back();
  },
  'click .list-management-option': (event) => {
    const variable = $(event.currentTarget).children().data('variable');
    const pair = variable.split('.');
    assert(pair.length === 2 && pair[0] === 'lists');
    showDeletionDialog(pair[1]);
  },
});

Template.delete_lists.helpers({
  groups: () => toListTemplate(Lists.getImportedLists()),
});

Template.import_lists.helpers({
  groups: () => toListTemplate(Lists.getAllLists()),
});

Template.imports.events({
  'click .option.github': () => {
    Popup.hide(50);
    Router.go('import_lists');
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
