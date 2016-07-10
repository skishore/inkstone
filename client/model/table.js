const backing = localStorage;

// TODO(skishore): Rename this class to PersistentReactiveDict.
// TODO(skishore): Add a PersistentReactiveVar class and use it for Timing.
// TODO(skishore): Make it possible to mock out persistence for demo mode.
// TODO(skishore): Make Lists into another model file.
// TODO(skishore): Investigate the behavior of the "depend" method. Does it
// cause invalidation when a key that has no dependencies is queried?
class Table {
  constructor(name) {
    this._name = name;
    this._cache = {};
    this._dirty = {};
    this._sentinel = new ReactiveDict();
    this._load();
    Meteor.autorun(() => this._save());
  }
  depend() {
    this._sentinel.allDeps.depend();
  }
  getItem(key) {
    this._sentinel.get(key);
    return this._cache[key];
  }
  removeItem(key, value) {
    delete this._cache[key];
    this._dirty[key] = true;
    this._sentinel.set(key, !this._sentinel.get(key));
  }
  setItem(key, value) {
    this._cache[key] = value;
    this._dirty[key] = true;
    this._sentinel.set(key, !this._sentinel.get(key));
  }
  _load() {
    const prefix = `table.${this._name}.`;
    const ids = Object.keys(backing).filter((id) => id.startsWith(prefix));
    ids.forEach((id) => this.setItem(
        id.substr(prefix.length), JSON.parse(backing.getItem(id))));
    this._dirty = {};
  }
  _save() {
    this.depend();
    Meteor.defer(() => {
      Object.keys(this._dirty).forEach((key) => {
        const id = `table.${this._name}.${key}`;
        if (this._cache.hasOwnProperty(key)) {
          backing.setItem(id, JSON.stringify(this._cache[key]));
        } else {
          backing.removeItem(id);
        }
      });
      this._dirty = {};
    });
  }
}

export {Table};
