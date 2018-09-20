const GameMaster = require('./GameMaster');

const prettyWrite = require('./prettyWrite');
const done = require('./done');

function type(t) {
  return t ? t.replace('POKEMON_TYPE_', '') : null;
}

function dedupe(name, moves) {
  if (name !== 'MEW') return moves;
  return Array.from(new Set(moves));
}

GameMaster.then(data => {
  var d = {};
  const Pokemon = data.itemTemplates
    .filter(x => x.hasOwnProperty('pokemonSettings'))
    .map(({ pokemonSettings }, i) => {
      var did = pokemonSettings.form ? pokemonSettings.form : pokemonSettings.pokemonId;
      var k = i;
      if (i > 132) k = i - 36;
      if (k > 352) k -= 4;
      d[did] = (k+1) + '';
    });
    console.log(d);
  prettyWrite('./json/pokemonList.json', d);
  done('Pokemon');
});
