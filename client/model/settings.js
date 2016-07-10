// Schema: settings is a simple key-value store with some defaults.
import {PersistentDict} from '/client/model/persistence';

const settings = new PersistentDict('settings');

const defaults = {
  double_tap_speed: 500,
  max_adds: 50,
  max_reviews: 100,
  paper_filter: true,
  reveal_order: true,
  revisit_failures: true,
  snap_strokes: true,
};

class Settings {
  static get(key) {
    const value = settings.get(key);
    return value === undefined ? defaults[key] : value;
  }
  static set(key, value) {
    settings.set(key, value);
  }
}

export {Settings};
