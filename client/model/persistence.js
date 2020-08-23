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

import {assert} from '/lib/base';

const registry = {};
let storage = localStorage;

const clearTables = (tables, callback) => {
  const models = tables.map((key) => registry[key]);
  assert(_.all(models));
  models.forEach((model) => model.clear());
  // WARNING: The code below is very delicate!
  //
  // Tracker.afterFlush and Meteor.defer are both required because of our
  // implementation of persistence: when we call model.clear(), the model sets
  // a reactive sentinel value that triggers a Meteor autorun which *defers*
  // an update to our backing storage. See Model._save for details.
  //
  // In addition, after any direct updates to localStorage, we must call
  // window.location.reload() because in-memory caches will be out-of-date.
  Tracker.afterFlush(() => {
    Meteor.defer(() => {
      if (callback) callback();
      window.location.reload();
    });
  });
}

const mockPersistenceLayer = (replacement) => {
  Tracker.flush();
  storage = replacement;
  Object.keys(registry).forEach((key) => registry[key]._load());
}

class PersistentDict {
  constructor(name, onload) {
    this._name = name;
    this._onload = onload;
    this._cache = {};
    this._dirty = {};
    this._sentinel = new ReactiveDict();
    this._load();
    Tracker.autorun(() => this._save());
    assert(!registry[name]);
    registry[name] = this;
  }
  clear() {
    Object.keys(this._cache).map(this.delete.bind(this));
  }
  delete(key) {
    delete this._cache[key];
    this._dirty[key] = true;
    this._sentinel.set(key, !this._sentinel.get(key));
  }
  depend() {
    this._sentinel.allDeps.depend();
  }
  get(key) {
    this._sentinel.get(key);
    return this._cache[key];
  }
  keys() {
    this.depend();
    return _.keys(this._cache);
  }
  set(key, value) {
    this._cache[key] = value;
    this._dirty[key] = true;
    this._sentinel.set(key, !this._sentinel.get(key));
  }
  _load() {
    this.clear();
    const prefix = `table.${this._name}.`;
    const ids = Object.keys(storage).filter((id) => id.startsWith(prefix));
    ids.forEach((id) => this.set(
        id.substr(prefix.length), JSON.parse(storage[id])));
    this._onload && this._onload(this._cache);
    this._dirty = {};
  }
  _save() {
    this.depend();
    Meteor.defer(() => {
      Object.keys(this._dirty).forEach((key) => {
        const id = `table.${this._name}.${key}`;
        if (this._cache.hasOwnProperty(key)) {
          storage[id] = JSON.stringify(this._cache[key]);
        } else {
          delete storage[id];
        }
      });
      this._dirty = {};
    });
  }
}

class PersistentVar {
  constructor(name) {
    this._dict = new PersistentDict(name);
  }
  get() {
    return this._dict.get('value');
  }
  set(value) {
    const clear = value === undefined;
    clear ? this._dict.delete('value') : this._dict.set('value', value);
  }
}

export {clearTables, mockPersistenceLayer, PersistentDict, PersistentVar};
