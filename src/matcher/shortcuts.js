/*
 *  Copyright 2016 Shaunak Kishore (kshaunak "at" gmail.com)
 *
 *  This file is part of the Inkstone Handwriting Library. Please contact
 *  the author (email above) for information on licensing this library.
 */

// This module defines one public method, getShorcuts, which takes a list of
// medians and a list of component maps and returns a list of shortcuts.
//
// Each shortcut is a dictionary containing two keys:
//  - indices: the indices of the strokes that comprise the shortcut
//  - median: the median of the combined strokes

(function(){

const path_radical_callback = (rects) => {
  const output = [rects[0].tl, rects[0].tr];
  output.push([rects[0].l, 0.5 * rects[0].t + 0.5 * rects[0].b]);
  output.push([rects[0].r, 0.5 * rects[0].t + 0.5 * rects[0].b]);
  output.push(rects[0].bl);
  return [
    output,
    output.slice(0, 3).concat(output.slice(4)),
    output.slice(0, 2).concat(output.slice(4)),
  ];
};

const kShortcuts = [
  {
    targets: [
      [['女', 1], ['女', 2]],
    ],
    callback: (rects) => {
      if (rects[0].r < rects[1].r) return [];
      return [[rects[1].bl, [rects[0].r, rects[1].t], rects[0].bl]];
    },
  },
  {
    targets: [
      [['了', 0], ['了', 1]],
      [['孑', 0], ['孑', 1]],
    ],
    callback: (rects) => {
      const output = [rects[0].tl, rects[0].tr, rects[1].tr, rects[1].br];
      output.push([rects[1].l, rects[1].b + rects[1].l - rects[1].r]);
      return [output, output.slice(0, 2).concat(output.slice(3))];
    },
  },
  {
    targets: [
      [['纟', 0], ['纟', 1]],
      [['幺', 0], ['幺', 1]],
    ],
    callback: (rects) => {
      const output = [rects[0].tr, rects[0].bl, rects[1].tr, rects[1].bl];
      output.push([rects[1].r, 0.25 * rects[1].t + 0.75 * rects[1].b]);
      return [output];
    },
  },
  {
    targets: [
      [['廴', 0]],
      [['辶', 1]],
    ],
    callback: path_radical_callback,
  },
  {
    targets: [
      [['廴', 0], ['廴', 1]],
      [['辶', 1], ['辶', 2]],
    ],
    callback: (rects) => {
      const options = path_radical_callback([rects[0]]);
      return options.map((x) => x.concat([rects[1].br]));
    },
  },
];

const componentsMatch = (components, target) => {
  if (components.length < target.length) return false;
  for (let i = 0; i < target.length; i++) {
    if (components[i][target[i][0]] !== target[i][1]) return false;
  }
  return true;
}

const computeBounds = (median) => {
  const xs = median.map((point) => point[0]);
  const ys = median.map((point) => point[1]);
  const result = {l: _.min(xs), r: _.max(xs), t: _.min(ys), b: _.max(ys)};
  result.tl = [result.l, result.t];
  result.tr = [result.r, result.t];
  result.bl = [result.l, result.b];
  result.br = [result.r, result.b];
  return result;
}

const getShortcuts = (components, medians) => {
  if (components.length !== medians.length) {
    console.error('Components:', components);
    console.error('Medians:', medians);
    throw new Error('Mismatched components and medians!');
  }
  const result = [];
  for (let i = 0; i < components.length; i++) {
    for (let shortcut of kShortcuts) {
      const remainder = components.slice(i);
      if (_.any(shortcut.targets, (x) => componentsMatch(remainder, x))) {
        const n = shortcut.targets[0].length;
        const bounds = medians.slice(i, i + n).map(computeBounds);
        const indices = _.range(i, i + n);
        for (let median of shortcut.callback(bounds)) {
          result.push({indices: indices, median: median});
        }
      }
    }
  }
  return result;
}

this.inkstone = this.inkstone || {};
this.inkstone.matcher = this.inkstone.matcher || {};
this.inkstone.matcher.getShortcuts = getShortcuts;

})();
