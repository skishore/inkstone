let overlay = null;
let target = null;

const buildOverlay = () => {
  const container = $('<div>').attr('id', 'overlay');
  const focus = $('<div>').addClass('focus');
  container.append(focus);
  const guards = [];
  for (let i = 0; i < 4; i++) {
    const guard = $('<div>').addClass('guard');
    container.append(guard);
    guards.push(guard);
  }
  $('body').append(container);
  return {container: container, focus: focus, guards: guards};
}

const computeTarget = (element) => {
  const offset = element.offset();
  return {
    left: offset.left,
    top: offset.top,
    width: element.outerWidth(),
    height: element.outerHeight(),
  };
}

const repositionElement = (element, position) => {
  const css = {};
  for (let key in position) {
    css[key] = `${position[key]}px`;
  }
  element.css(css);
}

const repositionGuards = (guards, target) => {
  const positions = [
    {width: target.left},
    {height: target.top},
    {top: target.top + target.height},
    {left: target.left + target.width},
  ];
  positions.forEach((x, i) => repositionElement(guards[i], x));
}

class Overlay {
  static hide() {
    overlay && overlay.container.remove();
    overlay = null;
    target = null;
  }
  static show(element) {
    overlay = overlay || buildOverlay();
    target = computeTarget(element);
    overlay.focus.css({opacity: 1});
    repositionElement(overlay.focus, target);
    repositionGuards(overlay.guards, target);
  }
}

export {Overlay};
