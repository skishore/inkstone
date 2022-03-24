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

// TODO(skishore): Do some kind of smoothing to avoid giving users hints based
// off of the straight segments where strokes intersects.
import {readItem} from '/client/assets';
import {Handwriting} from '/client/handwriting';
import {Settings} from '/client/model/settings';
import {Timing} from '/client/model/timing';
import {Vocabulary} from '/client/model/vocabulary';
import {Popup} from '/client/templates/popup/code';
import {Matcher} from '/lib/matcher/matcher';

let element = null;
let handwriting = null;

const kMaxMistakes = 3;
const kMaxPenalties  = 4;

const helpers = new ReactiveDict();
const item = {card: null, index: 0, tasks: []};

// A couple small utility functions used by the logic below.

const defer = (callback) => Meteor.setTimeout(callback, 20);

const fixMedianCoordinates = (median) => median.map((x) => [x[0], 900 - x[1]]);

const getResult = (x) => Math.min(Math.floor(2 * x / kMaxPenalties) + 1, 3);

const maybeAdvance = () => {
  if (item.index === item.tasks.length) {
    return true;
  }

  const task = item.tasks[item.index];
  if (task.missing.length > 0) {
    return false;
  } else if (task.result === null) {
    return true;
  }
  item.index += 1;

  helpers.set('complete', false);
  $(window).trigger('makemeahanzi-next-character');
  if (item.index < item.tasks.length) {
    handwriting.moveToCorner();
  } else {
    transition();
    maybeRecordResult();
    handwriting.clear();
  }
  return true;
}

const maybeRecordResult = () => {
  if (!item.card) return;
  const card = item.card;
  const result = _.reduce(item.tasks.map((x) => x.result),
                          (x, y) => Math.max(x, y), 0);
  defer(() => Timing.completeCard(card, result));
}

const transition = () => {
  const clone = element.clone();
  const wrapper = element.parent();
  const scroller = wrapper.parent();
  clone.css({transform: 'translate(-100vw, -50%)'});
  clone.find('canvas')[0].getContext('2d').drawImage(
      element.find('canvas')[0], 0, 0);
  wrapper.children().slice(1).remove();
  wrapper.append(clone);
  $.Velocity.animate(scroller, {left: '100%'}, 0).then(() =>
      $.Velocity.animate(scroller, {left: 0}, 300).then(() =>
          $(window).trigger('makemeahanzi-flashcard-slide')));
}

// Event handlers for touch interactions on the handwriting canvas.

const onClick = () => {
  if (maybeAdvance()) return;
  const task = item.tasks[item.index];
  task.penalties += kMaxPenalties;
  handwriting.flash(task.strokes[task.missing[0]]);
}

const onDouble = () => {
  if (maybeAdvance()) return;
  const task = item.tasks[item.index];
  if (task.penalties < kMaxPenalties) return;
  handwriting.reveal(task.strokes);
  handwriting.highlight(task.strokes[task.missing[0]]);
}

const onRegrade = (result) => {
  const task = item.tasks[item.index];
  if (!task || task.missing.length > 0 || task.result !== null) return;
  task.result = result;
  handwriting.glow(task.result);
  handwriting._stage.update();
  helpers.set('grading', false);
  element.find('#grading').remove();
  maybeAdvance();
}

const onRendered = function() {
  const options = {onclick: onClick, ondouble: onDouble, onstroke: onStroke};
  element = $(this.firstNode).find('.flashcard');
  handwriting = new Handwriting(element, options);
}

const onRequestRegrade = (stroke) => {
  const task = item.tasks[item.index];
  if (!task || task.missing.length > 0 || task.result === null) return false;
  const n = stroke.length;
  if (stroke[0][1] - stroke[n - 1][1] <
      Math.abs(stroke[0][0] - stroke[n - 1][0])) {
    return false;
  }
  task.result = null;
  handwriting.glow(task.result);
  helpers.set('grading', true);
  return true;
}

const onStroke = (stroke) => {
  if (onRequestRegrade(stroke) || maybeAdvance()) return;
  const task = item.tasks[item.index];
  const result = task.matcher.match(stroke, task.missing);
  task.recording.push({indices: result.indices, stroke: stroke});

  // The user's input does not match any of the character's strokes.
  if (result.indices.length === 0) {
    task.mistakes += 1;
    handwriting.fade();
    if (task.mistakes >= kMaxMistakes) {
      task.penalties += kMaxPenalties;
      handwriting.flash(task.strokes[task.missing[0]]);
    }
    return;
  }

  // Compute the matched path and the remaining missing strokes.
  const path = result.indices.map((x) => task.strokes[x]).join(' ');
  const missing = task.missing.filter((x) => result.indices.indexOf(x) < 0);

  // The user's input matches strokes that were already drawn.
  if (missing.length === task.missing.length) {
    task.penalties += 1;
    handwriting.undo();
    handwriting.flash(path);
    return;
  }

  // The user's input matches one or more of the missing strokes.
  task.missing = missing;
  const rotate = result.simplified_median.length === 2;
  handwriting.emplace([path, rotate, result.source_segment,
                       result.target_segment]);
  if (result.warning) {
    task.penalties += result.penalties;
    handwriting.warn(result.warning);
  }

  // If the user finished the character, mark it complete. Otherwise, if they
  // drew a stroke out of order, penalize them and give them a hint.
  const index = _.min(result.indices);
  if (task.missing.length === 0) {
    helpers.set('complete', true);
    $(window).trigger('makemeahanzi-character-complete');
    task.result = getResult(task.penalties);
    handwriting.glow(task.result);
  } else if (task.missing[0] < index) {
    task.penalties += 2 * (index - task.missing[0]);
    handwriting.flash(task.strokes[task.missing[0]]);
  } else {
    task.mistakes = 0;
    handwriting.highlight(task.strokes[task.missing[0]]);
  }
}

// Event handlers for keeping the item, card, and tasks up-to-date.

const onErrorCard = (card) => {
  helpers.clear();
  helpers.set('deck', card.deck);
  helpers.set('error', card.data.error);
  helpers.set('options', card.data.options);
  updateItem(card, {characters: []});
}

const onItemData = (data) => {
  const card = Timing.getNextCard();
  var pinyin = data.pinyin;
  var ipa = transcribe(pinyin);
  if (!card || data.word !== card.data.word) {
    console.log('Moved on from card:', card);
    return;
  }
  helpers.clear();
  helpers.set('deck', card.deck);
  helpers.set('definition', data.definition);
  helpers.set('pinyin', pinyin);
  helpers.set('ipa', ipa);
  helpers.set('word', data.word);
  updateItem(card, data);
}

const onNewItem = (item) => {
  const charset = Settings.get('character_set');
  readItem(item, charset).then(onItemData).catch((error) => {
    if (Settings.get('demo_mode')) return;
    console.error('Card data request error:', error);
    defer(Timing.shuffle);
  });
}

const updateCard = () => {
  const card = Timing.getNextCard();
  if (!card || !card.data) return;
  handwriting && handwriting.clear();
  helpers.set('deck', card.deck);
  if (card.deck === 'errors') {
    onErrorCard(card);
  } else {
    defer(() => onNewItem(card.data));
  }
}

const updateItem = (card, data) => {
  item.card = card;
  item.index = 0;
  item.tasks = data.characters.map((row, i) => ({
    data: row,
    index: i,
    matcher: new Matcher(row),
    missing: _.range(row.medians.length),
    mistakes: 0,
    penalties: 0,
    recording: [],
    result: null,
    strokes: row.strokes,
  }));
}

// Meteor template and event bindings follow.

const maybeBlacklistWord = (word) => {
  const callback = () => {
    Popup.hide(50);
    const item = {
      definition: helpers.get('definition'),
      pinyin: helpers.get('pinyin'),
      word: helpers.get('word'),
    };
    if (!item.word || item.word !== word) return;
    Vocabulary.updateBlacklist(item, /*blacklisted=*/true);
    transition();
    handwriting.clear();
  }
  const buttons = [
    {callback: callback, label: 'Yes'},
    {class: 'bold', label: 'No'},
  ];
  const text = `Are you sure you want to blacklist this word? ` +
               'You can remove words from the blacklist on the Lists page.';
  Popup.show({title: `Confirm Blacklist`, text: text, buttons: buttons});
}

const maybeShowAnswerForTask = (task) => {
  task = item.tasks[task.index];
  if (!(task.missing.length > 0 && task.penalties < kMaxPenalties)) {
    showAnswerForTask(task);
    return;
  }
  const buttons = [
    {callback: () => showAnswerForTask(task), label: 'Yes'},
    {class: 'bold', label: 'No'},
  ];
  const text = 'Looking at the details page will count as getting this ' +
               'character wrong. Proceed?';
  Popup.show({title: 'Character Details', text: text, buttons: buttons});
}

const showAnswerForTask = (task, skip_confirmation) => {
  task = item.tasks[task.index];
  if (task.missing.length > 0 && task.penalties < kMaxPenalties) {
    task.penalties += kMaxPenalties;
  }
  const codepoint = task.data.character.codePointAt(0);
  Meteor.defer(() => window.location.hash = codepoint);
  Popup.hide(50);
}

Template.answer_selection.events({
  'click .option': function() { maybeShowAnswerForTask(this); },
});

Template.answer_selection.helpers({
  obfuscate: (task) => task.missing.length > 0 ? '?' : task.data.character,
  tasks: () => item.tasks,
});

Template.grading.events({
  'click .icon': function(event) {
    onRegrade(parseInt($(event.currentTarget).attr('data-result'), 10));
  },
});

Template.teach.events({
  'click .flashcard > .error > .option': function(event) {
    if (this.extra) {
      transition();
      Timing.addExtraCards(this.extra);
    } else if (this.link) {
      Router.go(this.link);
    } else {
      console.error('Unable to apply option:', this);
    }
  },
  'click a.control.blacklist': (event) => {
    if (!item.card || item.card.deck === 'errors') return;
    maybeBlacklistWord(item.card.data.word);
  },
  'click a.control.home': (event) => {
    // NOTE: We have to go forward here instead of going back because the
    // answer selection page adds spurious history entries for this page.
    Router.go('/');
    event.stopPropagation();
  },
  'click a.control.redo': (event) => {
    if (!item.card || item.card.deck === 'errors') return;
    const penalties = item.tasks.map((x) => x.penalties);
    updateItem(item.card, {characters: item.tasks.map((x) => x.data)});
    item.tasks.forEach((x, i) => x.penalties = penalties[i]);
    handwriting.clear(/*fade=*/true);
    helpers.set('grading', false);
    element.find('#grading').remove();
  },
  'click a.control.show': () => {
    if (item.tasks.length === 1) {
      maybeShowAnswerForTask(item.tasks[0]);
    } else if (item.tasks.length > 1) {
      Popup.show({title: 'Character Details', template: 'answer_selection'});
    }
  },
  'click .icon.regrade': () => {
    onRequestRegrade([[0, 1], [0, 0]]);
    handwriting._stage.update();
  },
});

Template.teach.helpers({
  get: (key) => helpers.get(key),
  margin: () => {
    const width = Settings.get('canvas_width');
    return Math.max(Math.min(Math.floor((100 - width) / 2), 50), 0);
  },
  show_regrading_icon: () => {
    return Settings.get('show_regrading_icon') && helpers.get('complete');
  },
  showIpa: () => {
    return Settings.get('show_ipa') ;
  },
});

Template.teach.onRendered(onRendered);

Tracker.autorun(updateCard);

///////////////////////////////////////////////
// Third party library: app-pinyin-phonetics
// This version is from https://github.com/villesundell/app-pinyin-phonetics
// Original: https://github.com/r12a/app-pinyin-phonetics (CC-BY-4.0 License)
//
// The non-obvious phonetic symbols are pronounced as follows:
//
// pʰ, etc. (aspirated consonant) With strong breath: compare the 'p' in 'part' and 'stop'.
// ɕ (voiceless alveolo-palatal fricative) Like sh in sheet, with tongue flat, corners of lips drawn back, and tip of tongue against back of bottom teeth.
// ʂ (retroflex voiceless fricative) 'sh' with tongue curled back.
// ʈʂ (retroflex voiceless dental affricate) 'tsh' with tongue curled back.
// x (voiceless velar affricate) Like 'ch' in 'loch', with back of tongue towards the roof of the mouth.
// ɻ (voiced blade-palatal fricative) Like 'r' in 'ray', tongue curled back with only slight friction.
// i̯, u̯ (non-syllabic vowel) Like 'y' in 'yet' or 'w' in 'how'.
// y (high front rounded vowel) Like 'u' in French or 'ü' in German.
// ɤ (upper mid-back unrounded vowel) Similar to English 'duh', but not as open.
// ɛ (lower mid-front unrounded vowel) Like 'e' in 'yet'.

function inSet (group, ch) {
  if (group.indexOf(ch) > -1) {
    return true;
  } else {
    return false;
  }
}

function transcribe (value) {
  value = value.toLowerCase();

  // convert double consonants
  value = value.replace(/zh/g,"ẑ");
  value = value.replace(/ch/g,"ĉ");
  value = value.replace(/sh/g,"ŝ");
  var consonants = 'bpmfdtlgkhjqxzẑcĉsŝwy';

  // break into syllables
  value = value.replace(/'/g," ");
  value = value.replace(/ng/g,"ŋ");
  value = value.replace(/ŋ([^ ])/g,"ŋ $1");
  value = value.replace(/([^ ])n([^ ])/g,"$1n $2");

  var syllables = '';
  for (var i=0;i<value.length;i++) {
    if (inSet(consonants,value[i])) {
      syllables += ' '+value[i];
    } else {
      syllables += value[i];
    }
  }
  value = syllables.trim();

  // replace accents
  value = value.replace(/á/g,"a");
  value = value.replace(/ā/g,"a");
  value = value.replace(/ǎ/g,"a");
  value = value.replace(/à/g,"a");

  value = value.replace(/é/g,"e");
  value = value.replace(/ē/g,"e");
  value = value.replace(/ě/g,"e");
  value = value.replace(/è/g,"e");

  value = value.replace(/í/g,"i");
  value = value.replace(/ī/g,"i");
  value = value.replace(/ǐ/g,"i");
  value = value.replace(/ì/g,"i");

  value = value.replace(/ó/g,"o");
  value = value.replace(/ō/g,"o");
  value = value.replace(/ǒ/g,"o");
  value = value.replace(/ò/g,"o");

  value = value.replace(/ú/g,"u");
  value = value.replace(/ū/g,"u");
  value = value.replace(/ǔ/g,"u");
  value = value.replace(/ù/g,"u");

  value = value.replace(/ǘ/g,"ü");
  value = value.replace(/ǖ/g,"ü");
  value = value.replace(/ǚ/g,"ü");
  value = value.replace(/ǜ/g,"ü");

  // special yu sounds
  value = value.replace(/yue/g,"Y̯E");
  value = value.replace(/yuan/g,"Y̯ɛn");
  value = value.replace(/yun/g,"Yn");
  value = value.replace(/yu/g,"Y");

  // replace y
  value = value.replace(/y/g,"i");
  value = value.replace(/w/g,"u");

  // convert consonants
  value = value.replace(/ẑ/g,"ʈʂ");
  value = value.replace(/ĉ/g,"ʈʂʰ");
  value = value.replace(/ŝ/g,"ʂ");
  value = value.replace(/p/g,"pʰ");
  value = value.replace(/b/g,"p");
  value = value.replace(/t/g,"tʰ");
  value = value.replace(/d/g,"t");
  value = value.replace(/k/g,"kʰ");
  value = value.replace(/g/g,"k");
  value = value.replace(/x/g,"ɕ");
  value = value.replace(/h/g,"x");
  value = value.replace(/j/g,"ʨ");
  value = value.replace(/q/g,"ʨʰ");
  value = value.replace(/z/g,"ʦ");
  value = value.replace(/c/g,"ʦʰ");
  value = value.replace(/r/g,"ɻ");

  // special i sounds
  value = value.replace(/ʦi/g,"ʦɹ̩");
  value = value.replace(/ʦʰi/g,"ʦʰɹ̩");
  value = value.replace(/si/g,"sɹ̩");
  value = value.replace(/ʈʂi/g,"ʈʂɻ");
  value = value.replace(/ʈʂʰi/g,"ʈʂʰɻ");
  value = value.replace(/ʂi/g,"ʂɻ");
  value = value.replace(/ɻi/g,"ɻɚ");

  // special u sounds
  value = value.replace(/ʨu/g,"ʨü");
  value = value.replace(/ʨʰu/g,"ʨʰü");
  value = value.replace(/ɕu/g,"ɕü");

  // vowels
  value = value.replace(/ii/g,"i");
  value = value.replace(/uu/g,"u");
  value = value.replace(/iao/g,"IɑU");
  value = value.replace(/ian/g,"Iɛn");
  value = value.replace(/ioŋ/g,"Iʊŋ");
  value = value.replace(/iaŋ/g,"Iɑŋ");
  value = value.replace(/uai/g,"UaI");
  value = value.replace(/uan/g,"Uan");
  value = value.replace(/üan/g,"Y̯ɛn");
  value = value.replace(/uaŋ/g,"Uɑŋ");
  value = value.replace(/ai/g,"aI");
  value = value.replace(/ei/g,"EI");
  value = value.replace(/ao/g,"ɑU");
  value = value.replace(/ou/g,"OU");
  value = value.replace(/oŋ/g,"ʊŋ");
  value = value.replace(/eŋ/g,"əŋ");
  value = value.replace(/aŋ/g,"ɑŋ");
  value = value.replace(/en/g,"ən");
  value = value.replace(/un/g,"Uən");
  value = value.replace(/ün/g,"Yn");
  value = value.replace(/eɻ/g,"əɻ");
  value = value.replace(/ia/g,"Iä");
  value = value.replace(/ie/g,"IE");
  value = value.replace(/iu/g,"IOU");
  value = value.replace(/ua/g,"Uä");
  value = value.replace(/ui/g,"UEI");
  value = value.replace(/ue/g,"y̯E");
  value = value.replace(/üe/g,"y̯E");
  value = value.replace(/uo/g,"UO̞");
  value = value.replace(/o/g,"UO̞");
  value = value.replace(/e/g,"ɤ");
  value = value.replace(/ü/g,"y");
  value = value.replace(/ê/g,"ɛ̝");
  value = value.replace(/io/g,"i̯ɔ̝");
  value = value.replace(/o/g,"ɔ̝");

  value = value.replace(/U/g,"u̯");
  value = value.replace(/I/g,"i̯");
  value = value.replace(/E/g,"e");
  value = value.replace(/O/g,"o");
  value = value.replace(/Y/g,"y");

  value = value.replace(/[ ]+/g,' ');
  value = value.replace(/\n /g,'\n');
  return value;
}
