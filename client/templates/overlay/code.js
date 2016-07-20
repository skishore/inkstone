let overlay = null;

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
  const label = $('<div>').addClass('label');
  container.append(label);
  $('body').append(container);
  return {container: container, focus: focus, guards: guards, label: label};
}

const computeLabelStyle = (target) => {
  if (2 * target.top + target.height < window.innerHeight) {
    return {top: 'auto', bottom: 0};
  }
  return {top: 0, bottom: 'auto'};
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
  }
  static show(element, label) {
    // Animate the fade-in of the overlay.
    overlay = overlay || buildOverlay();
    Meteor.defer(() => overlay.focus.css({opacity: 1}));
    // Bring up guards to prevent clicks on non-highlighted areas.
    const target = computeTarget(element);
    repositionElement(overlay.focus, target);
    repositionGuards(overlay.guards, target);
    // Show a label explaining the highlighted element.
    overlay.label.css(computeLabelStyle(target));
    overlay.label.text(label);
  }
}

export {Overlay};
