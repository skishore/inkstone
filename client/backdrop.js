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

let holds = 0;
let views = [];

const render = (template) => {
  const view = Blaze.renderWithData(template, {}, $('.ionic-body').get(0));
  const element = $(view.firstNode());
  element.addClass('active visible');
  return view;
}

class Backdrop {
  static hide(timeout) {
    holds -= 1;
    if (holds === 0) {
      Meteor.setTimeout(() => {
        views.map(Blaze.remove);
        views.length = 0;
      }, timeout);
    }
  }
  static show() {
    holds += 1;
    if (holds === 1) {
      views.push(render(Template.ionBackdrop));
      views.push(render(Template.ionLoading));
    }
  }
}

export {Backdrop};
