const realFindMove = require('./../findMove');
const scoreSort = require('./../scoreSort');

function identity(x) {
  return x;
}

function findMove(name) {
  var mv = realFindMove(name);
  if (mv) {
    return mv;
  }
  var other_moves = {
    "BURRITO_SLAP": {
      "Name": "BURRITO_SLAP",
      "Type": "ROCK",
      "Power": 500,
      "DurationMs": 3300,
      "Energy": -50,
      "DamageWindowStartMs": 2750,
      "DamageWindowEndMs": 3200
    },
    "SNACK_ATTACK": {
      "Name": "AWKRD_SNACK_ATTK",
      "Type": "DARK",
      "Power": 200,
      "DurationMs": 3300,
      "Energy": -100,
      "DamageWindowStartMs": 2750,
      "DamageWindowEndMs": 3200
    }
  };
  var moveNames = Object.keys(other_moves);
  var moveName = name.toUpperCase().replace(/[- ]/g, '_');
  if (other_moves[moveName.toUpperCase()]) {
    return other_moves[moveName.toUpperCase()];
  }
  var moveNameGuess = scoreSort(moveNames)(moveName, identity);
  if (moveNameGuess) {
    return other_moves[moveNameGuess];
  }

  return null;
}

module.exports = findMove;
