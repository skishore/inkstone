/*
 *  Copyright 2016 Shaunak Kishore (kshaunak "at" gmail.com)
 *
 *  This file is part of the Inkstone Handwriting Library. Please contact
 *  the author (email above) for information on licensing this library.
 */

const kIdPrefix = 'inkstone-stroke-order-animation';
const kWidth = 128;

const addGlobalStyleForAnimations = (animations) => {
  const rules = [];
  for (const animation of animations) {
    rules.push(`
      @keyframes ${animation.keyframes} {
        from {
          stroke: #0098f8;
          stroke-dashoffset: ${animation.offset};
          stroke-width: ${animation.width};
        }
        ${animation.fraction} {
          animation-timing-function: step-end;
          stroke: #0098f8;
          stroke-dashoffset: 0;
          stroke-width: ${animation.width};
        }
        to {
          stroke: black;
          stroke-width: 1024;
        }
      }
      #${animation.animation_id} {
        animation: ${animation.keyframes} ${animation.duration} both;
        animation-delay: ${animation.delay};
        animation-timing-function: linear;
      }
    `);
  }
  const style = document.createElement('style');
  style.innerHTML = rules.join('');
  style.type = 'text/css';
  document.getElementsByTagName('head')[0].appendChild(style);
}

const counter = (() => { let x = 0; return () => x++; })();

const createSVGNode = (type, attributes) => {
  const node = document.createElementNS('http://www.w3.org/2000/svg', type);
  for (const attribute in attributes) {
    if (!attributes.hasOwnProperty(attribute)) continue;
    node.setAttribute(attribute, attributes[attribute]);
  }
  return node;
}

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
  const prefix = options.prefix || kIdPrefix;
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
      animation_id: `${prefix}-animation-${i}`,
      clip_id: `${prefix}-clip-${i}`,
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

// Builds a stroke-order animation and inserts it over the given DOM element.
// This code is a line-by-line translation of the Meteor animation template in
// in the base Inkstone code, but here, we are working without frameworks.
const animate = (character, element) => {
  const prefix = `${kIdPrefix}-${counter()}`;
  const data = getAnimationData(
      character.strokes, character.medians, {prefix: prefix});
  addGlobalStyleForAnimations(data.animations);
  const svg = createSVGNode('svg', {
    height: element.clientWidth,
    version: '1.1',
    viewBox: '0 0 1024 1024',
    width: element.clientWidth,
  });
  const g = createSVGNode('g', {transform: 'scale(1, -1) translate(0, -900)'});
  for (const stroke of data.strokes) {
    g.appendChild(createSVGNode('path', {d: stroke, fill: 'lightgray'}));
  }
  for (const animation of data.animations) {
    const clipPath = createSVGNode('clipPath', {id: animation.clip_id});
    clipPath.appendChild(createSVGNode('path', {d: animation.stroke}));
    g.appendChild(clipPath);
    const path = createSVGNode('path', {
      'clip-path': `url(#${animation.clip_id})`,
      d: animation.d,
      fill: 'none',
      id: animation.animation_id,
      'stroke-dasharray': `${animation.length} ${animation.spacing}`,
      'stroke-linecap': 'round',
    });
    g.appendChild(path);
  }
  svg.appendChild(g);
  element.appendChild(svg);
}

this.inkstone = this.inkstone || {};
this.inkstone.animate = animate;
