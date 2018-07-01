const kOptions = {
  display: {
    animation_color: '#00c0ff',
    animation_speed: 1,
    drawing_color: '#888888',
    hint_color: '#00c0ff',
    font_color: '#00c0ff',
    font_size: '48px',
    result_colors: ['#88c874', '#c0c080', '#e87878'],
    stroke_color: '#000000',
    watermark_color: '#cccccc',
  },
  messages: {
    again: 'Again!',
    should_hook: 'Should hook.',
    stroke_backward: 'Stroke backward.',
  },
  modes: [{
    repeat: 1,
    watermark: 0,
    demo: 0,
    single_tap: Infinity,
    double_tap: Infinity,
    max_mistakes: 1,
  }],
};

// Takes a Chinese character and returns a Promise that will resolve to the
// data for that to that character. This method may be replaced by other
// asset-loading mechanisms in real deployments of this library.
const getCharacterData = (character) => {
  const index = Math.floor(character.charCodeAt(0) / 256);
  const asset = `assets/characters_v2/${index}`;
  return getUrl(asset).then((data) => {
    for (const line of data.trim().split('\n')) {
      const row = JSON.parse(line);
      if (row.character === character) return row;
    }
    throw new Error(`Unable to find character data for ${character}.`);
  });
}

// Gets a certain HTML DOM element by its ID, checking that it exists.
const getElementById = (id) => {
  const result = document.getElementById(id);
  if (!result) throw Error(`Unable to find #${id}.`);
  return result;
}

// Returns a Promise that resolves to the data stored at a GET URL.
const getUrl = (url) => {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.addEventListener('error', () => reject(request));
    request.addEventListener('load', () => resolve(request.response));
    request.open('GET', url);
    request.send();
  });
}

// Runs a loop given the list of words to sample from.
const runLoop = (elements, entries) => {
  let previous = null;
  const result = (resize) => {
    let entry = previous;
    while (entry === previous && !resize) {
      entry = entries[Math.floor(Math.random() * entries.length)];
    }
    previous = entry;
    const listener = x => x.type === 'done' && result();
    runWord(elements, entry, listener);
  };
  return result;
}

// Runs a word on the given UI element.
const runWord = (elements, entry, listener) =>
  Promise.all(Array.from(entry.word).map(getCharacterData))
         .then(data => {
            $(elements[0]).children().remove();
            $(elements[1]).text(entry.pinyin);
            const suffix = entry.index ? `; radical ${entry.index}` : '';
            $(elements[2]).text(`${entry.definition}${suffix}`);
            new inkstone.Teach(data, elements[0], {...kOptions, listener});
         }).catch((x) => console.error(x));

const kList = Promise.all([
  getUrl('apps/media/nhsk1.list'),
  getUrl('apps/media/radicals.json'),
]).then(x => {
  const lines = x[0].trim().split('\n');
  const table = JSON.parse(x[1]).radical_to_index_map;
  return lines.map(y => {
    const data = y.split('\t');
    const index = table[data[0]];
    return {definition: data[4], index, pinyin: data[3], word: data[0]};
  });
});

window.onload = () => {
  const ids = ['demo-container', 'demo-prompt-1', 'demo-prompt-2'];
  kList.then(x => {
    const loop = runLoop(ids.map(getElementById), x);
    $(window).on('resize', () => loop(/*resize=*/true));
    loop();
  });
}
