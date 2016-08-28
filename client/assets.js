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

const kListColumns = [
  'word', 'traditional', 'numbered', 'pinyin', 'definition'];

const characters = {};
const radicals = {};

// On Cordova, imported assets are under a different directory than builtins.
const isImportedAsset = (asset) => asset.startsWith('lists/s/');

// Input: a list of path fragments in a Cordova filesystem
// Output: the entry of the directory given by fragments.join('/'), which is
//         created recursively if folders on the path do not already exist.
const getDirectoryEntry = (fragments, root) => {
  if (fragments.length === 0 && !root) return Promise.reject('No fragments.');
  if (fragments.length === 0) return Promise.resolve(root);
  return new Promise((resolve, reject) => {
    const recurse = (entry) => getDirectoryEntry(fragments.slice(1), entry)
                                  .then(resolve).catch(reject);
    root ? root.getDirectory(fragments[0], {create: true}, recurse, reject)
         : window.resolveLocalFileSystemURL(fragments[0], recurse, reject);
  });
}

// Input: a path to an asset in cordova-build-overrides/www/assets
// Output: a Promise that resolves to the String contents of that file
const readAsset = (path) => {
  return new Promise((resolve, reject) => {
    if (Meteor.isCordova) {
      try {
        const root = isImportedAsset(path) ?
            cordova.file.dataDirectory : cordova.file.applicationDirectory;
        const url = `${root}www/assets/${path}`;
        window.resolveLocalFileSystemURL(url, (entry) => {
          entry.file((file) => {
            const reader = new FileReader;
            reader.onerror = reject;
            reader.onloadend = () => resolve(reader.result);
            reader.readAsText(file);
          }, reject);
        }, reject);
      } catch (e) {
        reject(e);
      }
    } else {
      Meteor.call('readAsset', path, (error, data) => {
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
const readCharacter = (character) => {
  if (!character) return Promise.reject('No character provided.');
  const path = `characters/${character.codePointAt(0)}`;
  return readAsset(path).then(JSON.parse);
}

// Input: an item, which includes a word and a list of lists it appears in
// Output: a Promise that resolves to the item data Object for that item:
//   - characters: a list of character data Objects for each of its characters
//   - definition: the definition of this word
//   - numbered: the pronunciation of this word in the form `Zhong1wen2`.
//   - pinyin: the pronunciation of this word
//   - traditional: the word in traditional characters
//   - word: the word
const readItem = (item, callback) => {
  if (!item || !item.word || item.lists.length === 0) {
    return Promise.reject(new Error(item));
  }
  return Promise.all([
    readList(item.lists[0]),
    Promise.all(Array.from(item.word).map(readCharacter)),
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
//         each with all the data returned by readItem except characters
const readList = (list) => {
  return readAsset(`lists/${list}.list`).then((data) => {
    const result = [];
    data.split('\n').forEach((line) => {
      const values = line.split('\t');
      if (values.length !== kListColumns.length) return;
      const row = {};
      kListColumns.forEach((column, i) => row[column] = values[i]);
      if (!_.all(row.word, (x) => characters[x])) return;
      result.push(row);
    });
    return result;
  });
}

// Input: a path to an asset in cordova-build-overrides/www/assets, and data
//        to write to the asset at that path.
// Output: a Promise that resolves to true if the write is successful.
const writeAsset = (path, data) => {
  return new Promise((resolve, reject) => {
    if (Meteor.isCordova) {
      try {
        const prefix = [cordova.file.dataDirectory, 'www', 'assets'];
        const fragments = prefix.concat(path.split('/'));
        const filename = fragments.pop();
        return getDirectoryEntry(fragments).then((entry) => {
          entry.getFile(filename, {create: true}, (file) => {
            file.createWriter((writer) => {
              writer.onerror = reject;
              writer.onwriteend = () => resolve(true);
              writer.write(new Blob([data]), {type: 'text/plain'});
            }, reject);
          }, reject);
        }).catch(reject);
      } catch (e) {
        reject(e);
      }
    } else {
      Meteor.call('writeAsset', path, data, (error) => {
        error ? reject(error) : resolve(true);
      });
    }
  });
}

// Input: a list of list-item objects with all the list column keys
// Output: a promise that resolves to a dict with the following keys:
//    - items: the set of new words added included in the list
//    - missing: the set of characters in list without stroke data
//
// WARNING: If items is an empty set, the list will not actually be written.
// This is a failure case that should be handled by the caller.
const writeList = (list, rows) => {
  const data = [];
  const result = {items: {}, missing: {}};
  for (let row of rows) {
    const fields = kListColumns.map((column) => row[column]);
    const missing = kListColumns.filter((column) => !row[column]);
    if (missing.length > 0) {
      return Promise.reject(`Malformatted row: ${fields.join(', ')}. ` +
                            `Missing data for: ${missing.join(', ')}.`);
    }
    if (!_.all(row.word, (x) => characters[x])) {
      Array.from(row.word).forEach(
          (x) => { if (!characters[x]) result.missing[x] = true; });
      continue;
    }
    const line = fields.join('\t');
    if (line.split('\t').length !== fields.length) {
      return Promise.reject(`Row contains tabs: ${fields.join(', ')}.`);
    }
    data.push(line);
    result.items[row.word] = true;
  }
  if (data.length === 0) return Promise.resolve(result);
  return writeAsset(`lists/${list}.list`, data.join('\n')).then(() => result);
}

readAsset('characters/all.txt').then((data) => {
  for (let character of data) characters[character] = true;
});

readAsset('radicals.json').then((data) => {
  _.extend(radicals, JSON.parse(data).radical_to_index_map);
});

export {readCharacter, readItem, readList, writeList};
