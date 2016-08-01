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

// Prints the message and throws an error if the conditionis false.
const assert = (condition, message) => {
  if (!condition) {
    console.error(message);
    throw new Error;
  }
}

// Returns a Unix timestamp (the time, in seconds, since January 1st, 1970).
Date.timestamp = () => Math.floor(Date.now() / 1000);

// Returns a hash of the given string equal to Java's String hash.
String.prototype.hash = function() {
  let result = 0;
  for (let i = 0; i < this.length; i++) {
    result = (result << 5) - result + this.charCodeAt(i);
    result = result & result;
  }
  return result;
}
export {assert};
