function rollDice() {
  var n = Math.floor(Math.random() * 6 + 1);
  if (n === 7) n = 6;
  return n;
}

function /* int damage */ dodgeStrat(AttackerState, DefenderState, move) {
  var defenderDodges = false;
  var dice = rollDice();
  // console.log('diceRoll', dice, DefenderState.pokemon.dodgeStat);
  if (DefenderState.pokemon.dodgeStat >= dice) {
    defenderDodges = true;
    if (Math.random() > 0.5) {
      defenderDodges = false;
    }
  }
  return defenderDodges ? 0 : move.Damage;
};

module.exports = dodgeStrat;
