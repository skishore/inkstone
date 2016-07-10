// Schema: vocabulary is a list of words that the user is studying, with info
// about how often they've seen that word, when they've seen it last, etc:
//  - word: string
//  - last: Unix timestamp when the word was last seen
//  - next: Unix timestamp when the word is next due
//  - lists: array of active lists that the word appears in
//  - attempts: number of times the user has seen the word
//  - successes: number of times the user has gotten the word right
//  - failed: true if this item should be shown again in the failures deck
//
// The "updateItem" model method takes a "result" argument which should be a
// value in the set {0, 1, 2, 3}, with higher numbers indicating that the
// user made more errors.
import {getNextInterval} from '/client/external/inkren/interval_quantifier';
import {Table} from '/client/model/table';

const kNumChunks = 16;
const kColumns = 'word last next lists attempts successes failed'.split(' ');
const kIndices = {};
kColumns.forEach((x, i) => kIndices[x] = i);

const table = new Table('vocabulary');
const vocabulary = {active: [], chunks: [], index: {}};

const chunk = (word) => vocabulary.chunks[Math.abs(word.hash()) % kNumChunks];

const dirty = (word) => {
  const keys = word ? [Math.abs(word.hash()) % kNumChunks]
                    : _.range(kNumChunks);
  keys.forEach((key) => table.setItem(key, vocabulary.chunks[key]));
}

const materialize = (entry) => {
  const result = {};
  kColumns.forEach((x, i) => result[x] = entry[i]);
  return result;
}

class Cursor {
  constructor(filter) {
    table.depend();
    this._list = vocabulary.active.filter(filter);
  }
  count() {
    return this._list.length;
  }
  fetch() {
    return this._list.map(materialize);
  }
  next() {
    let count = 0;
    let first = null;
    let result = null;
    for (let entry of this._list) {
      const next = entry[kColumns.next] || Infinity;
      if (!result || next < first) {
        count = 1;
        first = next;
        result = entry;
      } else if (next === first) {
        count += 1;
        if (count * Math.random() < 1) {
          result = entry;
        }
      }
    }
    return result && materialize(result);
  }
}

class Vocabulary {
  static addItem(word, list) {
    if (!vocabulary.index[word]) {
      const entry = [word, null, null, [], 0, 0, false];
      if (entry.length !== kColumns.length) throw new Error(entry);
      chunk(word).push(entry);
      vocabulary.index[word] = entry;
    }
    const entry = vocabulary.index[word];
    const lists = entry[kIndices.lists];
    if (lists.indexOf(list) < 0) {
      lists.push(list);
      if (lists.length === 1) vocabulary.active.push(entry);
    }
    dirty(word);
  }
  static clearFailed(item) {
    const entry = vocabulary.index[item.word];
    if (entry) entry[kIndices.failed] = false;
    dirty(item.word);
  }
  static dropList(list) {
    const updated = {active: [], chunks: []};
    _.range(kNumChunks).forEach(() => updated.chunks.push([]));
    vocabulary.chunks.forEach((chunk, i) => chunk.forEach((entry) => {
      const lists = entry[kIndices.lists].filter((x) => x !== list);
      if (lists.length + entry[kIndices.attempts] > 0) {
        entry[kIndices.lists] = lists;
        updated.chunks[i].push(entry);
        if (lists.length > 0) updated.active.push(entry);
      } else {
        delete vocabulary.index[entry[kIndices.word]];
      }
    }));
    vocabulary.active = updated.active;
    vocabulary.chunks = updated.chunks;
    dirty();
  }
  static getExtraItems(last) {
    return new Cursor((entry) => {
      return entry[kIndices.attempts] === 0 || entry[kIndices.last] < last;
    });
  }
  static getFailuresInRange(start, end) {
    return new Cursor((entry) => {
      if (!entry[kIndices.failed]) return false;
      const last = entry[kIndices.last];
      return start <= last && last < end;
    });
  }
  static getItemsDueBy(last, next) {
    return new Cursor((entry) => {
      if (entry[kIndices.attempts] === 0) return false;
      return entry[kIndices.last] < last && entry[kIndices.next] < next;
    });
  }
  static getNewItems() {
    return new Cursor((entry) => entry[kIndices.attempts] === 0);
  }
  static updateItem(item, result) {
    const entry = vocabulary.index[item.word];
    if (!entry || entry[kIndices.attempts] !== item.attempts) return;

    const last = Date.timestamp();
    entry[kIndices.last] = last;
    entry[kIndices.next] = last + getNextInterval(item, result, last);

    const success = result < 3;
    entry[kIndices.attempts] = item.attempts + 1;
    entry[kIndices.successes] = item.successes + (success ? 1 : 0);
    entry[kIndices.failed] = !success;
    dirty(item.word);
  }
}

_.range(kNumChunks).forEach((i) => {
  vocabulary.chunks.push(table.getItem(i) || []);
  vocabulary.chunks[i].forEach((entry) => {
    vocabulary.index[entry[kIndices.word]] = entry;
    if (entry[kIndices.lists].length > 0) vocabulary.active.push(entry);
  });
});

export {Vocabulary};
