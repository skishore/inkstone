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

const kGitHubDomain = 'https://skishore.github.io/inkstone';

const kImportColumns = ['word', 'traditional', 'numbered', 'definition'];

const github_lists = new ReactiveVar({});

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

const getGitHubLists = () => {
  return getUrl(`${kGitHubDomain}/all.json`).then((data) => {
    check(data, [{category: String, name: String}]);
    if (data.length === 0) throw 'No lists available.';
    const result = {};
    data.forEach((x) => result[getListKey(x.category, x.name)] = x);
    return result;
  });
}

const getListKey = (category, name) => {
  const padding = Math.max(category.length, name.length) -
                  Math.min(category.length, name.length);
  return `s/${md5(`${category}${new Array(padding).join(' ')}${name}`)}`;
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

const getUrl = (url) => {
  return new Promise((resolve, reject) => {
    HTTP.get(url, (error, result) => {
      if (error && !result) {
        return reject(error);
      } else if (result.statusCode !== 200) {
        return reject(`Request failed with status ${result.statusCode}.`);
      }
      resolve(result.data || result.content);
    });
  });
}

const importAllLists = () => {
  Popup.hide();
}

const importList = (list) => {
  Popup.hide();
  const entry = github_lists.get()[list];
  if (!entry) return;
  Backdrop.show();
  const url = `${kGitHubDomain}/lists/${entry.category}/${entry.name}.list`;
  getUrl(url).then((data) => saveList(entry.category, entry.name, data))
             .then((x) => showListSavedMessage(x, /*success=*/true))
             .catch((x) => showListSavedMessage(x, /*success=*/false));
}

const saveList = (category, name, data) => {
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
  const list = getListKey(category, name);
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
  const text = 'Delete all of your imported lists?';
  Popup.show({title: 'Confirm Deletion', text: text, buttons: buttons});
}

const showDeleteDialog = (list) => {
  const entry = Lists.getAllLists()[list];
  if (!entry) return;
  const buttons = [
    {callback: () => deleteList(list), label: 'Yes'},
    {class: 'bold', label: 'No'},
  ];
  const text = `Delete ${entry.name}?`;
  Popup.show({title: 'Confirm Deletion', text: text, buttons: buttons});
}

const showImportAllDialog = () => {
  const buttons = [
    {callback: importAllLists, label: 'Yes'},
    {class: 'bold', label: 'No'},
  ];
  const text = 'Import all of the lists below?';
  Popup.show({title: 'Confirm Import', text: text, buttons: buttons});
}

const showImportDialog = (list) => {
  const entry = github_lists.get()[list];
  if (!entry) return;
  const buttons = [
    {callback: () => importList(list), label: 'Yes'},
    {class: 'bold', label: 'No'},
  ];
  const text = `Import ${entry.name}?`;
  Popup.show({title: 'Confirm Import', text: text, buttons: buttons});
}

const showListSavedMessage = (message, success) => {
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
    saveList(submission.category, submission.name, reader.result)
        .then((x) => showListSavedMessage(x, /*success=*/true))
        .catch((x) => showListSavedMessage(x, /*success=*/false));
  }
  reader.readAsText(submission.file);
}

// Meteor template and event bindings follow.

['delete_lists', 'import_lists'].map((x) => Router.route(x, {template: x}));

Meteor.startup(() => getGitHubLists().then((x) => github_lists.set(x)));

Template.choices.events({
  'click .list-management-options .all': (event) => {
    const mode = $(event.currentTarget).children().data('mode');
    (mode === 'delete' ? showDeleteAllDialog : showImportAllDialog)();
  },
  'click .list-management-options .back': () => {
    history.back();
  },
  'click .list-management-option': (event) => {
    const mode = $(event.currentTarget).children().data('mode');
    const variable = $(event.currentTarget).children().data('variable');
    const pair = variable.split('.');
    assert(pair.length === 2 && pair[0] === 'lists');
    (mode === 'delete' ? showDeleteDialog : showImportDialog)(pair[1]);
  },
});

Template.delete_lists.helpers({
  groups: () => toListTemplate(Lists.getImportedLists()),
});

Template.import_lists.helpers({
  groups: () => toListTemplate(github_lists.get()),
});

Template.imports.events({
  'click .option.github': () => {
    getGitHubLists().then((lists) => {
      github_lists.set(lists);
      Popup.hide(50);
      Router.go('import_lists');
    }).catch((error) => {
      const buttons = [{class: 'bold', label: 'Okay'}];
      Popup.show({buttons: buttons, text: `${error}`, title: 'Import Failed'});
    });
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
