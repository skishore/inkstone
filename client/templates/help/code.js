import {Backdrop} from '/client/backdrop';
import {Lists} from '/client/model/lists';
import {Settings} from '/client/model/settings';
import {Overlay} from '/client/templates/overlay/code';

const highlight = (selector, label) => () => {
  Overlay.blockInput();
  const elements = $(selector);
  if (elements.length === 0) return false;
  Overlay.show(elements, label);
  return true;
}

const sleep = (timeout) => {
  let done = false;
  let started = false;
  return () => {
    if (!started) {
      Overlay.blockInput();
      Meteor.setTimeout(() => done = true, timeout);
      started = true;
    }
    return done;
  };
}

const waitOnUrl = (url) => () => {
  return window.location.pathname.substr(1) === url;
}

const runDemo = (demo) => {
  if (demo.length === 0) return Overlay.hide();
  if (demo[0]()) return runDemo(demo.slice(1));
  const ticker = createjs.Ticker.addEventListener('tick', () => {
    if (demo[0]()) {
      createjs.Ticker.removeEventListener('tick', ticker);
      runDemo(demo.slice(1));
    }
  });
}

const kDemoInitializer = [
  () => {
    Settings.set('paper_filter', false);
    return true;
  },
  sleep(600),
];

const kDemos = {
  practice_writing: [
    highlight('.lists', 'First, enable a word list. ' +
                        'From the main menu, tap "Lists".'),
    waitOnUrl('lists'),
    highlight('.block:first-child', 'Use the toggle to enable the list.'),
    () => Lists.get('100cr'),
    sleep(500),
    highlight('.back-button', 'Now, go back to the main menu.'),
    waitOnUrl(''),
    highlight('.teach', 'Tap "Write" to start studying.'),
    waitOnUrl('teach'),
  ],
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
    runDemo(kDemoInitializer.concat(kDemos[topic] || []));
  });
});

window.addEventListener('message', (event) => {
  if (event.data === 'Demo iframe loaded.') {
    params.set('transform', 'translateY(0)');
    Backdrop.hide();
  }
});
