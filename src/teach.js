/*
 *  Copyright 2016 Shaunak Kishore (kshaunak "at" gmail.com)
 *
 *  This file is part of the Inkstone Handwriting Library. Please contact
 *  the author (email above) for information on licensing this library.
 */

(function(){

const kMaxMistakes = 3;
const kMaxPenalties = 4;

const getResult = (x) => Math.min(Math.floor(2 * x / kMaxPenalties) + 1, 3);

class Character {
  constructor(data, handwriting, ondone) {
    this.data/*:CharacterData*/ = data;
    this.handwriting/*:Handwriting*/ = handwriting;
    this.matcher/*:Matcher*/ = new inkstone.Matcher(data);
    this.missing/*:Array<number>*/ = _.range(data.strokes.length);
    this.mistakes/*:number*/ = 0;
    this.penalties/*:number*/ = 0;
    this.ondone/*:(mistakes: number) => void*/ = ondone;
  }
  onClick() {
    this.penalties += kMaxPenalties;
    this.handwriting.flash(this.data.strokes[this.missing[0]]);
  }
  onDouble() {
    if (this.penalties < kMaxPenalties) return;
    this.handwriting.reveal(this.data.strokes);
    this.handwriting.highlight(this.data.strokes[this.missing[0]]);
  }
  onStroke(stroke) {
    const result = this.matcher.match(stroke, this.missing);

    // The user's input does not match any of the character's strokes.
    if (result.indices.length === 0) {
      this.mistakes += 1;
      this.handwriting.fade();
      if (this.mistakes >= kMaxMistakes) {
        this.penalties += kMaxPenalties;
        this.handwriting.flash(this.data.strokes[this.missing[0]]);
      }
      return;
    }

    // Compute the matched path and the remaining missing strokes.
    const path = result.indices.map((x) => this.data.strokes[x]).join(' ');
    const missing = this.missing.filter((x) => result.indices.indexOf(x) < 0);

    // The user's input matches strokes that were already drawn.
    if (missing.length === this.missing.length) {
      this.penalties += 1;
      this.handwriting.undo();
      this.handwriting.flash(path);
      return;
    }

    // The user's input matches one or more of the missing strokes.
    this.missing = missing;
    const rotate = result.simplified_median.length === 2;
    this.handwriting.emplace(path, rotate, result.source_segment,
                             result.target_segment);
    if (result.warning) {
      this.penalties += result.penalties;
      this.handwriting.warn(result.warning);
    }

    // If the user finished the character, mark it complete. Otherwise, if they
    // drew a stroke out of order, penalize them and give them a hint.
    const index = _.min(result.indices);
    if (this.missing.length === 0) {
      this.handwriting.glow(getResult(this.penalties));
      this.ondone(this.penalties);
    } else if (this.missing[0] < index) {
      this.penalties += 2 * (index - this.missing[0]);
      this.handwriting.flash(this.data.strokes[this.missing[0]]);
    } else {
      this.mistakes = 0;
      this.handwriting.highlight(this.data.strokes[this.missing[0]]);
    }
  }
}

class Teach {
  // Teach class constructor parameters:
  //
  //  - data: an Array of character data structures, looked up in the Make Me
  //          a Hanzi character dataset. This dataset is provided for use with
  //          the Inkstone Handwriting Library, but is licensed separately.
  //
  //  - element: a DOM node to construct the UI within. The height and width
  //             of the handwriting UI will be taken from this DOM element.
  //
  //  - options: an options dictionary, with any subset of the following keys:
  //    - display: an object with the keys:
  //      - stroke_color: CSS color of drawn stroke
  //      - hint_color: CSS color of stroke hints
  //      - drawing_color: CSS color of user input
  //      - font_color: CSS color of hint text
  //      - font_size: CSS size of hint text
  //    - modes: an Array of drawing modes, which are objects with keys:
  //      - repeat: the number of times to repeat a character in that mode
  //      - watermark: the number of repetitions with a watermark
  //      - demo: the number of repetitions which start with a demonstration
  //      - single_tap: the number of times the user can get a single-tap hint
  //      - double_tap: the number of times the user can get a double-tap hint
  //      - max_mistakes: the number of mistakes the user can make before
  //                      the drawing mode changes to the next in the list
  constructor(data, element, options) {
    const handlers = {
      onclick: this.onClick.bind(this),
      ondouble: this.onDouble.bind(this),
      onstroke: this.onStroke.bind(this),
    };
    this.character/*:Character|null*/ = null;
    this.data/*:Array<CharacterData>*/ = data;
    this.handwriting = new inkstone.Handwriting(element, handlers);
    this.mistakes/*:Array<number>*/ = [];
    this.onClick();
  }
  // Private methods - these methods should not be called by clients.
  maybeAdvance() {
    if (this.mistakes.length === this.data.length) return;
    if (this.mistakes.length > 0) this.handwriting.moveToCorner();
    const data = this.data[this.mistakes.length];
    const ondone = this.onCharacterDone.bind(this);
    this.character = new Character(data, this.handwriting, ondone);
  }
  onCharacterDone(mistakes) {
    this.character = null;
    this.mistakes.push(mistakes);
  }
  onClick() {
    this.character ? this.character.onClick() : this.maybeAdvance();
  }
  onDouble() {
    this.character ? this.character.onDouble() : this.maybeAdvance();
  }
  onStroke(stroke) {
    this.character ? this.character.onStroke(stroke) : this.maybeAdvance();
  }
}

this.inkstone = this.inkstone || {};
this.inkstone.Teach = Teach;

})();
