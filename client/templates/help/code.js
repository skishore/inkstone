import {Backdrop} from '/client/backdrop';
import {Overlay} from '/client/templates/overlay/code';

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
