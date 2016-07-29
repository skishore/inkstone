import {Backdrop} from '/client/backdrop';
import {Lists} from '/client/model/lists';
import {mockPersistenceLayer} from '/client/model/persistence';
import {Settings} from '/client/model/settings';
import {Vocabulary} from '/client/model/vocabulary';
import {Overlay} from '/client/templates/overlay/code';
import {assert} from '/lib/base';

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
  if (!Settings.get('demo_mode') || demo.length === 0) {
    return kDemoSuffix();
  }
  if (demo[0]()) {
    return runDemo(demo.slice(1));
  }
  const ticker = createjs.Ticker.addEventListener('tick', () => {
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
  mockPersistenceLayer({});
  Router.go('index');
  Settings.set('demo_mode', true);
}

const kDemoSuffix = () => {
  if (!Settings.get('demo_mode')) return;
  mockPersistenceLayer(localStorage);
  Router.go('help');
  Overlay.hide();
}

const kDemos = {
  add_custom_word_lists: () => [
    highlight('.lists', "Custom lists aren't implemented yet, but when " +
                        "they are, they'll be accessible from the " +
                        '"Lists" page.'),
    waitOnTap(),
  ],
  practice_writing: () => [
    () => {
      Lists.setAllLists([{
        label: 'General',
        lists: [{label: 'Demo Words', list: 'demo'}],
      }]);
      return true;
    },
    highlight('.lists', 'First, enable a word list. ' +
                        'From the main menu, tap "Lists".'),
    waitOnUrl('lists'),
    highlight('.block:first-child', 'Use the toggle to enable the list.'),
    () => Lists.enabled('demo'),
    sleep(500),
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
    sleep(400),
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
    sleep(400),
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
    sleep(400),
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
              'Try setting it to 50.'),
    () => Settings.get('max_reviews') === 50,
    highlight('.block:contains("New Cards Per Day")',
              'Great! The next setting places a limit on the number ' +
              'of new cards added per day. Try setting it to 25.'),
    () => Settings.get('max_adds') === 25,
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

Iron.Location.onPopState(() => Meteor.defer(kDemoSuffix));

Template.help.events({
  'click .item.help-item': function(event) {
    kDemoPrefix();
    runDemo(kDemos[this.topic]());
  },
});
