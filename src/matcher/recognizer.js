/*
 *  Copyright 2016 Shaunak Kishore (kshaunak "at" gmail.com)
 *
 *  This file is part of the Inkstone Handwriting Library. Please contact
 *  the author (email above) for information on licensing this library.
 */

(function(){

const kAngleThreshold = Math.PI / 5;
const kDistanceThreshold = 0.3;
const kLengthThreshold = 1.5;
const kMaxMissedSegments = 1;
const kMaxOutOfOrder = 2;
const kMinDistance = 1 / 16;
const kMissedSegmentPenalty = 1;
const kOutOfOrderPenalty = 2;
const kReversePenalty = 2;

const kHookShapes = [[[1, 3], [-3, -1]], [[3, 3], [0, -1]]];

const util = {
  distance2: (point1, point2) => util.norm2(util.subtract(point1, point2)),
  clone: (point) => [point[0], point[1]],
  norm2: (point) => point[0]*point[0] + point[1]*point[1],
  round: (point) => point.map(Math.round),
  subtract: (point1, point2) => [point1[0] - point2[0], point1[1] - point2[1]],
};

const angleDiff = (angle1, angle2) => {
  const diff = Math.abs(angle1 - angle2);
  return Math.min(diff, 2 * Math.PI - diff);
}

const getAngle = (median) => {
  const diff = util.subtract(median[median.length - 1], median[0]);
  return Math.atan2(diff[1], diff[0]);
}

const getBounds = (median) => {
  const min = [Infinity, Infinity];
  const max = [-Infinity, -Infinity];
  median.map((point) => {
    min[0] = Math.min(min[0], point[0]);
    min[1] = Math.min(min[1], point[1]);
    max[0] = Math.max(max[0], point[0]);
    max[1] = Math.max(max[1], point[1]);
  });
  return [min, max];
}

const getMidpoint = (median) => {
  const bounds = getBounds(median);
  return [(bounds[0][0] + bounds[1][0]) / 2,
          (bounds[0][1] + bounds[1][1]) / 2];
}

const getMinimumLength = (pair) =>
    Math.sqrt(util.distance2(pair[0], pair[1])) + kMinDistance;

const hasHook = (median) => {
  if (median.length < 3) return false;
  if (median.length > 3) return true;
  for (let shape of kHookShapes) {
    if (match(median, shape)) return true;
  }
  return false;
}

const match = (median, shape) => {
  if (median.length !== shape.length + 1) return false;
  for (let i = 0; i < shape.length; i++) {
    const angle = angleDiff(getAngle(median.slice(i, i + 2)),
                            getAngle([[0, 0], shape[i]]));
    if (angle >= kAngleThreshold) return false;
  }
  return true;
}

const performAlignment = (source, target) => {
  source = source.map(util.clone);
  target = target.map(util.clone);
  const memo = [_.range(source.length).map((j) => j > 0 ? -Infinity : 0)];
  for (let i = 1; i < target.length; i++) {
    const row = [-Infinity];
    for (let j = 1; j < source.length; j++) {
      let best_value = -Infinity;
      const start = Math.max(j - kMaxMissedSegments - 1, 0);
      for (let k = start; k < j; k++) {
        if (memo[i - 1][k] === -Infinity) continue;
        const score = scorePairing(
            [source[k], source[j]], [target[i - 1], target[i]], i === 1);
        const penalty = (j - k - 1) * kMissedSegmentPenalty;
        best_value = Math.max(best_value, score + memo[i - 1][k] - penalty);
      }
      row.push(best_value);
    }
    memo.push(row);
  }
  const result = {score: -Infinity, source: null, target: null, warning: null};
  const min_matched = target.length - (hasHook(target) ? 1 : 0);
  for (let i = min_matched - 1; i < target.length; i++) {
    const penalty = (target.length - i - 1) * kMissedSegmentPenalty;
    const score = memo[i][source.length - 1] - penalty;
    if (score > result.score) {
      result.penalties = 0;
      result.score = score;
      result.source = [source[0], source[source.length - 1]];
      result.target = [target[0], target[i]];
      result.warning = i < target.length - 1 ? 'should_hook' : null;
    }
  }
  return result;
}

const recognize = (source, target, offset) => {
  if (offset > kMaxOutOfOrder) return {score: -Infinity};
  let result = performAlignment(source, target);
  if (result.score === -Infinity) {
    let alternative = performAlignment(source.slice().reverse(), target);
    if (!alternative.warning) {
      result = alternative;
      result.penalties += 1;
      result.score -= kReversePenalty;
      result.warning = 'stroke_backward';
    }
  }
  result.score -= Math.abs(offset) * kOutOfOrderPenalty;
  return result;
}

const scorePairing = (source, target, is_initial_segment) => {
  const angle = angleDiff(getAngle(source), getAngle(target));
  const distance = Math.sqrt(util.distance2(
      getMidpoint(source), getMidpoint(target)));
  const length = Math.abs(Math.log(
      getMinimumLength(source) / getMinimumLength(target)));
  if (angle > (is_initial_segment ? 1 : 2) * kAngleThreshold ||
      distance > kDistanceThreshold || length > kLengthThreshold) {
    return -Infinity;
  }
  return -(angle + distance + length);
}

this.inkstone = this.inkstone || {};
this.inkstone.matcher = this.inkstone.matcher || {};
this.inkstone.matcher.match = match;
this.inkstone.matcher.recognize = recognize;

})();
