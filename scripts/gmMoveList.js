const GameMaster = require('./GameMaster');

const prettyWrite = require('./prettyWrite');
const done = require('./done');

function type(t) {
  return t ? t.replace('POKEMON_TYPE_', '') : null;
}

GameMaster.then(data => {
  var d = {};
  data.itemTemplates
    .filter(x => x.hasOwnProperty('moveSettings'))
    .forEach(({ moveSettings }) => {
      d[moveSettings.movementId] = 1;
    });
  prettyWrite('./json/moveList.json', d);
  done('Pokemon');
});
