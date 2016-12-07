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

const Character = Match.Where((x) => check(x, String) || x.length === 1);

const CharacterData = {
  character: Character,
  decomposition: String,
  definition: Match.Maybe(String),
  etymology: Match.Maybe(Object),
  pinyin: [String],
  radical: Character,
  matches: [Match.Maybe([Match.Integer])],
  strokes: [String],
  medians: [[[Number]]],
  dependencies: Object,
  components: [Object],
};

// Returns the asset file that a given character is found in.
const assetForCharacter =
    (character) => `characters/${Math.floor(character.charCodeAt(0) / 256)}`;

export {CharacterData, assetForCharacter};
