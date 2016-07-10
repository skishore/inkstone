// Timing is a model class that maintains the user's state for their current
// Inkstone session and supports queries like:
//  - How many flash cards are left in this session?
//  - What is the next flash card?
import {PersistentVar} from '/client/model/persistence';
import {Settings} from '/client/model/settings';
import {Vocabulary} from '/client/model/vocabulary';
import {assert} from '/lib/base';

// Timing state tier 1: a persistent variable, timing, which stores a list of
// card counts for the current session and the timestamp at which it began.
// On each frame, we check whether the current session is over.

const kSessionDuration = 12 * 60 * 60;

const timing = new PersistentVar('timing');

timing.update = (ts, update) => {
  const counts = timing.get();
  if (!counts || counts.ts !== ts) return false;
  timing.set(update(counts));
  return true;
}

const newCounts = (ts) => ({
  adds: 0,
  failures: 0,
  reviews: 0,
  min_cards: 0,
  ts: ts,
});

const updateTimestamp = () => {
  const now = Date.timestamp();
  const counts = timing.get() || {ts: -Infinity};
  const wait = counts.ts + kSessionDuration - now;
  if (wait > 0) {
    time_left.set(wait);
  } else {
    timing.set(newCounts(now));
    time_left.set(kSessionDuration);
  }
  requestAnimationFrame(updateTimestamp);
}

Meteor.startup(updateTimestamp);

// Timing state tier 2: reactive variables built on top of the session counts
// that track what the next card is and how many cards of different classes
// are left in this session.

const maxes = new ReactiveVar();
const next_card = new ReactiveVar();
const remainder = new ReactiveVar();
const time_left = new ReactiveVar();

const buildErrorCard = (counts, extra) => {
  const error = "You're done for the day!";
  const options = [{
    link: 'settings',
    text: 'Change scheduling settings',
  }];
  if (extra > 0) {
    const total = counts.adds + counts.reviews;
    options.unshift({
      extra: {min_cards: extra + total, ts: counts.ts},
      text: `Add ${extra} cards to today's deck`,
    });
  } else {
    options.push({
      link: 'lists',
      text: 'Enable another word list',
    });
  }
  return {data: {error: error, options: options}, deck: 'errors'};
}

const draw = (deck, ts) => {
  const data = getters[deck](ts).next();
  assert(data, `Drew from empty deck: ${deck}`);
  return {data: data, deck: deck, ts: ts};
}

const getters = {
  adds: (ts) => Vocabulary.getNewItems(),
  extras: (ts) => Vocabulary.getExtraItems(ts),
  failures: (ts) => Vocabulary.getFailuresInRange(ts, ts + kSessionDuration),
  reviews: (ts) => Vocabulary.getItemsDueBy(ts, ts),
};

const mapDecks = (callback) => {
  const result = {};
  for (deck in getters) {
    if (deck === 'extras') continue;
    result[deck] = callback(deck);
  }
  return result;
}

const shuffle = () => {
  const counts = timing.get();
  const left = remainder.get();
  if (!counts || !left) return;

  if (left.adds + left.reviews > 0) {
    const index = Math.random() * (left.adds + left.reviews);
    const deck = index < left.adds ? 'adds' : 'reviews';
    next_card.set(draw(deck, counts.ts));
  } else if (left.failures > 0) {
    next_card.set(draw('failures', counts.ts));
  } else if (left.extras > 0) {
    const card = draw('extras', counts.ts);
    card.deck = card.data.attempts === 0 ? 'adds' : 'reviews';
    next_card.set(card);
  } else {
    const max = maxes.get() ? maxes.get().adds : 0;
    const extra = Math.min(getters.extras(counts.ts).count(), max);
    next_card.set(buildErrorCard(counts, extra));
  }
}

Meteor.autorun(() => {
  const value = mapDecks((k) => Settings.get(`settings.max_${k}`));
  value.failures = Settings.get('settings.revisit_failures') ? Infinity : 0;
  maxes.set(value);
});

Meteor.autorun(() => {
  const counts = timing.get();
  if (!counts || !maxes.get()) return;
  const value = mapDecks((k) => {
    const limit = maxes.get()[k] - counts[k];
    if (limit <= 0) return 0;
    return Math.min(getters[k](counts.ts).count(), limit);
  });
  // Only count the number of available extra cards if they are needed.
  const planned = counts.adds + counts.reviews + value.adds + value.reviews;
  if (planned < counts.min_cards) {
    const needed = counts.min_cards - planned;
    value.extras = Math.min(getters.extras(counts.ts).count(), needed);
  } else {
    value.extras = 0;
  }
  remainder.set(value);
});

Meteor.autorun(shuffle);

// Timing state tier 3: code executed when a user completes a given flashcard.

const addExtraCards = (extra) => {
  const update = (x) => { x.min_cards = extra.min_cards; return x; };
  timing.update(extra.ts, update);
}

const completeCard = (card, result) => {
  const update = (x) => { x[card.deck] += 1; return x; };
  if (!timing.update(card.ts, update)) {
    console.error('Failed to update card:', card, 'with result:', result);
    return;
  }
  if (card.deck === 'failures') {
    Vocabulary.clearFailed(card.data);
  } else {
    Vocabulary.updateItem(card.data, result);
  }
}

// Timing interface: reactive getters for next_card and remainder.

class Timing {
  static addExtraCards(extra) { addExtraCards(extra); }
  static completeCard(card, result) { completeCard(card, result); }
  static getNextCard() { return next_card.get(); }
  static getRemainder() { return remainder.get(); }
  static getTimeLeft() { return time_left.get(); }
  static shuffle() { shuffle(); }
}

export {Timing}
