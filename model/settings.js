// Schema: settings is a simple key-value store with some defaults.
import {Table} from '/model/table';

const settings = new Table('settings');

const defaults = {
  'settings.double_tap_speed': 500,
  'settings.max_adds': 50,
  'settings.max_reviews': 100,
  'settings.paper_filter': true,
  'settings.reveal_order': true,
  'settings.revisit_failures': true,
  'settings.snap_strokes': true,
};

class Settings {
  static get(key) {
    const value = settings.getItem(key);
    return value === undefined ? defaults[key] : value;
  }
  static set(key, value) {
    settings.setItem(key, value);
  }
}

export {Settings};
