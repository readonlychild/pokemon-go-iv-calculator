/* eslint-disable no-param-reassign */

const Levels = require('../json/levels');
const findMove = require('./roc/findMove');
const findPokemon = require('./findPokemon');
const getCP = require('./getCP');
const getHP = require('./getHP');
const getTypeEffectiveness = require('./getTypeEffectiveness');
const isLegendary = require('./isLegendary');
const parseIV = require('./parseIV');
const raid = require('./raid');
const weather = require('./weather');

const dodgeStrat = require('./roc/dodgeStrat.js');

// 300 seconds in ms.
const TIME_LIMIT = 300000;
// CPU's first attacks are every second.
const DEF_GYM_FIRST_ATTACKS = 1000;
// CPU attacks about every 2 seconds.
const DEF_GYM_ATTACK_TIME = 2000;
// Level 40.
const MAX_LEVEL = 40;

const ATK_DELAY = 700;
const DEF_DELAY = 1600;

// Reference
// https://pokemongo.gamepress.gg/damage-mechanics
function getDMG(
  move,
  weatherConditions,
  { player, opponent, atk, def, atkECpM, defECpM }
) {
  const stab =
    move.Type === (player.type1 || move.Type === player.type2) ? 1.2 : 1;
  const power = typeof move.Power !== 'undefined' ? move.Power : 0;
  const fxMul = getTypeEffectiveness(opponent, move);
  const weatherBonus = weather(weatherConditions || 'EXTREME', move.Type);

  return (
    Math.floor(
      0.5 *
        (atk * atkECpM) /
        (def * defECpM) *
        power *
        stab *
        fxMul *
        weatherBonus
    ) + 1
  );
}

function getDMGVs(obj) {
  return {
    quick: getDMG(obj.quick, obj.weather, obj),
    charge: getDMG(obj.charge, obj.weather, obj),
  };
}

// The player's state which keeps track of a player's running HP, Energy,
// how much damage they've dealt, and other information.
function createState(poke, timeCanAttackMs, totalDMG = 0) {
  const { quickMove, chargeMove } = poke;
  const cooldownQuick = quickMove.DurationMs - quickMove.DamageWindowStartMs;
  const cooldownCharge = chargeMove.DurationMs - chargeMove.DamageWindowStartMs;
  const chargeMoveLimit = Math.abs(chargeMove.Energy);
  const iv = parseIV(poke.iv || 0xfff);
  var xfac = poke.xfactor || 1;
  const fullHP = parseInt(getHP(poke.pokemon, iv.sta, Levels[poke.lvl || 40]) * xfac);

  return {
    chargeMove,
    chargeMoveLimit,
    cp: getCP(poke.pokemon, poke.iv || 0xfff, Levels[poke.lvl || 40]),
    cooldownCharge,
    cooldownQuick,
    energy: 0,
    fullHP,
    hp: fullHP,
    maxEnergy: 100,
    nextTurnMs: timeCanAttackMs - quickMove.DamageWindowStartMs,
    pokemon: poke,
    quickMove,
    totalDMG,
    turnCounter: 0,
    useCharge: false,
  };
}

function crushState(state) {
  const txtIV = state.pokemon.iv || 0xfff;
  const lvl = Number(state.pokemon.lvl) || 40;
  const iv = parseIV(txtIV);
  const { id } = state.pokemon.pokemon;
  const moveKeys = [
    state.pokemon.pokemon.moves.quick.indexOf(state.pokemon.quickMove.Name),
    state.pokemon.pokemon.moves.charge.indexOf(state.pokemon.chargeMove.Name)
  ];

  return {
    key: `${id}.${lvl}.${txtIV.toString(16)}.${moveKeys[0]}.${moveKeys[1]}`,
    id,
    name: state.pokemon.pokemon.name,
    lvl,
    iv: `${iv.atk}/${iv.def}/${iv.sta}`,
    moves: [state.pokemon.quickMove.Name, state.pokemon.chargeMove.Name],
    cp: state.cp,
    hp: state.fullHP,
    // dmg dealt is cummulative for a defender
    dmgDealt: state.totalDMG,
    // dmg taken is capped at your HP
    dmgTaken: Math.min(state.fullHP, state.fullHP - state.hp),
  };
}

// When an end-fight condition is met this function returns the result.
function getResult({
  AttackerState,
  DefenderState,
  log,
  timeLimit,
  timeRemaining,
  winner
}) {
  return {
    log,
    winner,
    timedOut: timeRemaining <= 0,
    timeElapsed: timeLimit - timeRemaining,
    timeRemaining,
    atk: crushState(AttackerState),
    def: crushState(DefenderState),
  };
}

function dodgeNothing(dmg) {
  return dmg;
}

function _log(log, type, team, monName, msg, dmg, timer, atkhp, atkenergy, defhp, defenergy, bonuses, move, atkFullHp, defFullHp, payload) {
  log.push({
    type: type, lbl: monName, msg: msg, dmg: dmg, timer: timer, team: team,
    a: { hp: atkhp, energy: atkenergy, fullhp: atkFullHp },
    d: { hp: defhp, energy: defenergy, fullhp: defFullHp },
    bonuses: bonuses,
    move: move,
    payload: payload
  });
}

// Applies the damage and adds the resulting event to the combat log
function hitAndLog({
  AttackerState,
  DefenderState,
  dodgeModifier,
  label,
  log,
  move,
  options,
  timeRemaining,
}) {

  var dmg = dodgeModifier(AttackerState, DefenderState, move); // move.Damage;
  if (!dmg) {
    dmg = 0;
    DefenderState.nextTurnMs -= (DefenderState.cooldownQuick + DefenderState.quickMove.DamageWindowStartMs);
    console.log('dodge time penalty:', (DefenderState.cooldownQuick + DefenderState.quickMove.DamageWindowStartMs), DefenderState.cooldownQuick, DefenderState.quickMove.DamageWindowStartMs);
  }
  const dmgDealt = DefenderState.hp - dmg > 0 ? dmg : DefenderState.hp;

  var favorDefender = false;
  // On odd turns and where the dmg is odd we'll +1 the energy gains
  // because defenders gain 1 energy for every -2hp
  var plusOneEnergy = 0;
  if (favorDefender) {
    plusOneEnergy = dmg % 2 === 1 && AttackerState.turnCounter % 2 === 1 ? 1 : 0;
  }
  const defEnergyGain = Math.floor(dmgDealt / 2) + plusOneEnergy;

  AttackerState.totalDMG += dmgDealt;
  AttackerState.energy = Math.min(
    AttackerState.maxEnergy,
    AttackerState.energy + move.Energy
  );

  DefenderState.energy = Math.min(
    DefenderState.maxEnergy,
    DefenderState.energy + defEnergyGain
  );
  DefenderState.hp -= dmgDealt;

  _log(log, 'strike', label, AttackerState.pokemon.pokemon.name, `${move.Name}`, dmgDealt,
    timeRemaining, 
    AttackerState.hp, AttackerState.energy, 
    DefenderState.hp, DefenderState.energy,
    [],
    move,
    AttackerState.fullHP,
    DefenderState.fullHP
  );
}

// Determines if a Player should attack or not then performs the attack that
// it has been instructed to land. If the Defending Player's Pokemon loses all
// HP then the result is returned.
function landAttack({
  AttackerState,
  DefenderState,
  dmg,
  dodgeStrategy,
  label,
  log,
  options,
  timeRemaining,
}) {
  const dodgeModifier = dodgeStrategy || dodgeNothing;
  const shouldAttack = timeRemaining === AttackerState.nextTurnMs;

  if (shouldAttack) {
    const quickAttack = {
      Name: AttackerState.quickMove.Name,
      Damage: dmg.quick,
      Energy: AttackerState.quickMove.Energy,
      Type: AttackerState.quickMove.Type
    };
    const chargeAttack = {
      Name: AttackerState.chargeMove.Name,
      Damage: dmg.charge,
      Energy: AttackerState.chargeMove.Energy,
      Type: AttackerState.chargeMove.Type
    };

    // Perform the DMG and add it to the combat log
    hitAndLog({
      AttackerState,
      DefenderState,
      dodgeModifier,
      label,
      log,
      move: AttackerState.useCharge ? chargeAttack : quickAttack,
      options,
      timeRemaining,
    });

    // Win condition
    if (DefenderState.hp <= 0) {
      return { ko: true };
    }

    // Increment the turn counter which is used by the defender to know
    // whether or not they'll use their charge move
    AttackerState.turnCounter += 1;
    return { ms: 0 };
  }

  return null;
}

function setAttackerNextTurn(state, timeRemaining, extraMs = 0, options) {
  // Set the attacker's intention to use a charge move next turn.
  // give a 75% change to use the charge move
  var useChargeProbability = Math.random();
  if (useChargeProbability > 0.75) {
    useChargeProbability = false;
  }
  state.useCharge = state.energy >= state.chargeMoveLimit && useChargeProbability;

  if (options.log) {
    if (state.useCharge) {
      _log(options.log, 'charge_move', '', state.pokemon.pokemon.name, 'charging next attack...', 0, timeRemaining, 0, 0, 0, 0, [], state.chargeMove, 0, 0);
    }
  }
  if (state.useCharge && options.defenderState) {
    //console.log('holdChargeOn', state.pokemon.holdChargeOn);
    // Logic: hold-off on using chargeMove depending on opponent current HP
    if (state.pokemon.holdChargeOn) {
      var defenderHpPercentage = ((options.defenderState.hp)/options.defenderState.fullHP) *100;
      if (defenderHpPercentage <= state.pokemon.holdChargeOn) {
        state.useCharge = false;
        console.log('CHARGE_MOVE CONTAINED...', defenderHpPercentage, state.pokemon.holdChargeOn, state.pokemon.pokemon.name);
      }
    }
  }

  state.nextTurnMs = state.useCharge
    ? timeRemaining -
      state.chargeMove.DamageWindowStartMs -
      state.cooldownCharge -
      extraMs
    : timeRemaining -
      state.quickMove.DamageWindowStartMs -
      state.cooldownQuick -
      extraMs;
}

function setDefenderNextTurn(DefenderState, timeRemaining, extraMs = 0) {
  // Set the defender's intention to use a charge move next turn
  var useChargeProbability = Math.random();
  if (useChargeProbability > 0.5) {
    useChargeProbability = false;
  }
  DefenderState.useCharge =
    DefenderState.energy >= DefenderState.chargeMoveLimit &&
    useChargeProbability;

  // The defender attacks every 2 seconds except for the first two turns
  // where it attacks each second.
  if (DefenderState.turnCounter < 2) {
    DefenderState.nextTurnMs = DefenderState.useCharge
      ? timeRemaining - DEF_GYM_FIRST_ATTACKS - extraMs
      : timeRemaining - DEF_GYM_FIRST_ATTACKS - extraMs;
  } else {
    DefenderState.nextTurnMs = DefenderState.useCharge
      ? timeRemaining -
        DefenderState.chargeMove.DamageWindowStartMs -
        DefenderState.cooldownCharge -
        DEF_GYM_ATTACK_TIME -
        extraMs
      : timeRemaining -
        DefenderState.quickMove.DamageWindowStartMs -
        DefenderState.cooldownQuick -
        DEF_GYM_ATTACK_TIME -
        extraMs;
  }
}

function mutateFromKey(poke) {
  const { key } = poke;

  const [id, lvl, iv, quickId, chargeId] = key.split('.');

  poke.pokemon = findPokemon(id);
  poke.quickMove = findMove(poke.pokemon.moves.quick[quickId]);
  poke.chargeMove = findMove(poke.pokemon.moves.charge[chargeId]);
  poke.lvl = lvl;
  poke.iv = parseInt(iv, 16);
}

// Reference
// https://pokemongo.gamepress.gg/gym-combat-mechanics
function simulateBattle(pokeAtkAry, pokeDefAry, options) {
  // init pokemon
  // attackers
  pokeAtkAry.forEach((pokeAtk) => {
    pokeAtk.dodgeStat = pokeAtk.dodgeStat || 0;
    if (!pokeAtk.pokemon) {
      pokeAtk.pokemon = findPokemon(pokeAtk.name);
    }
    if (!pokeAtk.quickMove) {
      pokeAtk.quickMove = findMove(pokeAtk.move1);
    }
    if (!pokeAtk.chargeMove) {
      pokeAtk.chargeMove = findMove(pokeAtk.move2);
    }
    console.log('ATKR', pokeAtk.name, pokeAtk.quickMove.Name, pokeAtk.chargeMove.Name);
  });
  // defenders
  pokeDefAry.forEach((pokeDef) => {
    pokeDef.dodgeStat = pokeDef.dodgeStat || 0;
    if (!pokeDef.pokemon) {
      pokeDef.pokemon = findPokemon(pokeDef.name);
    }
    if (!pokeDef.quickMove) {
      pokeDef.quickMove = findMove(pokeDef.move1);
    }
    if (!pokeDef.chargeMove) {
      pokeDef.chargeMove = findMove(pokeDef.move2);
    }
    console.log('DEFR', pokeDef.name, pokeDef.quickMove.Name, pokeDef.chargeMove.Name);
  });

  // track which pokemon is active for each team
  var attackerIdx = 0;
  var defenderIdx = 0;

  const log = [];

  const timeLimit = options.timeLimit || TIME_LIMIT;
  let timeRemaining = timeLimit;

  var AttackerState = createState(pokeAtkAry[attackerIdx], timeLimit - ATK_DELAY);
  var DefenderState = createState(pokeDefAry[defenderIdx], timeLimit - ATK_DELAY);

  var atkTypes = '';
  var defTypes = '';

  while (attackerIdx < pokeAtkAry.length || defenderIdx < pokeDefAry.length) {
    var pokeAtk = pokeAtkAry[attackerIdx];
    var pokeDef = pokeDefAry[defenderIdx];
    //console.log(JSON.stringify(pokeAtk, null, 2));

    atkTypes = `#type:${pokeAtk.pokemon.type1}#`;
    if (pokeAtk.pokemon.type2) {
      atkTypes += `#type:${pokeAtk.pokemon.type2}#`
    }
    defTypes = `#type:${pokeDef.pokemon.type1}#`;
    if (pokeDef.pokemon.type2) {
      defTypes += `#type:${pokeDef.pokemon.type2}#`
    }
    
    //  log,  type, team, monName, msg,                                                                                  dmg, timer,        atkhp,      atkenergy,defhp,    defenergy, bonuses, move,  atkFullHp,            defFullHp,            payload
    _log(log, 'info', '', '', `Match|${pokeAtk.name.toUpperCase()} ${atkTypes}|${defTypes} ${pokeDef.name.toUpperCase()}`, 0, timeRemaining, AttackerState.hp, 0, DefenderState.hp, 0, [],      false, AttackerState.fullHP, DefenderState.fullHP, { aid:AttackerState.pokemon.pokemon.id, did:DefenderState.pokemon.pokemon.id, aname: AttackerState.pokemon.pokemon.name, dname: DefenderState.pokemon.pokemon.name });

    var outcome = _encounter(pokeAtk, pokeDef, AttackerState, DefenderState, timeRemaining, log, options);
    timeRemaining = outcome.timeRemaining;

    //  log,  type, team, monName, msg,                                                                                  dmg, timer,        atkhp,      atkenergy,defhp,    defenergy, bonuses, move,  atkFullHp,            defFullHp,            payload
    _log(log, 'info2', '', '', `Match|${pokeAtk.name.toUpperCase()} ${atkTypes}|${defTypes} ${pokeDef.name.toUpperCase()}`, 0, timeRemaining, AttackerState.hp, 0, DefenderState.hp, 0, [],      false, AttackerState.fullHP, DefenderState.fullHP, { aid:AttackerState.pokemon.pokemon.id, did:DefenderState.pokemon.pokemon.id, aname: AttackerState.pokemon.pokemon.name, dname: DefenderState.pokemon.pokemon.name, asprite: AttackerState.pokemon.sprite || '0', dsprite: DefenderState.pokemon.sprite || '0' });

    if (outcome.winner === 'atk') {
      var faintedPoke = pokeDef.name.toUpperCase();
      //_log(log, '@faints', 'def', pokeDef.name, 'faints', 0, outcome.timeRemaining, 0, 0, 0, 0, []);
      defenderIdx += 1;
      if (defenderIdx === pokeDefAry.length) break;
      _log(log, 'switch', 'def', faintedPoke, faintedPoke + ' faints. ', 0, outcome.timeRemaining, 0, 0, 0, 0, []);
      DefenderState = createState(pokeDefAry[defenderIdx], outcome.timeRemaining - ATK_DELAY);
    }
    if (outcome.winner === 'def') {
      var faintedPoke = pokeAtk.name.toUpperCase();
      //_log(log, '@faints', 'atk', pokeAtk.name, 'faints', 0, outcome.timeRemaining, 0, 0, 0, 0, []);
      attackerIdx += 1;
      if (attackerIdx === pokeAtkAry.length) break;
      _log(log, 'switch', 'atk', faintedPoke, faintedPoke + ' faints. ', 0, outcome.timeRemaining, 0, 0, 0, 0, []);
      AttackerState = createState(pokeAtkAry[attackerIdx], outcome.timeRemaining - ATK_DELAY);
    }

  }

  var w = 'Attacker';
  var attackerLiveMons = pokeAtkAry.length - attackerIdx +0;
  var defenderLiveMons = pokeDefAry.length - defenderIdx +0;
  //if (attackerIdx > defenderIdx) w = 'Defender';
  /*
  if (defenderIdx === pokeDefAry.length) {
    if (attackerIdx < pokeAtkAry.length) {
      w = 'Attacker';
    }
  }
  */
  if (attackerLiveMons === 0) w = 'Defender';

  return {
    log,
    winner: w,
    timeLimit: timeLimit,
    timeRemaining: timeRemaining,
    attackerIdx: attackerIdx,
    defenderIdx: defenderIdx
  };

}

function _encounter(pokeAtk, pokeDef, AttackerState, DefenderState, timeRemaining, log, options) {

  var timeLimit = options.timeLimit || TIME_LIMIT;

  const atkECpM = Levels[pokeAtk.lvl || MAX_LEVEL];
  const defECpM = Levels[pokeDef.lvl || MAX_LEVEL];

  const atkIV = parseIV(pokeAtk.iv);
  const defIV = parseIV(pokeDef.iv);

  const atkDMG = getDMGVs({
    player: pokeAtk.pokemon,
    atk: pokeAtk.pokemon.stats.attack + atkIV.atk,
    atkECpM,

    opponent: pokeDef.pokemon,
    def: pokeDef.pokemon.stats.defense + defIV.def,
    defECpM,

    quick: pokeAtk.quickMove,
    charge: pokeAtk.chargeMove,

    weather: options.weather
  });

  const defDMG = getDMGVs({
    player: pokeDef.pokemon,
    atk: pokeDef.pokemon.stats.attack + defIV.atk,
    atkECpM: defECpM,

    opponent: pokeAtk.pokemon,
    def: pokeAtk.pokemon.stats.defense + atkIV.def,
    defECpM: atkECpM,

    quick: pokeDef.quickMove,
    charge: pokeDef.chargeMove,

    weather: options.weather
  });


  // Simulate the battle!
  for (timeRemaining; timeRemaining > 0; timeRemaining -= 10) {
    // Attacking Player goes first.
    const winAtk = landAttack({
      AttackerState,
      DefenderState,
      dmg: atkDMG,
      dodgeStrategy: dodgeStrat,
      label: 'atk',
      log,
      options,
      timeLimit,
      timeRemaining
    });

    if (winAtk) {
      setAttackerNextTurn(AttackerState, timeRemaining, winAtk.ms, { log: log, defenderState: DefenderState });
      if (winAtk.ko) {
        return getResult({
          AttackerState,
          DefenderState,
          log,
          timeLimit,
          timeRemaining,
          winner: 'atk'
        });
      }

    }

    // Defending Player goes next.
    const winDef = landAttack({
      // Flipped here because the Defender is attacking the Attacker.
      AttackerState: DefenderState,
      DefenderState: AttackerState,
      dmg: defDMG,
      dodgeStrategy: dodgeStrat,
      label: 'def',
      log,
      options,
      timeLimit,
      timeRemaining
    });

    if (winDef) {
      setAttackerNextTurn(DefenderState, timeRemaining, winDef.ms, { log: log, defenderState: AttackerState });
      if (winDef.ko) {
        return getResult({
          AttackerState,
          DefenderState,
          log,
          timeLimit,
          timeRemaining,
          winner: 'def'
        });
      }

    }
  }

  _log(log, '@TIME_OUT', 'Battle', 'Time has ran out.', 0, 0, 0, 0, 0, 0, []);
  
  // The battle timed out :(
  return getResult({
    AttackerState,
    DefenderState,
    log,
    timeLimit,
    timeRemaining,
    winner: 'def'
  });

};

module.exports = simulateBattle;
