/*
 *  Copyright 2016 Shaunak Kishore (kshaunak "at" gmail.com)
 *
 *  This file is part of the Inkstone Handwriting Library. Please contact
 *  the author (email above) for information on licensing this library.
 */

(function(){

const kCanvasSize = 512;

const kCornerSize = 1 / 8;
const kCrossWidth = 1 / 256;
const kMinDistance = 1 / 32;
const kStrokeWidth = 1 / 32;

const kDoubleTapSpeed = 500;

let ticker = null;

// Helper methods used by the handwriting class.

const angle = (xs) => Math.atan2(xs[1][1] - xs[0][1], xs[1][0] - xs[0][0]);

const animate = (shape, size, rotate, source, target) => {
  shape.regX = size * (target[0][0] + target[1][0]) / 2;
  shape.regY = size * (target[0][1] + target[1][1]) / 2;
  shape.x = size * (source[0][0] + source[1][0]) / 2;
  shape.y = size * (source[0][1] + source[1][1]) / 2;
  const scale = distance(source) / (distance(target) + kMinDistance);
  shape.scaleX = scale;
  shape.scaleY = scale;
  if (rotate) {
    const rotation = (180 / Math.PI) * (angle(source) - angle(target));
    shape.rotation = ((Math.round(rotation) + 540) % 360) - 180;
  }
  return {rotation: 0, scaleX: 1, scaleY: 1, x: shape.regX, y: shape.regY};
}

const convertShapeStyles = (shape, end) => {
  if (!shape.graphics || !shape.graphics.instructions) {
    return;
  }
  let updated = false;
  for (let instruction of shape.graphics.instructions) {
    if (instruction.style) {
      instruction.style = end;
      updated = true;
    }
  }
  if (updated) shape.updateCache();
}

const createCanvas = (element, handwriting) => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = kCanvasSize;
  canvas.style.width = canvas.style.height = `${element.clientWidth}px`;
  element.appendChild(canvas);

  const touch_supported = 'ontouchstart' in window;
  const zoom = kCanvasSize / element.clientWidth;

  const getPosition = (event) => {
    if (touch_supported) event = event.touches[0];
    if (!event) return;
    const bound = canvas.getBoundingClientRect();
    const point = [event.clientX - bound.left, event.clientY - bound.top];
    return point.map((x) => Math.round(zoom * x));
  }

  let mousedown = false;

  const start_event = touch_supported ? 'touchstart' : 'mousedown';
  canvas.addEventListener(start_event, (event) => {
    mousedown = true;
    if (event.cancelable) event.preventDefault();
    handwriting._pushPoint(getPosition(event));
  });

  const move_event = touch_supported ? 'touchmove' : 'mousemove';
  canvas.addEventListener(move_event, (event) => {
    if (!mousedown) return;
    handwriting._pushPoint(getPosition(event));
  }, {passive: true});

  const end_event = touch_supported ? 'touchend' : 'mouseup';
  canvas.addEventListener(end_event, (event) => {
    mousedown = false;
    handwriting._endStroke();
  });

  return canvas;
}

const distance = (xs) => {
  const diff = [xs[1][0] - xs[0][0], xs[1][1] - xs[0][1]];
  return Math.sqrt(diff[0] * diff[0] + diff[1] * diff[1]);
}

const dottedLine = (width, x1, y1, x2, y2) => {
  const result = new createjs.Shape();
  result.graphics.setStrokeDash([width, width], 0);
  result.graphics.setStrokeStyle(width)
  result.graphics.beginStroke('#ccc');
  result.graphics.moveTo(x1, y1);
  result.graphics.lineTo(x2, y2);
  return result;
}

const midpoint = (point1, point2) => {
  return [(point1[0] + point2[0]) / 2, (point1[1] + point2[1]) / 2];
}

const pathToShape = (path, size, color, uncached) => {
  const scale = 1024 / size;
  const result = new createjs.Shape();
  const tokens = path.split(' ');
  let index = 0;
  const next = () => {
    index += 2;
    let result = [tokens[index - 2], tokens[index - 1]];
    result = result.map((x) => parseInt(x, 10));
    result[1] = 900 - result[1];
    return result.map((x) => Math.round(x / scale));
  }
  const arity = {L: 1, M: 1, Q: 2, Z: 0};
  while (index < tokens.length) {
    index += 1;
    const command = tokens[index - 1];
    const args = _.range(arity[command] || 0).map(next);
    if (command === 'Z') {
      result.graphics.closePath();
    } else if (command === 'M') {
      result.graphics.beginFill(color);
      result.graphics.beginStroke(color);
      result.graphics.moveTo(args[0][0], args[0][1]);
    } else if (command === 'L') {
      result.graphics.lineTo(args[0][0], args[0][1]);
    } else if (command === 'Q') {
      result.graphics.curveTo(args[0][0], args[0][1], args[1][0], args[1][1]);
    } else {
      console.error(`Invalid command: ${command}`);
    }
  }
  if (!uncached) result.cache(0, 0, size, size);
  return result;
}

const renderCross = (size, container) => {
  const stroke = size * kCrossWidth;
  container.addChild(dottedLine(stroke, 0, 0, size, size));
  container.addChild(dottedLine(stroke, size, 0, 0, size));
  container.addChild(dottedLine(stroke, size / 2, 0, size / 2, size));
  container.addChild(dottedLine(stroke, 0, size/ 2, size, size / 2));
  container.cache(0, 0, size, size);
}

// A basic brush class that draws a fixed-width stroke.

class BasicBrush {
  constructor(container, point, options) {
    options = options || {};
    this._color = options.color || 'black';
    this._width = options.width || 1;

    this._shape = new createjs.Shape();
    this._endpoint = point;
    this._midpoint = null;
    container.addChild(this._shape);
  }
  advance(point) {
    const last_endpoint = this._endpoint;
    const last_midpoint = this._midpoint;
    this._endpoint = point;
    this._midpoint = midpoint(last_endpoint, this._endpoint);
    if (last_midpoint) {
      this._draw(last_midpoint, this._midpoint, last_endpoint);
    } else {
      this._draw(last_endpoint, this._midpoint);
    }
  }
  _draw(point1, point2, control) {
    const graphics = this._shape.graphics;
    graphics.setStrokeStyle(this._width, 'round');
    graphics.beginStroke(this._color);
    graphics.moveTo(point1[0], point1[1]);
    if (control) {
      graphics.curveTo(control[0], control[1], point2[0], point2[1]);
    } else {
      graphics.lineTo(point2[0], point2[1]);
    }
  }
}

// Methods for actually executing drawing commands.

const Layer = {
  CROSS: 0,
  CORNER: 1,
  FADE: 2,
  WATERMARK: 3,
  HIGHLIGHT: 4,
  COMPLETE: 5,
  HINT: 6,
  STROKE: 7,
  WARNING: 8,
  ALL: 9,
};

class Handwriting {
  constructor(element, handlers, options) {
    this._onclick = handlers.onclick;
    this._ondouble = handlers.ondouble;
    this._onstroke = handlers.onstroke;
    this.options = options;

    const canvas = createCanvas(element, this);
    this._stage = new createjs.Stage(canvas);
    this._size = this._stage.canvas.width;

    this._layers = [];
    for (let i = 0; i < Layer.ALL; i++) {
      const layer = new createjs.Container();
      this._layers.push(layer);
      this._stage.addChild(layer);
    }
    renderCross(this._size, this._layers[Layer.CROSS]);

    createjs.Ticker.timingMode = createjs.Ticker.RAF;
    createjs.Ticker.removeEventListener('tick', ticker);
    ticker = createjs.Ticker.addEventListener('tick', this._tick.bind(this));

    this.clear();
  }
  clear() {
    createjs.Tween.removeAllTweens();
    for (let layer of this._layers) {
      layer.removeAllChildren();
    }
    this._corner_characters = 0;
    this._drawable = true;
    this._pending_animations = 0;
    this._running_animations = 0;
    this._reset();
  }
  emplace(path, rotate, source, target) {
    const child = pathToShape(path, this._size, this.options.stroke_color);
    const endpoint = animate(child, this._size, rotate, source, target);
    this._layers[Layer.STROKE].children.pop();
    this._layers[Layer.COMPLETE].addChild(child);
    this._animate(child, endpoint, 150);
  }
  fadeCharacter() {
    const children = this._layers[Layer.COMPLETE].children;
    while (children.length > 0) {
      this._layers[Layer.WATERMARK].addChild(children.shift());
    }
    this._fadeWatermark(150);
    this._drawable = true;
  }
  fadeStroke() {
    const stroke = this._layers[Layer.STROKE];
    const child = stroke.children[stroke.children.length - 1];
    this._animate(child, {alpha: 0}, 150,
                  () => child.parent.removeChild(child));
  }
  flash(path) {
    const child = pathToShape(path, this._size, this.options.hint_color);
    this._layers[Layer.HINT].addChild(child);
    this._animate(child, {alpha: 0}, 750,
                  () => child.parent.removeChild(child));
  }
  glow(result) {
    const color = this.options.result_colors[result];
    for (let child of this._layers[Layer.COMPLETE].children) {
      convertShapeStyles(child, color);
    }
    this._drawable = false;
  }
  // Moves the current character to the corner of the canvas. Returns a
  // Promise that resolves when the animation is complete.
  moveToCorner() {
    const children = this._layers[Layer.COMPLETE].children.slice();
    const container = new createjs.Container();
    children.forEach((child) => container.addChild(child));
    [Layer.WATERMARK, Layer.COMPLETE].forEach(
        (layer) => this._layers[layer].removeAllChildren());
    const endpoint = {scaleX: kCornerSize, scaleY: kCornerSize};
    endpoint.x = kCornerSize * this._size * this._corner_characters;
    this._layers[Layer.CORNER].addChild(container);
    this._corner_characters += 1;
    this._drawable = true;
    return new Promise((resolve, reject) => {
      this._animate(container, endpoint, 150, resolve);
    });
  }
  reveal(paths) {
    const layer = this._layers[Layer.WATERMARK];
    if (layer.children.length > 0) return;
    const container = new createjs.Container();
    for (let path of paths) {
      const child = pathToShape(
          path, this._size, this.options.watermark_color, /*uncached=*/true);
      container.addChild(child);
    }
    container.cache(0, 0, this._size, this._size);
    layer.addChild(container);
  }
  undo() {
    this._layers[Layer.STROKE].children.pop();
    this._reset();
  }
  warn(warning) {
    if (!warning) return;
    const font = `${this.options.font_size} Georgia`;
    const child = new createjs.Text(warning, font, this.options.font_color);
    const bounds = child.getBounds();
    child.x = (kCanvasSize - bounds.width) / 2;
    child.y = kCanvasSize - 2 * bounds.height;
    child.cache(0, 0, this._size, this._size);
    this._layers[Layer.WARNING].removeAllChildren();
    this._layers[Layer.WARNING].addChild(child);
    this._animate(child, {alpha: 0}, 1500,
                  () => child.parent && child.parent.removeChild(child));
  }
  _animate(shape, target, duration, callback) {
    this._running_animations += 1;
    createjs.Tween.get(shape).to(target, duration).call(() => {
      this._pending_animations += 1;
      callback && callback();
    });
  }
  _click() {
    const timestamp = new Date().getTime();
    const cutoff = (this._last_click_timestamp || 0) + kDoubleTapSpeed;
    const handler = timestamp < cutoff ? this._ondouble : this._onclick;
    this._last_click_timestamp = timestamp;
    handler && handler();
  }
  _drawStroke() {
    if (this._stroke.length < 2) {
      return;
    }
    this._fadeWatermark(1500);
    const n = this._stroke.length;
    if (!this._brush) {
      const layer = this._layers[Layer.STROKE];
      const options = {
        color: this.options.drawing_color,
        width: this._size * kStrokeWidth,
      };
      this._brush = new BasicBrush(layer, this._stroke[n - 2], options);
    }
    this._brush.advance(this._stroke[n - 1]);
    this._stage.update();
  }
  _endStroke() {
    let handler = () => this._click();
    if (this._stroke.length >= 2) {
      const layer = this._layers[Layer.STROKE];
      const stroke = this._stroke.map((x) => x.map((y) => y / this._size));
      const n = stroke.length;
      if (_.any(stroke, (x) => distance([stroke[n - 1], x]) > kMinDistance)) {
        layer.children.forEach((x) => x.cache(0, 0, this._size, this._size));
        handler = () => this._onstroke && this._onstroke(stroke);
      } else {
        layer.removeAllChildren();
      }
    }
    handler();
    this._reset();
  }
  _fadeWatermark(delay) {
    const children = this._layers[Layer.WATERMARK].children;
    while (children.length > 0) {
      const child = children.pop();
      this._layers[Layer.FADE].addChild(child);
      this._animate(child, {alpha: 0}, delay,
                    () => child.parent && child.parent.removeChild(child));
    }
  }
  _pushPoint(point) {
    if (point[0] != null && point[1] != null) {
      this._stroke.push(point);
      if (this._drawable) this._drawStroke();
    }
  }
  _reset() {
    this._brush = null;
    this._stroke = [];
    this._stage.update();
  }
  _tick(event) {
    if (this._running_animations) {
      this._stage.update(event);
      this._running_animations -= this._pending_animations;
      this._pending_animations = 0;
    }
  }
}

this.inkstone = this.inkstone || {};
this.inkstone.Handwriting = Handwriting;

})();
