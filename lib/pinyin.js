const kVowelToTone =
    {1: "āēīōūǖ", 2: "áéíóúǘ", 3: "ǎěǐǒǔǚ", 4: "àèìòùǜ", 5: "aeiouü"};

const set = (tokens) => {
  const result = {};
  tokens.split(' ').map((x) => result[x] = true);
  return result;
}

const kConsonants = set('b p m f d t n l g k h j q x zh ch sh r z c s y w');
const kTwoSyllables = set('ia ian iang iao ie io iong iu ua uai uan ' +
                          'uang ue ui uo van');
const kVowels = set('a ai an ang ao e ei en eng er i ia ian iang iao ie ' +
                    'in ing io iong iu o ong ou u ua uai uan uang ue ui ' +
                    'un uo v van vn');

const dropTones = (pinyin, append_number) => {
  for (let i = 0; i < pinyin.length; i++) {
    for (let option = 1; option <= 4; option++) {
      const index = kVowelToTone[option].indexOf(pinyin[i]);
      if (index >= 0) {
        const toneless = 'aeiouv'[index];
        pinyin = pinyin.substr(0, i) + toneless + pinyin.substr(i + 1);
        if (append_number) {
          return `${pinyin}${option}`;
        }
      }
    }
  }
  return pinyin;
}

const numbersToTones = (numbered) => {
  if (numbered === 'r' || numbered === 'r5') return {result: 'r'};
  if (!numbered || numbered !== numbered.toLowerCase()) {
    return {error: 'pinyin must be lowercase.'};
  }
  let tone = 0;
  if ('12345'.indexOf(numbered[numbered.length - 1]) >= 0) {
    tone = parseInt(numbered[numbered.length - 1], 10);
    numbered = numbered.substr(0, numbered.length - 1);
  }
  for (let i = 0; i < numbered.length; i++) {
    for (let option = 1; option <= 4; option++) {
      const index = kVowelToTone[option].indexOf(numbered[i]);
      if (index >= 0) {
        tone = option;
        const toneless = 'aeiouv'[index];
        numbered = numbered.substr(0, i) + toneless + numbered.substr(i + 1);
      }
    }
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

const tonePinyinToNumberedPinyin = (tone) => {
  return pinyin_util.dropTones(tone, /* append_number=*/true);
}

if (Meteor.isClient) {
  window.tonePinyinToNumberedPinyin = tonePinyinToNumberedPinyin;
}

export {numbersToTones, tonePinyinToNumberedPinyin};
