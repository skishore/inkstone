import {Settings} from '/client/model/settings';

Template.settings.helpers({
  max_adds: () => Settings.get('settings.max_adds'),
  max_reviews: () => Settings.get('settings.max_reviews'),
});
