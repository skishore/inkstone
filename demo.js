const kDemoWord = '你好';

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
  listener: (x) => console.log(x),
  messages: {
    again: 'Again!',
    should_hook: 'Should hook.',
    stroke_backward: 'Stroke backward.',
  },
  modes: [
    {
      repeat: 2,
      watermark: 1,
      demo: 0,
      single_tap: 2,
      double_tap: 2,
      max_mistakes: 4,
    }, {
      repeat: 2,
      watermark: 2,
      demo: 2,
      single_tap: Infinity,
      double_tap: Infinity,
      max_mistakes: Infinity,
    },
  ],
};

// Takes a Chinese character and returns a Promise that will resolve to the
// data for that to that character. This method may be replaced by other
// asset-loading mechanisms in real deployments of this library.
const getCharacterData = (character) => {
  const asset = `assets/${Math.floor(character.charCodeAt(0) / 256)}`;
  return getUrl(asset).then((data) => {
    for (const line of data.trim().split('\n')) {
      const row = JSON.parse(line);
      if (row.character === character) return row;
    }
    throw new Error(`Unable to find character data for ${character}.`);
  });
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

window.onload = () => {
  const header = document.getElementById('header');
  if (!header) throw Error('Unable to find #header element.');
  header.innerText = 'Write hello (nĭhăo) below:';
  const element = document.getElementById('demo');
  if (!element) throw Error('Unable to find #demo element.');
  Promise.all(Array.from(kDemoWord).map(getCharacterData))
         .then((data) => new inkstone.Teach(data, element, kOptions))
         .catch((x) => console.error(x));
}
