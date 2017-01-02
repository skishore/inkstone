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

import {Backdrop} from '/client/backdrop';
import {clearTables} from '/client/model/persistence';
import {Settings} from '/client/model/settings';
import {Popup} from '/client/templates/popup/code';

const kCharacterSets = [
  {label: 'Simplified', value: 'simplified'},
  {label: 'Traditional', value: 'traditional'},
];
const kCodes = ['4-7 Alpha Tango', '2-2 Beta Charlie', '3-7 Gamma Echo'];

const code = new ReactiveVar();

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

Template.confirm_dangerous_action.helpers({code: () => code.get()});

Template.settings.events({
  'click .item-button.clear-progress': () => confirmAndExecute(
      'Clear all progress',
      'Do you want to completely reset your progress on all word lists?',
      () => clearTables(['lists', 'timing', 'vocabulary'])),
  'click .item-button.reinstall-assets': () => confirmAndExecute(
      'Reinstall assets',
      'Do you want to download all character data files again?',
      () => clearTables(['assets'])),
});

Template.settings.helpers({charsets: () => kCharacterSets});
