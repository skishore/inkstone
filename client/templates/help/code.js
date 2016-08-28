/*
 *  Copyright 2016 Shaunak Kishore (kshaunak "at" gmail.com)
 *
 *  This file is part of Inkstone.
 *
 *  Inkstone is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  Inkstone is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with Inkstone.  If not, see <http://www.gnu.org/licenses/>.
 */

import {Backdrop} from '/client/backdrop';
import {Lists} from '/client/model/lists';
import {mockPersistenceLayer} from '/client/model/persistence';
import {Settings} from '/client/model/settings';
import {Vocabulary} from '/client/model/vocabulary';
import {Overlay} from '/client/templates/overlay/code';
import {Popup} from '/client/templates/popup/code';
import {assert} from '/lib/base';

let allow_back_button = false;

const allow = (executor) => block(executor, /*allow_input=*/true);

const block = (executor, allow_input) => {
  let done = false;
  let started = false;
  return () => {
    if (!started) {
      if (!allow_input) Overlay.blockInput();
      executor(() => done = true);
      started = true;
    }
    return done;
  }
}

const blockOnEvent = (name) => block((done) => $(window).one(name, done));

const highlight = (selector, label) => () => {
  Overlay.blockInput();
  const elements = $(selector);
  if (elements.length === 0) return false;
  Overlay.show(elements, label);
  return true;
}

const sleep = (timeout) => block((done) => Meteor.setTimeout(done, timeout));

const waitOnEvent = (name) => allow((done) => $(window).one(name, done));

const waitOnTap = () => block((done) => $(window).one('click', done));

const waitOnUrl = (url) => () => {
  return window.location.pathname.substr(1) === url;
}

const runDemo = (demo) => {
  // Don't run any demo logic if the demo is over.
  if (!Settings.get('demo_mode') || demo.length === 0) {
    return kDemoSuffix();
  } else if (demo[0]()) {
    return runDemo(demo.slice(1));
  }
  const ticker = createjs.Ticker.addEventListener('tick', () => {
    // Again, in each frame, don't run any demo logic if the demo is over.
    if (!Settings.get('demo_mode')) {
      createjs.Ticker.removeEventListener('tick', ticker);
    } else if (demo[0]()) {
      createjs.Ticker.removeEventListener('tick', ticker);
      runDemo(demo.slice(1));
    }
  });
}

const kDemoPrefix = () => {
  if (Settings.get('demo_mode')) return;
  Router.go('index');
  mockPersistenceLayer({});
  Settings.set('demo_mode', true);
}

const kDemoSuffix = () => {
  if (!Settings.get('demo_mode')) return;
  // Ensure that no matter what page we were on, we'll end up on the help page
  // and that hitting back once will return us to the main menu.
  history.pushState(undefined, undefined, '/');
  history.pushState(undefined, undefined, '/help');
  // We call Router.go here before mockPersistenceLayer because the latter
  // function calls Tracker.flush(), which triggers the UI refresh. If we
  // weren't already on the help page, we would see a flash of another page.
  Router.go('help', undefined, {replaceState: true});
  mockPersistenceLayer(localStorage);
  Overlay.hide();
  Popup.hide();
}

const kDemos = {
  add_custom_word_lists: () => [
    () => {
      Lists.setAllLists({demo: {category: 'My Lists', name: 'Chinese 101'}});
      return true;
    },
    highlight('.lists', 'You can import and delete custom ' +
                        'lists on the "Lists" page.'),
    waitOnUrl('lists'),
    highlight('.block .item.customization-option.import',
              'Tap here to import custom word lists.'),
    () => $('.popup').length > 0,
    sleep(300),
    highlight('.popup', 'You can import shared lists from GitHub (requires ' +
                        'a data connection) or local files from your device.'),
    waitOnTap(),
    highlight('.popup .option.format',
              'Consult the Inkstone documentation for ' +
              'information about the list data format.'),
    waitOnTap(),
    () => Popup.hide() || true,
    highlight('.block .item.customization-option.delete',
              'You can delete custom lists. Doing so will not ' +
              'delete your progress on words from those lists.'),
    waitOnTap(),
    highlight('.block.group',
              'Importing a list just makes it available on this page. ' +
              'Remember to enable your lists after importing them!'),
    waitOnTap(),
  ],
  practice_writing: () => [
    () => {
      Lists.setAllLists({demo: {category: 'General', name: 'Demo Words'}});
      return true;
    },
    highlight('.lists', 'First, enable a word list. ' +
                        'From the main menu, tap "Lists".'),
    waitOnUrl('lists'),
    highlight('.block.group', 'Use the toggle to enable the list.'),
    () => Lists.isListEnabled('demo'),
    sleep(500),
    () => {
      allow_back_button = true;
      return true;
    },
    highlight('.back-button', 'Now, go back to the main menu.'),
    waitOnUrl(''),
    highlight('.teach', 'Tap "Write" to start studying.'),
    waitOnUrl('teach'),
    highlight('.prompt', "At the top of this page, you'll see " +
                         'the pinyin and definition of a word.'),
    waitOnTap(),
    highlight('.flashcard', 'The first character of this word is 中. ' +
                            'Try writing it now - remember that stroke ' +
                            'order matters!'),
    waitOnEvent('makemeahanzi-character-complete'),
    highlight('.flashcard', 'Inkstone automatically grades your writing. ' +
                            'Swipe up to change your grade, ' +
                            'or tap to move on.'),
    waitOnEvent('makemeahanzi-next-character'),
    highlight('.flashcard', 'Now, write the second character of Zhōngwén. ' +
                            'Tap for a hint. Double-tap for the answer.'),
    waitOnEvent('makemeahanzi-character-complete'),
    highlight('.flashcard', 'Great job! Tap to move ' +
                            'on to the next flashcard.'),
    waitOnEvent('makemeahanzi-next-character'),
    () => {
      Settings.set('max_adds', 0);
      Settings.set('max_reviews', 0);
      Settings.set('revisit_failures', false);
      return true;
    },
    blockOnEvent('makemeahanzi-flashcard-slide'),
    highlight('.flashcard.errors', 'After completing all cards scheduled ' +
                                   'for the day, you have the option to ' +
                                   'add extra cards.'),
    waitOnTap(),
    highlight('.control.right', 'While studying, use the "learn" button to ' +
                                'find out more about characters in the ' +
                                'current word.'),
    waitOnTap(),
    highlight('.control.left', "When you're done, use the " +
                               '"home" button to return to the main menu.'),
    waitOnTap(),
  ],
  turn_off_snap_strokes: () => [
    () => {
      Vocabulary.addItem('中文', 'demo');
      return true;
    },
    highlight('.settings', 'For an extra challenge, you can turn off ' +
                           "Inkstone's writing assistance. To do so, " +
                           'go to the "Settings" page.'),
    waitOnUrl('settings'),
    highlight('.item:contains("Snap Strokes")',
              'Turn writing assistance off here.'),
    () => !Settings.get('snap_strokes'),
    () => Router.go('teach') || true,
    highlight('.flashcard', 'Try writing the word 中文 below. Before ' +
                            'finishing each character, you will only get ' +
                            'to see your own strokes!'),
    waitOnEvent('makemeahanzi-next-character'),
    waitOnEvent('makemeahanzi-next-character'),
    () => {
      Settings.set('max_adds', 0);
      Settings.set('max_reviews', 0);
      Settings.set('revisit_failures', false);
      return true;
    },
    blockOnEvent('makemeahanzi-flashcard-slide'),
    highlight('.flashcard', 'Nice job! Note that you must still use proper ' +
                            'stroke order in this mode, and that you can ' +
                            'still tap for a hint.'),
    waitOnTap(),
  ],
  tweak_scheduling: () => [
    () => {
      const cjk = 19968;
      const adds = 200;
      const failures = 7;
      const reviews = 200;
      _.range(adds + failures + reviews).forEach((i) => {
        const character = String.fromCharCode(cjk + i);
        Vocabulary.addItem(character, 'demo');
      });
      const ts = Date.timestamp();
      const items = Vocabulary.getNewItems().fetch();
      assert(items.length === adds + failures + reviews);
      items.forEach((item, i) => {
        if (i < failures) {
          Vocabulary.updateItem(item, 3, ts);
        } else if (i < failures + reviews) {
          Vocabulary.updateItem(item, 0, ts - 365 * 86400);
        }
      });
      return true;
    },
    highlight('#header', 'Before changing scheduling settings, ' +
                         'take a look at the status bar.'),
    waitOnTap(),
    highlight('.info.left', 'The amount of time left in the current ' +
                            'session is shown on the left.'),
    waitOnTap(),
    highlight('.info.right', 'The total number of flashcards remaining is ' +
                             'shown on the right: regularly-scheduled ' +
                             'cards plus mistakes to review.'),
    waitOnTap(),
    highlight('.settings', 'Now, go to the "Settings" page to ' +
                           'change scheduling settings.'),
    waitOnUrl('settings'),
    highlight('.item:contains("Revisit Failures")',
              'When you get a flashcard wrong, it is scheduled again ' +
              'for review that day. Try disabling this option now.'),
    () => !Settings.get('revisit_failures'),
    sleep(50),
    highlight('.info.right', 'Note that mistakes are no longer ' +
                             'included in the flashcard count.'),
    waitOnTap(),
    () => {
      $('.ionic-body .content').scrollTop(window.innerHeight);
      return true;
    },
    highlight('.block:contains("Reviews Per Day")',
              'Reviews are flashcards that you have seen before. ' +
              'This setting bounds the number of reviews per day. ' +
              'Try setting it to 100.'),
    () => Settings.get('max_reviews') === 100,
    highlight('.block:contains("New Cards Per Day")',
              'Great! The next setting places a limit on the number ' +
              'of new cards added per day. Try setting it to 10.'),
    () => Settings.get('max_adds') === 10,
    sleep(50),
    highlight('.info.right', 'As with the "Revisit Failures" setting, ' +
                             'changes to these settings are immediately ' +
                             'reflected in the count.'),
    waitOnTap(),
    () => {
      $('.ionic-body .content').scrollTop(0);
      return true;
    },
  ],
};

Iron.Location.onPopState(() => {
  // Normally, pressing a back button immediately terminates any running demo.
  // However, there are cases when a demo instructs the user to press back.
  if (allow_back_button) {
    allow_back_button = false;
  } else {
    Meteor.defer(kDemoSuffix);
  }
});

Template.help.events({
  'click .item.help-item': function(event) {
    if (this.link) {
      window.open(this.link, '_system');
    } else if (this.page) {
      Router.go(this.page);
    } else if (this.topic) {
      kDemoPrefix();
      runDemo([sleep(300)].concat(kDemos[this.topic]()));
    }
  },
});
