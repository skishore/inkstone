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

const kIdPrefix = 'make-me-a-hanzi';
const kWidth = 128;

const distance2 = (point1, point2) => {
  const diff = [point1[0] - point2[0], point1[1] - point2[1]];
  return diff[0]*diff[0] + diff[1]*diff[1];
}

const getMedianLength = (median) => {
  let result = 0;
  for (let i = 0; i < median.length - 1; i++) {
    result += Math.sqrt(distance2(median[i], median[i + 1]));
  }
  return result;
}

const getMedianPath = (median) => {
  const result = [];
  for (let point of median) {
    result.push(result.length === 0 ? 'M' : 'L');
    result.push('' + point[0]);
    result.push('' + point[1]);
  }
  return result.join(' ');
}

const getAnimationData = (strokes, medians, options) => {
  options = options || {};
  const initial_delay = 1024 * (options.initial_delay || 0.9);
  const per_stroke_delay = 1024 * (options.per_stroke_delay || 0.3);
  const speed = 1024 * (options.speed || 0.03);

  const lengths = medians.map((x) => getMedianLength(x) + kWidth)
                         .map(Math.round);
  const paths = medians.map(getMedianPath);

  const animations = [];
  let total_duration = initial_delay / speed / 60;
  for (let i = 0; i < strokes.length; i++) {
    const offset = lengths[i] + kWidth;
    const duration = (per_stroke_delay + offset) / speed / 60;
    const fraction = Math.round(100 * offset / (per_stroke_delay + offset));
    animations.push({
      animation_id: `${kIdPrefix}-animation-${i}`,
      clip_id: `${kIdPrefix}-clip-${i}`,
      d: paths[i],
      delay: `${total_duration}s`,
      duration: `${duration}s`,
      fraction: `${fraction}%`,
      keyframes: `keyframes${i}`,
      length: lengths[i],
      offset: offset,
      spacing: 2 * lengths[i],
      stroke: strokes[i],
      width: kWidth,
    });
    total_duration += duration;
  }

  return {animations: animations, strokes: strokes};
}

export {getAnimationData};
