// Adapted from Skritter HTML5's IntervalQuantifier class, without the
// class boilerplate dropped and the schema of their "item" object changed to
// our `Vocabulary` schema (see model/vocabulary.js). Original copyright:
//
//  Copyright (c) 2015 Inkren Inc
//
// See the LICENSE file in this directory for more information.

const kOneDay = 24 * 60 * 60;
const kInitialIntervals = [28 * kOneDay, 7 * kOneDay, kOneDay, 600];
const kIntervalFactors = [3.5, 2.2, 0.9, 0.25];
const kRandomFactor = 0.15;

const getNextInterval = (item, result, last) => {
  if (!item.last) {
    return randomizeInterval(kInitialIntervals[result]);
  }
  const actual = last - item.last;
  const intended = item.next - item.last;
  const success = result < 3;
  let factor = kIntervalFactors[result];
  // Adjust the factor based on readiness.
  if (factor > 1) {
    factor = ((factor - 1) * actual / intended) + 1;
  }
  // Compute the number of successes and attempts with the new result.
  const attempts = item.attempts + 1;
  const successes = item.successes + (success ? 1 : 0);
  const correct = successes / attempts;
  // Accelerate new items that appear to be known.
  if (attempts < 5 && correct === 1) {
    factor *= 1.5;
  }
  // Decelerate hard items that are consistently marked wrong.
  if (attempts > 8 && correct < 0.5) {
    factor *= Math.pow(correct, 0.7);
  }
  // Multiply by the factor, randomize the interval, and apply bounds.
  const interval = randomizeInterval(factor * intended);
  const max = (success ? 365 : 7) * kOneDay;
  return Math.max(Math.min(interval, max), 600);
}

const randomizeInterval = (interval) => {
  return Math.floor((1 + kRandomFactor * (Math.random() - 0.5)) * interval);
}

export {getNextInterval};
