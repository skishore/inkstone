/*
 *  Copyright 2016 Shaunak Kishore (kshaunak "at" gmail.com)
 *
 *  This file is part of the Inkstone Handwriting Library. Please contact
 *  the author (email above) for information on licensing this library.
 */

// This file is the only one in the stroke-matcher directory that is intended
// for use outside of it.

(function(){

// A shortcut is viable if all the strokes are done or all are missing.
const viable = (indices, missing) => {
  if (indices.length === 1) return true;
  const set = {};
  missing.forEach((x) => set[x] = true);
  const remaining = indices.filter((x) => set[x]).length;
  return remaining === 0 || remaining === indices.length;
}

// A `Matcher` instance tries to match user-generated strokes to one of the
// strokes of a given character.
class Matcher {
  // The constructor takes the full data of the character to be matched as
  // provided by lookup.js. This data should include at minimum the fields:
  //
  //   - character: String: The length-1 character string.
  //   - components: [{String: Number}]: The components each stroke is in.
  //   - medians: [[Number, Number]]: The character's stroke's medins.
  //
  // TODO(zhaizhai): It will likely be beneficial to use decomposition data
  // and full stroke paths for matching as well. Experiment with these changes.
  constructor(character_data) {
    // Run a corner-detection algorithm tuned for precision to simplify the
    // medians of the character's strokes.
    this._medians = character_data.medians.map(
        (x) => inkstone.matcher.findCorners([x])[0]);

    // Combine the medians to form possible shortcuts for the character.
    this._shortcuts = inkstone.matcher.getShortcuts(
        character_data.components, this._medians);

    // Fill in the final list of possible candidates. Each candidate has the
    // schema of a shortcut: a list of indices and a median to match.
    this._candidates = this._medians.map((x, i) => ({indices: [i], median: x}))
                                    .concat(this._shortcuts);
  }
  // Attempts to match the user's stroke with the character's strokes:
  //
  //  - stroke (Array of [Number, Number]): The user's stroke input.
  //  - missing (Array of [Integer]): The indices of the strokes that are
  //    still missing from the character, sorted in ascending order. We use
  //    these indices for context (for example, we prefer matching the next
  //    missing stroke over other strokes).
  //
  // Returns an Object with the following fields:
  //
  //  - indices: The indices of the best match. Empty if no match was found.
  //  - score: The score of the match (with higher scores for closer matches).
  //
  // If a match was found, the return value will have these additional fields:
  //
  //  - penalties: A non-negative integer representing a suggested penalty for
  //    for any defects in the match. A match with no defects has penalty 0.
  //  - source_segment: A line segment approximating the user's stroke.
  //  - simplified_median: The simplified matched median.
  //  - target_segment: A line segment approximating the part of the matched
  //    median that the source_segment corresponds to.
  //  - warning: A message explaining any defects of the match (for example,
  //    'Stroke backwards' or 'Should hook'). Will always be present when the
  //    penalty is non-zero, but may be present otherwise as well.
  //
  // TODO(skishore,zhaizhai): Replace the 'simplified_median',
  // 'source_segment', and 'target_segment' return values with a suggested
  // affine transform that would map the user's stroke to the matched stroke.
  match(stroke, missing) {
    if (missing.length === 0) {
      throw new Error("Must have at least one missing stroke!");
    }
    // Run a corner detection algorithm tuned for recall to simplify the
    // medians of the user's strokes.
    stroke = (new Shortstraw).run(stroke);

    let best_result = {indices: [], score: -Infinity};
    this._candidates.forEach((candidate, i) => {
      if (!viable(candidate.indices, missing)) return;
      const first_index = _.min(candidate.indices);
      const offset = first_index - missing[0];
      const result = inkstone.matcher.recognize(
          stroke, candidate.median, offset);
      if (result.score > best_result.score) {
        best_result = {
          indices: candidate.indices,
          penalties: result.penalties,
          score: result.score,
          source_segment: result.source,
          simplified_median: candidate.median,
          target_segment: result.target,
          warning: result.warning,
        };
      }
    });
    return best_result;
  }
}

this.inkstone = this.inkstone || {};
this.inkstone.Matcher = Matcher;

})();
