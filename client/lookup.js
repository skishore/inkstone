const kListColumns = ['word', '', '', 'pinyin', 'definition'];

const lookupAsset = (name) => {
  return new Promise((resolve, reject) => {
    const filename = cordova.file.applicationDirectory + 'www/assets/' + name;
    window.resolveLocalFileSystemURL(filename, (entry) => {
      entry.file((file) => {
        const reader = new FileReader;
        reader.onloadend = () => resolve(reader.result);
        reader.readAsText(file);
      }, reject);
    }, reject);
  });
}

const lookupCharacter = (character) => {
  if (!character) return Promise.reject('No character provided.');
  if (Meteor.isCordova) {
    const asset = `characters/${character.codePointAt(0)}`;
    return lookupAsset(asset).then(JSON.parse);
  }
  return new Promise((resolve, reject) => {
    Meteor.call('getCharacter', character, (error, data) => {
      error ? reject(error) : resolve(data);
    });
  });
}

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
    return entry;
  });
}

const lookupList = (list) => {
  return new Promise((resolve, reject) => {
    $.get(`lists/${list}.list`, (data, code) => {
      if (code !== 'success') reject(new Error(code));
      const result = [];
      data.split('\n').map((line) => {
        const values = line.split('\t');
        if (values.length != kListColumns.length) return;
        const row = {};
        kListColumns.map((column, i) => {
          if (column !== '') row[column] = values[i];
        });
        result.push(row);
      });
      resolve(result);
    });
  });
}

export {lookupCharacter, lookupItem, lookupList};
