import {Lists} from '/client/model/lists';
import {Settings} from '/client/model/settings';
import {setListStatus} from '/client/templates/lists/code';
import {assert} from '/lib/base';

const get = (variable) => {
  const pair = variable.split('.');
  assert(pair.length === 2);
  return (pair[0] === 'lists' ? Lists.enabled : Settings.get)(pair[1]);
}

const set = (variable, value) => {
  const pair = variable.split('.');
  assert(pair.length === 2);
  (pair[0] === 'lists' ? setListStatus : Settings.set)(pair[1], value);
}

Template.ionRange.events({
  'change, input input[type="range"]': function(event) {
    set(this.variable, parseInt(event.target.value, 10));
  },
});

Template.ionRange.helpers({get: get});

Template.ionSelect.events({
  'change select': function(event) {
    const target = event.target;
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
