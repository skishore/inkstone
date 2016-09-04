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

import {readList} from '/client/assets';
import {Backdrop} from '/client/backdrop';
import {Lists} from '/client/model/lists';
import {Settings} from '/client/model/settings';
import {Vocabulary} from '/client/model/vocabulary';
import {Popup} from '/client/templates/popup/code';

const kBackdropTimeout = 500;

const comparisonKey = (name) => {
  tokens = name.split(' ');
  if (isNaN(parseInt(tokens[tokens.length - 1], 10))) return name;
  tokens[tokens.length - 1] = leftPad(tokens[tokens.length - 1], '0', 8);
  return tokens.join(' ');
}

const disableList = (list) => {
  Vocabulary.dropList(list);
  Lists.disable(list);
}

const enableList = (list) => {
  Backdrop.show();
  readList(list).then((rows) => {
    const charset = Settings.get('character_set');
    rows.forEach((row) => Vocabulary.addItem(row[charset], list));
    Lists.enable(list);
    Backdrop.hide(kBackdropTimeout);
  }).catch((error) => {
    console.error(error);
    Backdrop.hide(kBackdropTimeout);
  });
}

const leftPad = (input, character, length) => {
  return (new Array(length).fill(character).join('') + input).substr(-length);
}

const setCharacterSet = (charset) => {
  if (charset === Settings.get('character_set')) return;
  const lists = _.keys(Lists.getEnabledLists());
  if (lists.length === 0) {
    Settings.set('character_set', charset);
    return;
  }
  Backdrop.show();
  Promise.all(lists.map(readList)).then((data) => {
    _.zip(lists, data).map((pair) => {
      const [list, rows] = pair;
      Vocabulary.dropList(list);
      rows.forEach((row) => Vocabulary.addItem(row[charset], list));
    });
    Settings.set('character_set', charset);
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
      key: comparisonKey(x[1].name),
      variable: `lists.${x[0]}`,
    })).sort((a, b) => a.key > b.key);
    return {label: category, lists: lists};
  });
}

// Meteor template and event bindings follow.

Template.lists.events({
  'click .delete': () => {
    Router.go('delete_lists');
  },
  'click .import': () => {
    Popup.show({title: 'Import a word list', template: 'imports'});
  },
});

Template.lists.helpers({groups: () => toListTemplate(Lists.getAllLists())});

export {setCharacterSet, setListStatus, toListTemplate};
