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

// Schema: settings is a simple key-value store with some defaults.
import {PersistentDict} from '/client/model/persistence';

const settings = new PersistentDict('settings');

const defaults = {
  character_set: 'simplified',
  double_tap_speed: 500,
  max_adds: 20,
  max_reviews: 200,
  paper_filter: true,
  reveal_order: true,
  revisit_failures: true,
  snap_strokes: true,
};

class Settings {
  static get(key) {
    const value = settings.get(key);
    return value === undefined ? defaults[key] : value;
  }
  static set(key, value) {
    settings.set(key, value);
  }
}

export {Settings};
