// This file is the only one in the stroke-matcher directory that is intended
// for use outside of it.
import {assert} from '/lib/base';
import {findCorners} from '/lib/matcher/corners';
import {Shortstraw} from '/lib/matcher/external/shortstraw';
import {recognize} from '/lib/matcher/recognizer';

// A `Matcher` instance tries to match user-generated strokes to one of the
// strokes of a given character.
class Matcher {
  // The constructor takes the full data of the character to be matched as
  // provided by lookup.js. This data should include at minimum the fields:
  //
  //   - character (String): The length-1 character string.
  //   - medians (Array of [Number, Number]): The character's stroke's medins.
  //
  // TODO(zhaizhai): It will likely be beneficial to use decomposition data
  // and full stroke paths for matching as well. Experiment with these changes.
  constructor(character_data) {
    this.character = character_data.character;

    // Run a corner-detection algorithm tuned for precision to simplify the
    // medians of the character's strokes.
    this.medians = character_data.medians.map((x) => findCorners([x])[0]);
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
  //  - index: The index of the best match, or -1 if no good match was found.
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
    assert(missing.length > 0, "Must have at least one missing stroke!");
    // Run a corner detection algorithm tuned for recall to simplify the
    // medians of the user's strokes.
    stroke = (new Shortstraw).run(stroke);

    let best_result = {index: -1, score: -Infinity};
    for (let i = 0; i < this.medians.length; i++) {
      const median = this.medians[i];
      const offset = i - missing[0];
      const result = recognize(stroke, median, offset);
      if (result.score > best_result.score) {
        best_result = {
          index: i,
          penalties: result.penalties,
          score: result.score,
          source_segment: result.source,
          simplified_median: median,
          target_segment: result.target,
          warning: result.warning,
        };
      }
    }
    return best_result;
  }
}

export {Matcher};
