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

import {Lists} from '/client/model/lists';
import {Settings} from '/client/model/settings';
import {setListStatus} from '/client/templates/lists/code';
import {assert} from '/lib/base';

const get = (variable) => {
  const pair = variable.split('.');
  assert(pair.length === 2);
  return (pair[0] === 'lists' ? Lists.isListEnabled : Settings.get)(pair[1]);
}

const set = (variable, value) => {
  const pair = variable.split('.');
  assert(pair.length === 2);
  (pair[0] === 'lists' ? setListStatus : Settings.set)(pair[1], value);
}

Template.ionRange.events({
  'change, input input[type="range"]': function(event) {
    set(this.variable, parseInt(event.currentTarget.value, 10));
  },
});

Template.ionRange.helpers({get: get});

Template.ionSelect.events({
  'change select': function(event) {
    const target = event.currentTarget;
    set(this.variable, target.options[target.selectedIndex].value);
  },
});

Template.ionSelect.helpers({
  get: (variable, value) => {
    return get(variable) === value ? 'true' : undefined;
  },
});

Template.ionToggle.events({
  'change input[type="checkbox"]': function(event) {
    set(this.variable, event.target.checked);
  }
});

Template.ionToggle.helpers({
  get: (variable) => get(variable) ? 'true' : undefined,
});
