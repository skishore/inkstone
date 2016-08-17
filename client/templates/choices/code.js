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
import {setListStatus, toListTemplate} from '/client/templates/lists/code';
import {Popup} from '/client/templates/popup/code';
import {assert} from '/lib/base';

const deleteList = (list) => {
  // TODO(skishore): Consider deleting the list from the asset store here.
  setListStatus(list, /*on=*/false);
  if (!Lists.isListEnabled(list)) Lists.deleteList(list);
  Popup.hide(50);
}

const showDeletionDialog = (list, label) => {
  const data = Lists.getAllLists()[list];
  if (!data) return;
  const buttons = [
    {callback: () => deleteList(list), label: 'Yes'},
    {class: 'bold', label: 'No'},
  ];
  const text = `Do you really want to delete ${data.name}?`;
  Popup.show({title: 'Delete List', text: text, buttons: buttons});
}

// Meteor template and event bindings follow.

['choose_lists_to_delete', 'choose_lists_to_import'].map(
    (x) => Router.route(x, {template: x}));

Template.choose_lists_to_delete.events({
  'click .list-management-option': (event) => {
    const variable = $(event.currentTarget).children().data('variable');
    const pair = variable.split('.');
    assert(pair.length === 2 && pair[0] === 'lists');
    showDeletionDialog(pair[1]);
  },
});

Template.choose_lists_to_delete.helpers({
  groups: () => toListTemplate(Lists.getImportedLists()),
});

Template.choose_lists_to_import.helpers({
  groups: () => toListTemplate(Lists.getAllLists()),
});
