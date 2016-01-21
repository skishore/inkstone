"use strict";

const util = {
  distance2: (point1, point2) => util.norm2(util.subtract(point1, point2)),
  norm2: (point) => point[0]*point[0] + point[1]*point[1],
  round: (point) => point.map(Math.round),
  subtract: (point1, point2) => [point1[0] - point2[0], point1[1] - point2[1]],
};

const coerce = (x, y) => x == null ? y : x;

const filterMedian = (median, n) => {
  const result = [];
  let total = 0;
  for (let i = 0; i < median.length - 1; i++) {
    total += Math.sqrt(util.distance2(median[i], median[i + 1]));
  }
  let index = 0;
  let position = median[0];
  let total_so_far = 0;
  for (let i = 0; i < n - 1; i++) {
    const target = i*total/(n - 1);
    while (total_so_far < target) {
      const step = Math.sqrt(util.distance2(position, median[index + 1]));
      if (total_so_far + step < target) {
        index += 1;
        position = median[index];
        total_so_far += step;
      } else {
        const t = (target - total_so_far)/step;
        position = [(1 - t)*position[0] + t*median[index + 1][0],
                    (1 - t)*position[1] + t*median[index + 1][1]];
        total_so_far = target;
      }
    }
    result.push(util.round(position));
  }
  result.push(median[median.length - 1]);
  return result;
}

const getAffineTransform = (source, target) => {
  const sdiff = util.subtract(source[1], source[0]);
  const tdiff = util.subtract(target[1], target[0]);
  const ratio = [tdiff[0]/sdiff[0], tdiff[1]/sdiff[1]];
  return (point) => [
    Math.round(ratio[0]*(point[0] - source[0][0]) + target[0][0]),
    Math.round(ratio[1]*(point[1] - source[0][1]) + target[0][1]),
  ];
}

const getBounds = (medians) => {
  const min = [Infinity, Infinity];
  const max = [-Infinity, -Infinity];
  medians.map((median) => median.map((point) => {
    min[0] = Math.min(min[0], point[0]);
    min[1] = Math.min(min[1], point[1]);
    max[0] = Math.max(max[0], point[0]);
    max[1] = Math.max(max[1], point[1]);
  }));
  return [min, max];
}

const normalizeBounds = (bounds, max_ratio, min_width) => {
  bounds = bounds.map(util.round);
  let diff = util.subtract(bounds[1], bounds[0]);
  if (diff[0] < 0 || diff[1] < 0) throw diff;
  if (diff[0] < min_width) {
    const extra = Math.ceil((min_width - diff[0])/2);
    bounds[0][0] -= extra;
    bounds[1][0] += extra;
  }
  if (diff[1] < min_width) {
    const extra = Math.ceil((min_width - diff[1])/2);
    bounds[0][1] -= extra;
    bounds[1][1] += extra;
  }
  if (max_ratio > 0) {
    diff = util.subtract(bounds[1], bounds[0]);
    if (diff[0] < diff[1]/max_ratio) {
      const extra = Math.ceil((diff[1]/max_ratio - diff[0])/2);
      bounds[0][0] -= extra;
      bounds[1][0] += extra;
    } else if (diff[1] < diff[0]/max_ratio) {
      const extra = Math.ceil((diff[0]/max_ratio - diff[1])/2);
      bounds[0][1] -= extra;
      bounds[1][1] += extra;
    }
  }
  return bounds;
}

const prepareToScore = (medians, params) => {
  if (medians.length === 0 || medians.some((median) => median.length === 0)) {
    throw new Error(`Invalid medians list: ${JSON.stringify(medians)}`);
  }
  medians = medians.map((median) => filterMedian(median, params.points));
  const bounds = normalizeBounds(
      getBounds(medians, params.max_ratio, params.min_width));
  return {medians: medians, bounds: bounds};
}

const scoreMatch = (source, target, params) => {
  params = params || {};
  params.points = coerce(params.points, 4);
  params.max_ratio = coerce(params.max_ratio, 2);
  params.min_width = coerce(params.max_width, 8);
  params.side_length = coerce(params.side_length, 256);
  params.unmatched_penalty = coerce(params.unmatched_penalty, 0.5);

  source = prepareToScore(source, params);
  target = prepareToScore(target, params);
  const transform = getAffineTransform(source.bounds, target.bounds);
  const min = Math.min(source.medians.length, target.medians.length);
  const max = Math.max(source.medians.length, target.medians.length);
  let score = 0;
  for (let i = 0; i < min; i++) {
    const median1 = source.medians[i];
    const median2 = target.medians[i];
    for (let j = 0; j < params.points; j++) {
      score -= util.distance2(transform(median1[j]), median2[j]);
    }
  }
  score /= (params.side_length*params.side_length);
  score -= (max - min)*params.points*params.unmatched_penalty;
  return score;
}

window.Matcher = class Matcher {
  constructor(medians) {
    this._medians = medians;
  }
  match(medians, params) {
    let best = 0;
    let best_score = -Infinity;
    for (let entry of this._medians) {
      const score = scoreMatch(medians, entry[1], params);
      if (score > best_score) {
        best_score = score;
        best = entry[0];
      }
    }
    return best;
  }
}

window.matcher = {
  filterMedian: filterMedian,
  getAffineTransform: getAffineTransform,
  getBounds: getBounds,
  normalizeBounds: normalizeBounds,
  prepareToScore: prepareToScore,
  scoreMatch: scoreMatch,
};
