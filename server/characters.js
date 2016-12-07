const child_process = Npm.require('child_process');
const fs = Npm.require('fs');
const readline = Npm.require('readline');

import {CharacterData, assetForCharacter} from '/lib/base';
import {Decomposition} from '/lib/decomposition';

const kBase = process.env.PWD;
const kDelimiter = 'BREAK';
const kExcludedAssets = `${kBase}/.assets`;
const kIncludedAssets = `${kBase}/cordova-build-override/www/assets`;

const augmentRows = (all, rows) => {
  for (let character of all) {
    const row = rows[character];
    row.dependencies = {};
    Array.from(row.decomposition).map((x) => {
      if (Decomposition.ids_data[x] || x === '？') return;
      const data = rows[x];
      if (!data) throw new Error(`Missing component of ${character}: ${x}\n` +
                                 JSON.stringify(row));
      let value = data.definition || '(unknown)';
      if (data.pinyin.length > 0) {
        value = data.pinyin.join(', ') + ' - ' + value;
      }
      row.dependencies[x] = value;
    });
    row.components = row.strokes.map(
        (x, i) => computeComponents(character, i, rows));
  }
}

const computeComponents = (character, index, rows, result) => {
  result = result || {};
  result[character] = index;
  const data = rows[character];
  if (!data) throw new Error(`Computing component for ${character}.`);
  const match = data.matches[index];
  if (!match) return result;

  // Walk the path down the decomposition tree to find the component.
  let node = Decomposition.convertDecompositionToTree(data.decomposition);
  for (let i of match) {
    if (!node.children) {
      node = null;
      break;
    }
    node = node.children[i];
  }
  if (!node || node.type !== 'character' || !rows[node.value]) {
    throw new Error(`Error matching component for ${character}, ${index}:\n` +
                    `Final node: ${JSON.stringify(node)}\n` +
                    JSON.stringify(data));
  }

  // Determine what index we are into that component.
  let child_index = 0;
  for (let i = 0; i < index; i++) {
    if (JSON.stringify(data.matches[i]) === JSON.stringify(match)) {
      child_index += 1;
    }
  }
  return computeComponents(node.value, child_index, rows, result);
}

const dumpCharacters = (all, rows) => {
  const assets = [];
  const contents = {};
  for (let character of all) {
    const asset = assetForCharacter(character);
    if (!contents[asset]) {
      assets.push(asset);
      contents[asset] = [];
    }
    contents[asset].push(rows[character]);
  }
  for (let asset of assets) {
    const filename = `${kExcludedAssets}/${asset}`;
    fs.writeFileSync(filename, contents[asset].map(JSON.stringify).join('\n'));
  }
  fs.writeFileSync(`${kIncludedAssets}/characters.txt`, all.join('\n'));
}

const parseLine = (line, delimiter) => {
  const pieces = line.trim().split(delimiter)
  if (pieces.length !== 2) throw new Error(line);
  const row = JSON.parse(pieces[0]);
  const row2 = JSON.parse(pieces[1]);
  if (!row.character) throw new Error(line);
  if (row.character !== row2.character) throw new Error(line);
  for (let key in row2) {
    row[key] = row2[key];
  }
  delete row.normalized_medians;
  return row;
}

const rebuildCharacterData = () => {
  // TODO(skishore): This whole function is a terrible hack! Clean it up.

  // Combine each line of the dictionary.txt and graphics.txt files.
  const spacers = [];
  Array.from(kDelimiter).slice(1).map((x) => spacers.push('/dev/null'));
  const spacer = spacers.join(' ');
  console.log('Preparing...');
  child_process.execSync(
      `paste -d ${kDelimiter} ../makemeahanzi/dictionary.txt ` +
      `${spacer} ../makemeahanzi/graphics.txt > makemeahanzi.txt`,
      {cwd: kBase});

  // Read in the combined-file line-by-line into memory.
  console.log('Reading...');
  const input = fs.createReadStream(`${kBase}/makemeahanzi.txt`);
  const reader = readline.createInterface({input: input});
  const rows = {};
  const all = [];
  reader.on('line', (line) => {
    const row = parseLine(line, kDelimiter);
    rows[row.character] = row;
    all.push(row.character);
  });

  // Add a few more fields to the character data, then write them to disk.
  reader.on('close', () => {
    console.log('Augmenting...');
    augmentRows(all, rows);
    all.map((character) => check(rows[character], CharacterData));
    console.log('Dumping...');
    child_process.execSync('mkdir -p .assets', {cwd: kBase});
    child_process.execSync('mkdir -p .assets/characters', {cwd: kBase});
    dumpCharacters(all, rows);
    console.log('Cleaning up...');
    child_process.execSync('rm makemeahanzi.txt', {cwd: kBase});
    console.log('Done!');
  });
}

Meteor.methods({rebuildCharacterData, rebuildCharacterData});
