const kDemoWord = '你好';

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
  const element = document.getElementById('demo');
  if (!element) throw Error('Unable to find #demo element.');
  Promise.all(Array.from(kDemoWord).map(getCharacterData)).then((data) => {
    const handwriting = new inkstone.Handwriting(element);
    const matcher = new inkstone.Matcher(data[0]);
  }).catch((x) => console.error(x));
}
