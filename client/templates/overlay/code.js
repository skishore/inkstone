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
    return {top: 'auto', bottom: 0, display: 'block'};
  }
  return {top: 0, bottom: 'auto', display: 'block'};
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
  static blockInput() {
    overlay = overlay || buildOverlay();
    overlay.container.addClass('block');
  }
  static hide() {
    overlay && overlay.container.remove();
    overlay = null;
  }
  static show(element, label) {
    // Animate the fade-in of the overlay.
    overlay = overlay || buildOverlay();
    overlay.container.removeClass('block');
    Meteor.defer(() => overlay && overlay.focus.css({opacity: 1}));
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
