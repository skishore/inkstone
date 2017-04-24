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
import {Lists} from '/client/model/lists';
import {clearTables} from '/client/model/persistence';
import {Settings} from '/client/model/settings';
import {Popup} from '/client/templates/popup/code';

const kBackupTables = ['lists', 'settings', 'vocabulary'];
const kCharacterSets = [
  {label: 'Simplified', value: 'simplified'},
  {label: 'Traditional', value: 'traditional'},
];
const kCodes = ['4-7 Alpha Tango', '2-2 Beta Charlie', '3-7 Gamma Echo'];

const code = new ReactiveVar();
const name = new ReactiveVar();

const confirmAndExecute = (title, text, action) => {
  const callback = () => confirmWithCode(title, action);
  const buttons = [
    {callback: () => Meteor.defer(callback), label: 'Yes'},
    {class: 'bold', label: 'No'},
  ];
  code.set(_.sample(kCodes));
  Popup.show({title: title, text: text, buttons: buttons});
}

const confirmWithCode = (title, action) => {
  const callback = () => {
    const typed = $('#confirm-dangerous-action > input.code').val();
    if (typed === code.get()) {
      Popup.hide();
      Backdrop.show();
      action();
      Backdrop.hide(500);
    } else {
      const retry = () => confirmWithCode(title, action);
      const buttons = [
        {callback: () => Meteor.defer(retry), label: 'Retry'},
        {class: 'bold', label: 'Cancel'},
      ];
      const text = 'The code you typed did not match ' +
                   `"${code.get()}" exactly. ` +
                   'If you intended to type this code, make sure you use ' +
                   'the same capitalization and punctuation.';
      Popup.show({title: 'Incorrect code', text: text, buttons: buttons});
    }
  }
  const buttons = [
    {callback: () => Meteor.defer(callback), label: 'Okay'},
    {class: 'bold', label: 'Cancel'},
  ];
  const template = 'confirm_dangerous_action';
  Popup.show({title: title, template: template, buttons: buttons});
}

const decodeBase64 = window.decodeBase64 = (uri) => {
  const d = (ch) => '%' + ('00' + ch.charCodeAt(0).toString(16)).slice(-2);
  return decodeURIComponent(Array.from(atob(uri)).map(d).join(''));
}

const encodeBase64 = window.encodeBase64 = (data) => {
  return btoa(encodeURIComponent(data).replace(
      /%([0-9A-F]{2})/g, (match, x) => String.fromCharCode('0x' + x)));
}

const getDateString = () => {
  const d = new Date();
  const p = (x) => { const y = '' + x; return (y.length < 2 ? '0' : '') + y; }
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const makeButtons = (callback) => [
  {label: 'Cancel'},
  {callback: callback, class: 'bold', label: 'Submit'},
];

const startDownload = (data, filename) => {
  const link = document.createElement('a');
  link.href = `data:text/plain;charset:utf-8;base64,${encodeBase64(data)}`;
  link.download = filename;
  link.click();
}

const submitBackup = () => {
  const filename = $('.popup input[type="text"]').val();
  const database = JSON.parse(JSON.stringify(localStorage));
  // Our backups currently include two things:
  //   - a copy of localStorage
  //   - a map from user-provided list IDs to their entries
  const data = {database: database, lists: {}};
  const lists = _.keys(Lists.getImportedLists());
  Promise.all(lists.map(readList)).then((values) => {
    lists.map((x, i) => data.lists[x] = values[i]);
    startDownload(JSON.stringify(data), filename);
    Popup.hide();
  }).catch((error) => console.error(error));
}

const submitRestore = () => {
  const file = $('.popup input[type="file"]')[0].files[0];
  const reader = new FileReader;
  // TODO(skishore): We need proper failure handling here!
  // TODO(skishore): We need proper failure handling in importing local lists!
  reader.onloadend = () => {
    const data = JSON.parse(reader.result);
    if (!data.database || !data.lists) throw Error('Malformatted backup!');
    const lists = _.keys(data.lists);
    Promise.all(lists.map((x) => writeList(x, data.lists[x]))).then(() => {
      clearTables(['timing'].concat(kBackupTables), () => {
        const keys = _.keys(data.database);
        const preserved = kBackupTables.map((x) => `table.${x}.`);
        keys.filter((x) => preserved.some((y) => x.startsWith(y)))
            .map((x) => localStorage[x] = data.database[x]);
      });
    }).catch((error) => console.error(error));
  }
  Popup.hide();
  Backdrop.show();
  reader.readAsText(file);
}

Template.backup.helpers({name: () => name.get()});

Template.confirm_dangerous_action.helpers({code: () => code.get()});

Template.settings.events({
  'click .item-button.backup': () => {
    name.set(`inkstone-${getDateString()}.bak`);
    Popup.show({
      buttons: makeButtons(submitBackup),
      template: 'backup',
      title: 'Backup to a file',
    });
  },
  'click .item-button.clear-progress': () => confirmAndExecute(
      'Clear all progress',
      'Do you want to completely reset your progress on all word lists?',
      () => clearTables(['lists', 'timing', 'vocabulary'])),
  'click .item-button.reinstall-assets': () => confirmAndExecute(
      'Reinstall assets',
      'Do you want to download all character data files again?',
      () => clearTables(['assets'])),
  'click .item-button.restore': () => {
    Popup.show({
      buttons: makeButtons(submitRestore),
      template: 'restore',
      title: 'Restore from a file',
    });
  },
});

Template.settings.helpers({charsets: () => kCharacterSets});
