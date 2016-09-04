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

import {Settings} from '/client/model/settings';

const kCharacterSets = [
  {label: 'Simplified', value: 'simplified'},
  {label: 'Traditional', value: 'traditional'},
];

Template.settings.helpers({
  charsets: () => kCharacterSets,
  max_adds: () => Settings.get('max_adds'),
  max_reviews: () => Settings.get('max_reviews'),
});
