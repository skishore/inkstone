// A small set of static helper methods used to implement model logic.
// The most important methods here are autorun and startup, which have the
// same contract as Tracker.autorun and Meteor.startup but wait for the
// database to be ready before executing.
const ready = new ReactiveVar();
const collections = {};
const loaded = {};

class Model {
  static autorun(callback) {
    Meteor.startup(() => Tracker.autorun(() => ready.get() && callback()));
  }
  static collection(name) {
    collections[name] = new Ground.Collection(name, {connection: null});
    return collections[name];
  }
  static startup(callback) {
    let done = false;
    this.autorun(() => Meteor.defer(() => done = done || callback() || true));
  }
  static timestamp() {
    return Math.floor(new Date().getTime() / 1000);
  }
}

// Expose all registered collections for easy debugging and set the ready bit
// when all collections are loaded from localStorage.
Ground.addListener(['loaded'], (event) => {
  loaded[event.collection] = true;
  ready.set(_.all(_.keys(collections).map((x) => loaded[x])));
});
window.collections = collections;

export {Model}
