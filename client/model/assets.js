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

// Schema: assets is a map from data file names to versions of that file that
// are loaded. For example, each character c comes in a data file called
//   `${Math.floor(c.charCodeAt(0)/256)}`
//
// As a result, there are 256 characters in each of these numbered files.
// Additionally, there might be other pre-loaded data files in the future.
import {PersistentDict} from '/client/model/persistence';
import {assert} from '/lib/base';

const assets = new PersistentDict('assets');

class Assets {
  static getVersion(filename) {
    return (assets.get('data') || {})[filename] || 0;
  }
  static setVersion(filename, version) {
    check(version, Match.Integer);
    const data = assets.get('data') || {};
    data[filename] = version;
    assets.set('data', data);
  }
}

export {Assets};
