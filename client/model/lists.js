// Schema: for each list, Lists tracks a variable `status.${list}` which is
// true if that list is currently enabled. In addition, Lists tracks a
// variable 'lists' which stores metadata about all available lists.
import {PersistentDict} from '/client/model/persistence';

const kLists = [
  {
    label: 'General',
    lists: [
      {label: '100 Common Radicals', list: '100cr'},
    ],
  },
  {
    label: 'Hanyu Shuiping Kaoshi',
    lists: [
      {label: 'HSK Level 1', list: 'nhsk1'},
      {label: 'HSK Level 2', list: 'nhsk2'},
      {label: 'HSK Level 3', list: 'nhsk3'},
      {label: 'HSK Level 4', list: 'nhsk4'},
      {label: 'HSK Level 5', list: 'nhsk5'},
      {label: 'HSK Level 6', list: 'nhsk6'},
    ],
  },
];

const lists = new PersistentDict('lists');

class Lists {
  static disable(list) {
    return lists.delete(`status.${list}`);
  }
  static enable(list) {
    return lists.set(`status.${list}`, true);
  }
  static enabled(list) {
    return lists.get(`status.${list}`);
  }
  static getAllLists() {
    return lists.get('lists') || kLists;
  }
  static setAllLists(value) {
    value ? lists.set('lists', value) : lists.delete('lists');
  }
}

export {Lists};
