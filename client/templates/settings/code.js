import {Settings} from '/client/model/settings';

Template.settings.helpers({
  max_adds: () => Settings.get('max_adds'),
  max_reviews: () => Settings.get('max_reviews'),
});
