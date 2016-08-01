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
