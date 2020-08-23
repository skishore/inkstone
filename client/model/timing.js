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

// Timing is a model class that maintains the user's state for their current
// Inkstone session and supports queries like:
//  - How many flash cards are left in this session?
//  - What is the next flash card?
import {PersistentVar} from '/client/model/persistence';
import {Lists} from '/client/model/lists';
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

const tick = () => {
  const now = Date.timestamp();
  const counts = timing.get() || {ts: -Infinity};
  const wait = counts.ts + kSessionDuration - now;
  if (wait > 0) {
    time_left.set(wait);
  } else {
    timing.set(newCounts(now));
    time_left.set(kSessionDuration);
  }
}

Meteor.startup(() => createjs.Ticker.addEventListener('tick', tick));

// Timing state tier 2: reactive variables built on top of the session counts
// that track what the next card is and how many cards of different classes
// are left in this session.

const maxes = new ReactiveVar();
const next_card = new ReactiveVar();
const remainder = new ReactiveVar();
const time_left = new ReactiveVar();

const buildErrorCard = (counts, extra) => {
  if (_.keys(Lists.getEnabledLists()).length === 0) {
    const data = {
      error: 'You have no lists enabled!',
      options: [{link: 'lists', text: 'Enable a word list.'}],
    };
    return {data: data, deck: 'errors'};
  }
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
  } else if (left.extras > 0) {
    const card = draw('extras', counts.ts);
    card.deck = card.data.attempts === 0 ? 'adds' : 'reviews';
    next_card.set(card);
  } else if (left.failures > 0) {
    next_card.set(draw('failures', counts.ts));
  } else {
    const max = maxes.get() ? maxes.get().adds : 0;
    const extra = Math.min(getters.extras(counts.ts).count(), max);
    next_card.set(buildErrorCard(counts, extra));
  }
}

Tracker.autorun(() => {
  const value = mapDecks((k) => Settings.get(`max_${k}`));
  value.failures = Settings.get('revisit_failures') ? Infinity : 0;
  maxes.set(value);
});

Tracker.autorun(() => {
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

Tracker.autorun(shuffle);

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
    Vocabulary.updateItem(card.data, result, Date.timestamp());
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
