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

const kDefaultOnClick = () => Popup.hide(50);

let on_backdrop_click = null;
let on_button_clicks = [];
let views = [];

class Popup {
  static hide(timeout) {
    const popup = $('.popup-container');
    popup.addClass('popup-hidden').removeClass('active');
    on_button_clicks.length = 0;
    Meteor.setTimeout(() => {
      $('body').removeClass('popup-open');
      views.map(Blaze.remove);
      views.length = 0;
    }, timeout);
  }
  static show(options) {
    const buttons = (options.buttons || []).map((button, i) => ({
      callback: button.callback || kDefaultOnClick,
      class: button.class,
      index: i,
      label: button.label,
    }));
    const data = {
      buttons: buttons,
      template: options.template,
      text: options.text,
      title: options.title,
    };
    on_backdrop_click = options.on_backdrop_click || kDefaultOnClick;

    on_button_clicks.length = 0;
    views.map(Blaze.remove);
    views.length = 0;

    const element = $('body')[0];
    const view = Blaze.renderWithData(Template.popup, data, element);
    const backdrop = $(view.firstNode());
    backdrop.addClass('active visible');
    const popup = backdrop.find('.popup-container');
    popup.addClass('active popup-showing');

    $('body').addClass('popup-open');
    buttons.forEach((x, i) => on_button_clicks.push(x.callback));
    views.push(view);
  }
}

Template.popup.events({
  'click .popup': (event) => event.stopPropagation(),
  'click .popup-container': () => on_backdrop_click(),
  'click .popup > .popup-buttons > .button': function(event) {
    on_button_clicks[$(event.currentTarget).attr('data-index')]();
  },
});

export {Popup};
