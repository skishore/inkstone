const set = (tokens) => {
  const result = {};
  tokens.split(' ').map((x) => result[x] = true);
  return result;
}

const kConsonants = set('b p m f d t n l g k h j q x zh ch sh r z c s y w');
const kTwoSyllables = set('ia ian iang iao ie io iong iu ua uai uan ' +
                          'uang ue ui uo van ve');
const kVowels = set('a ai an ang ao e ei en eng er i ia ian iang iao ie ' +
                    'in ing io iong iu o ong ou u ua uai uan uang ue ui ' +
                    'un uo v van ve vn');

const kVowelToTone =
    {1: "āēīōūǖ", 2: "áéíóúǘ", 3: "ǎěǐǒǔǚ", 4: "àèìòùǜ", 5: "aeiouü"};

const isNumber = (x) => !!kVowelToTone[x];

const isSkip = (x) => "', ".indexOf(x) >= 0;

const numberToTone = (numbered) => {
  numbered = numbered.replace('u:', 'v');
  if (numbered === 'r' || numbered === 'r5') return {result: 'r'};
  if (!numbered || numbered !== numbered.toLowerCase()) {
    return {error: 'pinyin must be lowercase.'};
  }
  let tone = 5;
  if (isNumber(numbered[numbered.length - 1])) {
    tone = parseInt(numbered[numbered.length - 1], 10);
    numbered = numbered.substr(0, numbered.length - 1);
  }
  let consonant = '';
  for (let i = 1; i < numbered.length; i++) {
    const candidate = numbered.substr(0, i);
    if (kConsonants[candidate]) {
      consonant = candidate;
    } else {
      break;
    }
  }
  let vowel = numbered.substr(consonant.length);
  if (consonant && !kConsonants[consonant]) {
    return {error: 'unable to parse consonant.'};
  } else if (!kVowels[vowel]) {
    return {error: 'unable to parse vowel.'};
  }
  if (kTwoSyllables[vowel]) {
    const index = 'aeiouv'.indexOf(vowel[1]);
    vowel = vowel[0] + kVowelToTone[tone][index] + vowel.substr(2);
  } else {
    const index = 'aeiouv'.indexOf(vowel[0]);
    if (index < 0) {
      return {error: `Unexpected vowel: ${vowel}.`};
    }
    vowel = kVowelToTone[tone][index] + vowel.substr(1);
  }
  return {result: consonant + vowel.replace('v', 'ü')};
}

const numbersToTones = (numbered) => {
  let start = 0;
  let index = 0;
  const result = [];
  while (index < numbered.length) {
    index += 1;
    const ch = numbered[index];
    if (index === numbered.length || isNumber(ch) || isSkip(ch)) {
      // TODO(skishore): When index === numbered.length, we rely on the fact
      // that substr truncates the string when the requested length is too
      // long which is just a hack.
      const next = index + (isSkip(ch) ? 0 : 1);
      const syllable = numbered.substr(start, next - start);
      // TODO(skishore): This handling of capitalization is a hack that only
      // works because in English the first letter is the only capital one.
      const lower = syllable[0].toLowerCase() + syllable.substr(1);
      const pinyin = numberToTone(lower);
      if (pinyin.error) return pinyin;
      result.push(lower === syllable ? pinyin.result :
                  pinyin.result[0].toUpperCase() + pinyin.result.substr(1));
      // TODO(skishore): Clean up these terrible hacks. At the end of the
      // input string, start will go way out of bounds. Also, the error
      // displayed when there are two tone numbers in a row is not helpful.
      start = next;
      while (start < numbered.length && isSkip(numbered[start])) {
        result.push(numbered[start]);
        start += 1;
      }
      index = start;
    }
  }
  return {result: result.join('')};
}

export {numbersToTones};
