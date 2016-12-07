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

import {kCharacters, writeCharacter} from '/client/assets';
import {Assets} from '/client/model/assets';
import {kHomePage, fetchUrl} from '/lib/base';
import {assetForCharacter} from '/lib/characters';

// Returns a list of "item" objects for assets that are in our asset manifest
// but have not been saved to our asset store. Each item has keys:
//   - asset: the filename of the asset
//   - version: the version we should be at for that asset
const computeMissingAssets = (characters) => {
  const targets = {};
  for (let character of Object.keys(characters)) {
    const asset = assetForCharacter(character);
    targets[asset] = (targets[asset] || 0) + 1;
  }
  const result = [];
  for (const asset of Object.keys(targets)) {
    if (Assets.getVersion(asset) < targets[asset]) {
      result.push({asset: asset, version: targets[asset]});
    }
  }
  result.sort((a, b) => a.asset < b.asset);
  return result;
}

// Returns a Promise that resolves to true when we have loaded the asset.
const loadMissingAsset = (item) => {
  const url = `${kHomePage}/assets/${item.asset}`;
  return fetchUrl(url).then((data) => {
    // TODO(skishore): Handle different types of assets differently here.
    const characters = data.split('\n').filter((x) => x).map(JSON.parse);
    if (characters.length === 0) throw new Error(item);
    return mapAsync(writeCharacter, characters);
  }).then(() => {
    Assets.setVersion(item.asset, item.version);
    return true;
  });
}

// Maps an asynchronous function SERIALLY over the given list. Returns a
// Promise that resolves to true when it is complete.
//
// NOTE(skishore): We could parellelize the async functions here, but when
// loading assets, we need to fetch ~100 URLs and write ~10k asset files,
// which we would need a threadpool to execute properly. Instead, we take the
// serial latency hit, which is not so bad since we only load assets once.
const mapAsync = (fn, args, index) => {
  index = index || 0;
  if (args.length === index) return Promise.resolve(true);
  return fn(args[index]).then(() => mapAsync(fn, args, index + 1));
}

//kCharacters.then(computeMissingAssets)
//           .then((items) => mapAsync(loadMissingAsset, items))
//           .catch((error) => console.error(error));

Template.assets.helpers({
  progress: () => 0,
  style: () => 'display: none;',
});
