/*
 *  Copyright 2016 Shaunak Kishore (kshaunak "at" gmail.com),
 *                 Alex Zhai (alexlinzhai "at" gmail.com)
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

import {Popup} from '/client/templates/popup/code';

const character = new ReactiveVar();
const issue = {character_data: null, recording: null};

class ReportIssue {
  static cancel() {
    _.keys(issue).map((x) => delete issue[x]);
    Popup.hide(50);
  }
  static okay() {
    issue.message = $('#report-issue > textarea.message').val();
    Meteor.call('reportIssue', issue);
    _.keys(issue).map((x) => delete issue[x]);
    const button = {class: 'bold', label: 'Continue'};
    const text = 'Thank you! Your feedback helps us improve Inkstone.';
    Meteor.defer(() => Popup.show(
      {buttons: [button], text: text, title: 'Issue Reported'}));
  }
  static show(character_data, recording) {
    character.set(character_data.character);
    issue.character_data = character_data;
    issue.recording = recording;
    const buttons = [];
    buttons.push({callback: ReportIssue.cancel, label: 'Cancel'});
    buttons.push({callback: ReportIssue.okay, class: 'bold', label: 'Okay'});
    Popup.show({
      buttons: buttons,
      template: 'report_issue',
      title: 'Report an Issue',
    });
  }
};

Template.report_issue.events({
  // Mobile keyboards can mess up the scroll position, so we fix it here.
  // TODO(zhaizhai): Maybe try to animate the scroll.
  'blur .message': () => $(window).scrollTop(0),
});

Template.report_issue.helpers({
  character: () => character.get(),
});

export {ReportIssue};
