/*
 *  Copyright 2016 Shaunak Kishore (kshaunak "at" gmail.com)
 *
 *  This file is part of the Inkstone Handwriting Library. Please contact
 *  the author (email above) for information on licensing this library.
 */

(function(){

const kMaxAttempts = 3;
const kMaxMistakes = 4;

// Returns a Promise that resolves after the given time, in milliseconds.
const delay = (duration) => new Promise((resolve, reject) => {
  setTimeout(resolve, duration);
});

// Compute a result given the number of mistakes the user made. The result
// can be 0 (GOOD), 1 (FAIR), or 2 (POOR).
const getResult = (x) => Math.min(Math.floor(2 * x / kMaxMistakes), 2);

class Character {
  constructor(data, handwriting, ondone, options) {
    this.attempts/*:number*/ = 0;
    this.data/*:CharacterData*/ = data;
    this.handwriting/*:Handwriting*/ = handwriting;
    this.matcher/*:Matcher*/ = new inkstone.Matcher(data);
    this.missing/*:Array<number>*/ = _.range(data.strokes.length);
    this.mistakes/*:number*/ = 0;
    this.ondone/*:(mistakes: number) => void*/ = ondone;
    this.options/*:Options*/ = options;
  }
  onClick() {
    this.mistakes += 2;
    this.handwriting.flash(this.data.strokes[this.missing[0]]);
  }
  onDouble() {
    if (this.mistakes === 0) return;
    this.handwriting.reveal(this.data.strokes);
  }
  onStroke(stroke) {
    const result = this.matcher.match(stroke, this.missing);

    // The user's input does not match any of the character's strokes.
    if (result.indices.length === 0) {
      this.attempts += 1;
      this.handwriting.fadeStroke();
      if (this.attempts >= kMaxAttempts) {
        this.mistakes += 1;
        this.handwriting.flash(this.data.strokes[this.missing[0]]);
      }
      return;
    }

    // Compute the matched path and the remaining missing strokes.
    const path = result.indices.map((x) => this.data.strokes[x]).join(' ');
    const missing = this.missing.filter((x) => result.indices.indexOf(x) < 0);

    // The user's input matches strokes that were already drawn.
    if (missing.length === this.missing.length) {
      this.mistakes += 1;
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
      this.mistakes += 1;
      this.handwriting.warn(this.options.messages[result.warning]);
    }

    // If the user finished the character, mark it complete. Otherwise, if they
    // drew a stroke out of order, penalize them and give them a hint.
    const index = _.min(result.indices);
    if (this.missing.length === 0) {
      this.handwriting.glow(getResult(this.mistakes));
      this.ondone(this.mistakes);
    } else if (this.missing[0] < index) {
      this.mistakes += 2 * (index - this.missing[0]);
      this.handwriting.flash(this.data.strokes[this.missing[0]]);
    } else {
      this.attempts = 0;
    }
  }
}

class Cursor {
  constructor() {
    this.reset();
  }
  nextCharacter() {
    this.reset({character: this.character + 1});
  }
  nextMode() {
    this.reset({character: this.character, mode: this.mode + 1});
  }
  nextRepetition() {
    this.repetition += 1;
  }
  reset(values) {
    this.character = 0;
    this.mode = 0;
    this.repetition = 0;
    this.num_single_taps = 0;
    this.num_double_taps = 0;
    this.num_mistakes = 0;
    if (values) {
      for (const key in values) {
        this[key] = values[key];
      }
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
  //  - options: an options dictionary, with the following keys:
  //    - display: an object with the keys:
  //      - animation_color: CSS color of stroke animation
  //      - animation_speed: Speed of stroke animation
  //      - hint_color: CSS color of stroke hints
  //      - drawing_color: CSS color of user input
  //      - font_color: CSS color of hint text
  //      - font_size: CSS size of hint text
  //      - result_colors: List of three CSS colors for GOOD, FAIR, and POOR
  //                       drawing performance, respectively
  //      - stroke_color: CSS color of completed strokes
  //      - watermark_color: CSS color of the watermark
  //    - listener: callback that we will pass events of the following types:
  //      - {type: 'mode', character: string, mistakes: number, mode: number}
  //      - {type: 'done'}
  //    - messages: a dictionary providing messages for the following cases:
  //      - again: "Again!" - used between repetitions
  //      - should_hook: "Should hook." - used during writing
  //      - stroke_backward: "Stroke backward." - used during writing
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
    const inner = document.createElement('div');
    inner.style.position = 'relative';
    inner.style.width = inner.style.height = '100%';
    element.appendChild(inner);

    this.animating/*:boolean*/ = false;
    this.character/*:Character|null*/ = null;
    this.cursor = new Cursor();
    this.data/*:Array<CharacterData>*/ = data;
    this.done/*:boolean*/ = false;
    this.element/*:HTMLElement*/ = inner;
    this.handwriting = new inkstone.Handwriting(
        inner, handlers, options.display);
    this.options/*:Options*/ = options;
    this.nextCharacter();
  }
  // Private methods - these methods should not be called by clients.
  maybeAdvance() {
    if (this.animating || this.character) return;
    const mode = this.options.modes[this.cursor.mode];
    if (this.cursor.mode + 1 < this.options.modes.length &&
        this.cursor.num_mistakes >= mode.max_mistakes) {
      this.recordStep();
      this.cursor.nextMode();
      this.nextMode();
    } else if (this.cursor.repetition + 1 < mode.repeat) {
      this.handwriting.warn(this.options.messages.again);
      this.cursor.nextRepetition();
      this.nextRepetition();
    } else if (this.cursor.character + 1 < this.data.length) {
      this.recordStep();
      this.cursor.nextCharacter();
      this.nextCharacter();
    } else if (!this.done) {
      this.recordStep();
      this.options.listener({type: 'done'});
      this.done = true;
    }
  }
  nextCharacter() {
    // Perform the animation of moving the character to the corner,
    // then start on the first repetition of the next character.
    this.animating = true;
    const animation = this.cursor.character > 0 ?
        this.handwriting.moveToCorner().then(() => delay(150)) :
        Promise.resolve();
    animation.then(() => {
      this.animating = false;
      this.nextRepetition();
    });
  }
  nextMode() {
    this.nextRepetition();
  }
  nextRepetition() {
    const data = this.data[this.cursor.character];
    const mode = this.options.modes[this.cursor.mode];

    // Perform the animation demonstrating the character's stroke order,
    // then allow the user to write the character themselves.
    this.animating = true;
    this.handwriting.fadeCharacter();
    const animation = this.cursor.repetition < mode.demo ?
        inkstone.animate(data, this.element, this.options.display) :
        Promise.resolve();
    animation.then(() => {
      this.animating = false;
      Array.from(this.element.getElementsByTagName('svg'))
           .map((x) => this.element.removeChild(x));
      const ondone = this.onCharacterDone.bind(this);
      this.character = new Character(
          data, this.handwriting, ondone, this.options);
      if (this.cursor.repetition < mode.watermark) {
        this.handwriting.reveal(data.strokes);
        this.handwriting._stage.update();
      }
    });
  }
  onCharacterDone(mistakes) {
    this.character = null;
    this.cursor.num_mistakes += mistakes;
  }
  onClick() {
    if (!this.character) return this.maybeAdvance();
    const mode = this.options.modes[this.cursor.mode];
    if (this.cursor.num_single_taps < mode.single_tap) {
      this.cursor.num_single_taps += 1;
      this.character.onClick();
    }
  }
  onDouble() {
    if (!this.character) return this.maybeAdvance();
    const mode = this.options.modes[this.cursor.mode];
    if (this.cursor.num_double_taps < mode.double_tap) {
      this.cursor.num_double_taps += 1;
      this.character.onDouble();
    }
  }
  onStroke(stroke) {
    if (!this.character) return this.maybeAdvance();
    this.character.onStroke(stroke);
  }
  recordStep() {
    this.options.listener && this.options.listener({
      type: 'step',
      character: this.data[this.cursor.character].character,
      mistakes: this.cursor.num_mistakes,
      mode: this.cursor.mode,
    });
  }
}

this.inkstone = this.inkstone || {};
this.inkstone.Teach = Teach;

})();
