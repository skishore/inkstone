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

const kListColumns = ['word', '', '', 'pinyin', 'definition'];

const characters = {};
const radicals = {};

// Input: a path to an asset in cordova-build-overrides/www/assets
// Output: a Promise that resolves to the String contents of that file
const lookupAsset = (path) => {
  return new Promise((resolve, reject) => {
    if (Meteor.isCordova) {
      try {
        const url = `${cordova.file.applicationDirectory}www/assets/${path}`;
        window.resolveLocalFileSystemURL(url, (entry) => {
          entry.file((file) => {
            const reader = new FileReader;
            reader.onloadend = () => resolve(reader.result);
            reader.readAsText(file);
          }, reject);
        }, reject);
      } catch (e) {
        reject(e);
      }
    } else {
      Meteor.call('lookupAsset', path, (error, data) => {
        error ? reject(error) : resolve(data);
      });
    }
  });
}

// Input: a single Chinese character
// Output: a Promise that resolves to that character's data, with keys:
//   - character: the character
//   - medians: a list of stroke medians, each of which is a list of points
//   - strokes: a list of SVG strokes comprising that character
const lookupCharacter = (character) => {
  if (!character) return Promise.reject('No character provided.');
  const path = `characters/${character.codePointAt(0)}`;
  return lookupAsset(path).then(JSON.parse);
}

// Input: an item, which includes a word and a list of lists it appears in
// Output: a Promise that resolves to the item data Object for that item:
//   - characters: a list of character data Objects for each of its characters
//   - definition: the definition of this word
//   - pinyin: the pronunciation of this word
//   - word: the word
const lookupItem = (item, callback) => {
  if (!item || !item.word || item.lists.length === 0) {
    return Promise.reject(new Error(item));
  }
  return Promise.all([
    lookupList(item.lists[0]),
    Promise.all(Array.from(item.word).map(lookupCharacter)),
  ]).then((data) => {
    const entries = data[0].filter((x) => x.word === item.word);
    if (entries.length === 0) throw new Error(`Entry not found: ${item.word}`);
    const entry = entries[0];
    entry.characters = data[1];
    const radical = radicals[item.word];
    if (radical && entry.characters.length === 1) {
      const base = entry.definition || entry.characters[0].definition || '';
      entry.definition = `${base}${base ? '; ' : ''}radical ${radical}`;
    }
    return entry;
  });
}

// Input: the name of a list
// Output: a Promise that resolves to a list of items that appear in the list,
//         each with all the data returned by lookupItem except characters
const lookupList = (list) => {
  return lookupAsset(`lists/${list}.list`).then((data) => {
    const result = [];
    data.split('\n').map((line) => {
      const values = line.split('\t');
      if (values.length != kListColumns.length) return;
      const row = {};
      kListColumns.map((column, i) => {
        if (column !== '') row[column] = values[i];
      });
      if (!_.all(row.word, (x) => characters[x])) return;
      result.push(row);
    });
    return result;
  });
}

lookupAsset('characters/all.txt').then((data) => {
  for (let character of data) characters[character] = true;
});

lookupAsset('radicals.json').then((data) => {
  _.extend(radicals, JSON.parse(data).radical_to_index_map);
});

export {lookupCharacter, lookupItem, lookupList};
