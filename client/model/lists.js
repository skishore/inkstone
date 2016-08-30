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

// Schema: for each list, Lists tracks a variable `status.${list}` which is
// true if that list is currently enabled. In addition, Lists tracks a
// variable 'lists' which stores a mapping from list name to list metadata.
// List metadata is a map with the keys:
//  - category: The category the list belongs to.
//  - name: The name of the list.
//  - ts: The last-modified timestamp. Set for lists imported from the web.
import {PersistentDict} from '/client/model/persistence';

const kLists = {
  '100cr': {category: 'General', name: '100 Common Radicals'},
  'nhsk1': {category: 'Hanyu Shuiping Kaoshi', name: 'HSK Level 1'},
  'nhsk2': {category: 'Hanyu Shuiping Kaoshi', name: 'HSK Level 2'},
  'nhsk3': {category: 'Hanyu Shuiping Kaoshi', name: 'HSK Level 3'},
  'nhsk4': {category: 'Hanyu Shuiping Kaoshi', name: 'HSK Level 4'},
  'nhsk5': {category: 'Hanyu Shuiping Kaoshi', name: 'HSK Level 5'},
  'nhsk6': {category: 'Hanyu Shuiping Kaoshi', name: 'HSK Level 6'},
};

const kSchema = {category: String, name: String, ts: Match.Maybe(Number)};

const lists = new PersistentDict('lists');

class Lists {
  // Methods for adding, removing, or looking up list metadata.
  static addList(list, metadata) {
    check(metadata, kSchema);
    const lists = Lists.getAllLists();
    lists[list] = metadata;
    Lists.setAllLists(lists);
  }
  static deleteList(list) {
    const lists = Lists.getAllLists();
    if (!lists[list] || kLists[list]) return;
    delete lists[list];
    Lists.setAllLists(lists);
  }
  static getAllLists() {
    return lists.get('lists') || _.extend({}, kLists);
  }
  static getImportedLists() {
    const result = {};
    const lists = Lists.getAllLists();
    _.keys(lists).filter((x) => !kLists[x])
                 .forEach((x) => result[x] = lists[x]);
    return result;
  }
  static setAllLists(value) {
    lists.set('lists', value);
  }
  // Methods for getting and setting the status of an individual list.
  static anyListEnabled() {
    return lists.keys().filter((key) => key.startsWith('status.')).length > 0;
  }
  static disable(list) {
    lists.delete(`status.${list}`);
  }
  static enable(list) {
    lists.set(`status.${list}`, true);
  }
  static isListEnabled(list) {
    return lists.get(`status.${list}`);
  }
}

export {Lists};
