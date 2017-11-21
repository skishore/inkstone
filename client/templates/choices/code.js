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

import {removeList, writeList} from '/client/assets';
import {Backdrop} from '/client/backdrop';
import md5 from '/client/external/blueimp/md5';
import {Lists} from '/client/model/lists';
import {Settings} from '/client/model/settings';
import {Vocabulary} from '/client/model/vocabulary';
import {setListStatus, toListTemplate} from '/client/templates/lists/code';
import {Popup} from '/client/templates/popup/code';
import {kHomePage, assert, fetchUrl} from '/lib/base';
import {numbersToTones} from '/lib/pinyin';

const kBackdropTimeout = 500;

const kImportColumns = ['simplified', 'traditional', 'numbered', 'definition'];

const github_lists = new ReactiveVar({});

const cardinal = (n, object) => `${n} ${object}${n === 1 ? '' : 's'}`;

const deleteAllLists = () => {
  _.keys(Lists.getImportedLists())
   .forEach((list) => deleteList(list, /* hidden=*/true));
  Popup.hide(50);
}

const deleteList = (list, hidden) => {
  setListStatus(list, /*on=*/false);
  if (!Lists.isListEnabled(list)) {
    removeList(list).catch((x) => console.error(x));
    Lists.deleteList(list);
  }
  hidden || Popup.hide(50);
}

const fetchGitHubLists = () => {
  return fetchUrl(`${kHomePage}/all.json`).then((data) => {
    check(data, [{category: String, name: String, ts: Number}]);
    if (data.length === 0) throw 'No lists available.';
    const result = {};
    data.forEach((x) => result[getListKey(x.category, x.name)] = x);
    return result;
  });
}

const fetchListData = (category, name) => {
  return fetchUrl(`${kHomePage}/lists/${category}/${name}.list`);
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

const getNewGitHubLists = () => {
  const local = Lists.getAllLists();
  const remote = github_lists.get();
  const result = {};
  _.keys(remote)
      .filter((x) => !(local[x] && (local[x].ts || Infinity) >= remote[x].ts))
      .forEach((x) => result[x] = remote[x]);
  return result;
}

const importAllLists = () => {
  Popup.hide();
  const lists = getNewGitHubLists();
  const entries = _.keys(lists).map((x) => lists[x]);
  Backdrop.show();
  const success = `Imported ${cardinal(entries.length, 'list')}.`;
  Promise.all(entries.map((x) => fetchListData(x.category, x.name)))
         .then((x) => Promise.all(_.zip(x, entries).map(
               (pair) => saveList(pair[0], pair[1]))))
         .then(() => showListSavedMessage(success, /*success=*/true))
         .catch((x) => showListSavedMessage(x, /*success=*/false));
}

const importList = (list) => {
  Popup.hide();
  const metadata = getNewGitHubLists()[list];
  if (!metadata) return;
  Backdrop.show();
  fetchListData(metadata.category, metadata.name)
      .then((data) => saveList(data, metadata))
      .then((x) => showListSavedMessage(x, /*success=*/true))
      .catch((x) => showListSavedMessage(x, /*success=*/false));
}

const parseImportedRow = (row) => {
  row = row.replace('\r', '').split('\t');
  if (row.length === kImportColumns.length) return row;
  const match = /^(.+)\[(.+)\]$/.exec(row[0]);
  if (!match) return row;
  return [match[1], match[2]].concat(row.slice(1));
}

const refreshListItems = (list, rows) => {
  Vocabulary.dropList(list);
  const charset = Settings.get('character_set');
  rows.forEach((row) => Vocabulary.addItem(row[charset], list));
}

const saveList = (data, metadata) => {
  // Do error checking and coerce the new list's data from the import format
  // (a tab-separated file with columns kImportColumns) into the list-object
  // format used by readList and writeList.
  const rows = [];
  for (let row of data.split('\n')) {
    if (!row || row.startsWith('//')) continue;
    row = parseImportedRow(row);
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
  const list = getListKey(metadata.category, metadata.name);
  return writeList(list, rows).then((result) => {
    const warning = getMissingCharacterWarning(_.keys(result.missing));
    if (result.count > 0) {
      Lists.addList(list, metadata);
      if (Lists.isListEnabled(list)) refreshListItems(list, rows);
      return `Imported ${cardinal(result.count, 'item')} ` +
             `for ${metadata.name}.${warning}`;
    }
    throw `No items found for ${metadata.name}.${warning}`;
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
  const metadata = Lists.getAllLists()[list];
  if (!metadata) return;
  const buttons = [
    {callback: () => deleteList(list), label: 'Yes'},
    {class: 'bold', label: 'No'},
  ];
  const text = `Delete ${metadata.name}?`;
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
  const metadata = getNewGitHubLists()[list];
  if (!metadata) return;
  const buttons = [
    {callback: () => importList(list), label: 'Yes'},
    {class: 'bold', label: 'No'},
  ];
  const text = `Import ${metadata.name}?`;
  Popup.show({title: 'Confirm Import', text: text, buttons: buttons});
}

const showListSavedMessage = (message, success) => {
  if (!success) console.error(message);
  if (message instanceof Error) {
    message = ('' + message).substr('Error: '.length);
  } else if (message instanceof Object) {
    message = JSON.stringify(message);
  }
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
  new Promise((resolve, reject) => {
    reader.onerror = reject;
    reader.onloadend = resolve;
  }).then(() => {
    const metadata = {category: submission.category, name: submission.name};
    return saveList(reader.result, metadata);
  }).then((x) => showListSavedMessage(x, /*success=*/true))
    .catch((x) => showListSavedMessage(x, /*success=*/false));
  reader.readAsText(submission.file);
}

// Meteor template and event bindings follow.

['delete_lists', 'import_lists', 'manage_blacklist'].map(
    (x) => Router.route(x, {template: x}));

Meteor.startup(() => fetchGitHubLists().then((x) => github_lists.set(x)));

Template.choices.events({
  'click .list-management-options .all': (event) => {
    const mode = $(event.currentTarget).children().attr('data-mode');
    (mode === 'delete' ? showDeleteAllDialog : showImportAllDialog)();
  },
  'click .list-management-options .back': () => {
    history.back();
  },
  'click .list-management-option': (event) => {
    const mode = $(event.currentTarget).children().attr('data-mode');
    const variable = $(event.currentTarget).children().attr('data-variable');
    const pair = variable.split('.');
    assert(pair.length === 2 && pair[0] === 'lists');
    (mode === 'delete' ? showDeleteDialog : showImportDialog)(pair[1]);
  },
});

Template.delete_lists.helpers({
  groups: () => toListTemplate(Lists.getImportedLists()),
});

Template.import_lists.helpers({
  groups: () => toListTemplate(getNewGitHubLists()),
});

Template.imports.events({
  'click .option.format': () => {
    window.open(`${kHomePage}/docs/format.html`, '_system');
    Popup.hide(50);
  },
  'click .option.github': () => {
    fetchGitHubLists().then((lists) => {
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

// Logic for handling blacklist management.

const maybeAddAllBlacklistedWords = () => {
  const callback = () => {
    Vocabulary.getBlacklistedWords().forEach(
        (x) => Vocabulary.updateBlacklist(x, /*blacklisted=*/false));
    Popup.hide(50);
  }
  const buttons = [
    {callback: callback, label: 'Yes'},
    {class: 'bold', label: 'No'},
  ];
  const text = `Add all blacklisted words below back into the deck?`;
  Popup.show({title: 'Clear Blacklist', text: text, buttons: buttons});
}

const maybeAddBlacklistedWord = (word) => {
  const callback = () => {
    Vocabulary.updateBlacklist({word: word}, /*blacklisted=*/false);
    Popup.hide(50);
  }
  const buttons = [
    {callback: callback, label: 'Yes'},
    {class: 'bold', label: 'No'},
  ];
  const text = `Add ${word} back into the deck?`;
  Popup.show({title: 'Remove from Blacklist', text: text, buttons: buttons});
}

Template.manage_blacklist.helpers({
  blacklist: () => Vocabulary.getBlacklistedWords(),
});

Template.manage_blacklist.events({
  'click .list-management-option': (event) => {
    const word = $(event.currentTarget).children().attr('data-word');
    maybeAddBlacklistedWord(word);
  },
  'click .list-management-options .all': () => {
    maybeAddAllBlacklistedWords();
  },
  'click .list-management-options .back': () => {
    history.back();
  },
});
