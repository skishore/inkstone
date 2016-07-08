const backing = localStorage;

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
