import {Backdrop} from '/client/backdrop';
import {Lists} from '/client/model/lists';
import {Overlay} from '/client/templates/overlay/code';

const highlight = (selector, label) => () => {
  const elements = $(selector);
  if (elements.length === 0) return false;
  Overlay.show(elements, label);
  return true;
}

const waitOnUrl = (url) => () => {
  return window.location.pathname.substr(1) === url;
}

const demo = [
  highlight('.lists', 'First, enable a word list. ' +
                      'From the main menu, tap "Lists".'),
  waitOnUrl('lists'),
  highlight('.block:first-child', 'Use the toggle to enable the list.'),
  () => Lists.get('100cr'),
  highlight('.back-button', 'Now, go back to the main menu.'),
  waitOnUrl(''),
  highlight('.teach', 'Tap "Write" to start studying.'),
  waitOnUrl('teach'),
];

const run = (demo) => {
  if (demo.length === 0) return Overlay.hide();
  const step = demo[0];
  const ticker = createjs.Ticker.addEventListener('tick', () => {
    if (demo[0]()) {
      createjs.Ticker.removeEventListener('tick', ticker);
      run(demo.slice(1));
    }
  });
}

const kSelectors = {
  add_custom_word_lists: '.lists',
  practice_writing: '.teach',
  turn_off_snap_strokes: '.settings',
  tweak_scheduling: '.settings',
};

const params = new ReactiveDict();

Template.demo.helpers({get: (key) => params.get(key)});

Template.help.events({
  'click .item.help-item': function(event) {
    params.clear();
    params.set('topic', this.topic);
    window.mockLocalStorage = {};
    window.mockLocalStorage['table.settings.paper_filter'] = false;
    Backdrop.show();
  },
});

Meteor.startup(() => {
  const index = window.location.search.indexOf('demo=');
  if (index < 0) return;
  Template.layout.onRendered(() => {
    parent.postMessage('Demo iframe loaded.', '*');
    const topic = window.location.search.substr(index + 5);
    const selector = kSelectors[topic];
    Meteor.setTimeout((() => Overlay.show($(selector))), 600);
  });
});

window.addEventListener('message', (event) => {
  if (event.data === 'Demo iframe loaded.') {
    params.set('transform', 'translateY(0)');
    Backdrop.hide();
  }
});
