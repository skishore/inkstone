const demo = location.search.indexOf('demo') >= 0;
const storage = demo ? null : localStorage;

class PersistentDict {
  constructor(name) {
    this._name = name;
    this._cache = {};
    this._dirty = {};
    this._sentinel = new ReactiveDict();
    if (storage) {
      this._load();
      Meteor.autorun(() => this._save());
    }
  }
  delete(key) {
    delete this._cache[key];
    this._dirty[key] = true;
    this._sentinel.set(key, !this._sentinel.get(key));
  }
  depend() {
    this._sentinel.allDeps.depend();
  }
  get(key) {
    this._sentinel.get(key);
    return this._cache[key];
  }
  set(key, value) {
    this._cache[key] = value;
    this._dirty[key] = true;
    this._sentinel.set(key, !this._sentinel.get(key));
  }
  _load() {
    const prefix = `table.${this._name}.`;
    const ids = Object.keys(storage).filter((id) => id.startsWith(prefix));
    ids.forEach((id) => this.set(
        id.substr(prefix.length), JSON.parse(storage.getItem(id))));
    this._dirty = {};
  }
  _save() {
    this.depend();
    Meteor.defer(() => {
      Object.keys(this._dirty).forEach((key) => {
        const id = `table.${this._name}.${key}`;
        if (this._cache.hasOwnProperty(key)) {
          storage.setItem(id, JSON.stringify(this._cache[key]));
        } else {
          storage.removeItem(id);
        }
      });
      this._dirty = {};
    });
  }
}

class PersistentVar {
  constructor(name) {
    this._dict = new PersistentDict(name);
  }
  get() {
    return this._dict.get('value');
  }
  set(value) {
    const clear = value === undefined;
    clear ? this._dict.delete('value') : this._dict.set('value', value);
  }
}

export {PersistentDict, PersistentVar};
