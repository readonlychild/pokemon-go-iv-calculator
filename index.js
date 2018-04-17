// Check out:
//
// breakpoint
// calculateIV
// simulateBattle
// typeRankings
//
// require('pokemagic/simulateBattle');
/*
throw new Error(
  'This module is not meant to be required directly. For a list of modules take a look at this file.'
);
*/

const simulateBattle = require('./simulateBattle');

var attackers = [
  {
    iv: '0xaaa',
    lvl: 35,
    name: 'rhydon',
    move1: 'rock smash',
    move2: 'megahorn'
  },
  {
    iv: '0xaaa',
    lvl: 35,
    name: 'tyranitar',
    move1: 'bite',
    move2: 'crunch'
  },
  {
    iv: '0xaaa',
    lvl: 35,
    name: 'arcanine',
    move1: 'fire fang',
    move2: 'wild charge'
  },
  {
    iv: '0xaaa',
    lvl: 35,
    name: 'vaporeon',
    move1: 'water gun',
    move2: 'aqua tail'
  },
  {
    iv: '0xaaa',
    lvl: 35,
    name: 'dragonite',
    move1: 'steel wing',
    move2: 'outrage'
  },
  {
    iv: '0xaaa',
    lvl: 35,
    name: 'gyarados',
    move1: 'bite',
    move2: 'outrage'
  }
];

var defenders = [
  {
    iv: '0xaaa',
    lvl: 35,
    name: 'steelix',
    move1: 'dragon tail',
    move2: 'crunch'
  },
  {
    iv: '0xaaa',
    lvl: 35,
    name: 'heracross',
    move1: 'struggle bug',
    move2: 'megahorn'
  },
  {
    iv: '0xaaa',
    lvl: 35,
    name: 'rhydon',
    move1: 'rock smash',
    move2: 'stone edge'
  },
  {
    iv: '0xaaa',
    lvl: 35,
    name: 'slowbro',
    move1: 'water gun',
    move2: 'psychic'
  },
  {
    iv: '0xaaa',
    lvl: 35,
    name: 'ursaring',
    move1: 'counter',
    move2: 'close combat'
  },
  {
    iv: '0xaaa',
    lvl: 35,
    name: 'shuckle',
    move1: 'struggle bug',
    move2: 'gyro ball'
  }
];

var battleOptions = {
  pvp: true,
  raid: null,
  weather: 'EXTREME'
};

function pad (text, length) {
  var t = text || '';
  t = t.toString();
  while (t.length < length) {
    t += ' ';
  }
  return t;
};
function lpad (text, length) {
  var t = text || '';
  t = t.toString();
  while (t.length < length) {
    t = ' ' + t;
  }
  return t;
};
function getHpColor (hp, fullhp) {
  var c = '#595';
  var p = hp / fullhp;
  if (p <= 0.5) c = '#bb0';
  if (p <= 0.25) c = '#c00;'
  return c;
};
function getHpColorFaded (hp, fullhp) {
  var c = '#ada';
  var p = hp / fullhp;
  if (p <= 0.5) c = '#dd6';
  if (p <= 0.25) c = '#f66;'
  return c;
};

var outcome = simulateBattle(attackers, defenders, battleOptions);
var iconbase = './../../bitbucket/discord-bot/assets/battle/24/';
var markup = ['<html>'];
markup.push('<head>');
markup.push('<title>Battle Log</title>');
markup.push('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.7/css/bootstrap.min.css" />');
markup.push('<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css" />');
markup.push('<style>');
markup.push('body, * { box-sizing:border-box; font-family:arial; font-size:9pt; } td { padding:6px 8px; border-bottom:1px solid #ccc; white-space:nowrap; } td div { display:inline-block; } td img { vertical-align:middle; } ');
markup.push('.smaller { font-size:.8em; padding:6px 1px; } ');
markup.push('thead td { text-align:center; font-size:8pt; font-weight:bold; background:#999; color:#fff; border-right:1px solid #fff; }');
markup.push('thead td.last { border-right:0px; }');
markup.push('tr.atk { background:#fff; } tr.def { background:#eee; } tr.switch { background:#bbb; } tr.info { background:#cdf; } ');
markup.push('</style>');
markup.push('</head>');
markup.push('<body>');
markup.push('<table cellspacing="0">');
markup.push('<thead>');
markup.push('<tr>');
markup.push('<td></td><td><i class="fa fa-clock-o"></i></td><td></td><td>mon</td><td colspan="2">Move (dmg)</td><td></td><td colspan="2">Attacker HP</td><td colspan="2">Attacker Energy</td><td colspan="2">Defender HP</td><td colspan="2" class="last">Defender Energy</td>');
markup.push('</tr>');
markup.push('</thead>');
markup.push('<tbody>');
outcome.log.forEach((entry) => {
  if (entry.type === 'strike') {
    var isFast = entry.move.Name.indexOf('_FAST') > 0;
    entry.move.Name = entry.move.Name.replace(/_FAST/g, '');
    //console.log(JSON.stringify(entry, null, 2));
  }
  var teamIcon = '<i class="fa fa-chevron-circle-right"></i>';
  if (entry.team === 'def') {
    teamIcon = '<i class="fa fa-angle-left"></i>';
  }
  console.log(`${pad(entry.type, 10)} | ${pad(entry.lbl, 13)} | ${lpad(entry.timer, 9)} | ${pad(entry.team, 5)} | ${lpad(entry.dmg, 4)} | ${lpad(entry.a.hp, 4)} | ${lpad(entry.energy, 4)} | ${entry.msg} | `);
  var tr = `<tr class="${entry.team} ${entry.type}">`;
  if (entry.type === 'strike') {
    tr += `<td><img src='${iconbase}strike.png' /></td>`;
    tr += `<td align="right">${entry.timer}</td>`;
    tr += `<td>${teamIcon}</td>`;
    tr += `<td>${entry.lbl}</td>`;
    tr += `<td><img src='${iconbase}../../types/c-${entry.move.Type}.png' /></td>`;
    tr += `<td>${entry.move.Name} (<b>${entry.dmg}</b>)</td>`;
    //tr += `<td align="right">${entry.dmg}</td>`;
    tr += `<td>${isFast ? `<img src='${iconbase}fast.png' />` : `<img src='${iconbase}charge.png' />`}</td>`;
    if (entry.team === 'atk') {
      var atkcol = getHpColorFaded(entry.a.hp, entry.a.fullhp);
      var defcol = getHpColor(entry.d.hp, entry.d.fullhp);
      tr += `<td align="right" class="smaller">${entry.a.hp}</td>`;
      tr += `<td><div style="height:4px; background:${atkcol}; width:${entry.a.hp}px;"></div></td>`;
      tr += `<td align="right" class="smaller">${entry.a.energy}</td>`;
      tr += `<td><div style="height:4px; background:#78a; width:${entry.a.energy/2 || 0}px;"></div></td>`;
      tr += `<td align="right" class="smaller">${entry.d.hp}</td>`;
      tr += `<td><div style="height:8px; background:${defcol}; width:${entry.d.hp}px;"></div><div style="height:8px; background:#f72; width:${entry.dmg}px;"></div></td>`;
      tr += `<td align="right" class="smaller">${entry.d.energy}</td>`;
      tr += `<td><div style="height:4px; background:#78a; width:${entry.d.energy/2 || 0}px;"></div></td>`;
    }
    if (entry.team === 'def') {
      var atkcol = getHpColorFaded(entry.a.hp, entry.a.fullhp);
      var defcol = getHpColor(entry.d.hp, entry.d.fullhp);
      tr += `<td align="right" class="smaller">${entry.d.hp}</td>`;
      tr += `<td><div style="height:8px; background:${defcol}; width:${entry.d.hp}px;"></div><div style="height:8px; background:#f72; width:${entry.dmg}px;"></div></td>`;
      tr += `<td align="right" class="smaller">${entry.d.energy}</td>`;
      tr += `<td><div style="height:4px; background:#78a; width:${entry.d.energy/2 || 0}px;"></div></td>`;
      tr += `<td align="right" class="smaller">${entry.a.hp}</td>`;
      tr += `<td><div style="height:4px; background:${atkcol}; width:${entry.a.hp}px;"></div></td>`;
      tr += `<td align="right" class="smaller">${entry.a.energy}</td>`;
      tr += `<td><div style="height:4px; background:#78a; width:${entry.a.energy/2 || 0}px;"></div></td>`;
    }
  }
  
  if (entry.type === 'info') {
    var m = entry.msg.split('|');
    tr += `<td><img src='${iconbase}info.png' /></td>`;
    tr += `<td align="right">${entry.timer}</td>`;
    tr += `<td colspan="5">${m[0]}</td>`;
    tr += `<td colspan="4" align="center">${m[1]} <i class="fa fa-chevron-right"></i></td>`;
    tr += `<td colspan="4" align="center"><i class="fa fa-chevron-left"></i> ${m[2]}</td>`;
  }
  if (entry.type === 'switch') {
    tr += `<td><img src='${iconbase}faint.png' /></td>`;
    tr += `<td align="right">${entry.timer}</td>`;
    tr += `<td>${entry.team}</td>`;
    tr += `<td colspan="99">${entry.msg}</td>`;
  }
  tr += '</tr>';
  markup.push(tr);
  //console.log(JSON.stringify(entry));
});
markup.push('</tbody>');
markup.push('</table>');
markup.push('</body>');
markup.push('</html>');
outcome.log = false;
console.log(JSON.stringify(outcome, null, 2));

markup = markup.join('\n');
markup = markup.replace(/#type:BUG#/g, `<img src="${iconbase}../../types/c-bug.png" />`);
markup = markup.replace(/#type:DARK#/g, `<img src="${iconbase}../../types/c-dark.png" />`);
markup = markup.replace(/#type:DRAGON#/g, `<img src="${iconbase}../../types/c-dragon.png" />`);
markup = markup.replace(/#type:ELECTRIC#/g, `<img src="${iconbase}../../types/c-electric.png" />`);
markup = markup.replace(/#type:FAIRY#/g, `<img src="${iconbase}../../types/c-fairy.png" />`);
markup = markup.replace(/#type:FIGHTING#/g, `<img src="${iconbase}../../types/c-fighting.png" />`);
markup = markup.replace(/#type:FIRE#/g, `<img src="${iconbase}../../types/c-fire.png" />`);
markup = markup.replace(/#type:FLYING#/g, `<img src="${iconbase}../../types/c-flying.png" />`);
markup = markup.replace(/#type:GROUND#/g, `<img src="${iconbase}../../types/c-ground.png" />`);
markup = markup.replace(/#type:GHOST#/g, `<img src="${iconbase}../../types/c-ghost.png" />`);
markup = markup.replace(/#type:GRASS#/g, `<img src="${iconbase}../../types/c-grass.png" />`);
markup = markup.replace(/#type:ICE#/g, `<img src="${iconbase}../../types/c-ice.png" />`);
markup = markup.replace(/#type:NORMAL#/g, `<img src="${iconbase}../../types/c-normal.png" />`);
markup = markup.replace(/#type:POISON#/g, `<img src="${iconbase}../../types/c-poison.png" />`);
markup = markup.replace(/#type:PSYCHIC#/g, `<img src="${iconbase}../../types/c-psychic.png" />`);
markup = markup.replace(/#type:ROCK#/g, `<img src="${iconbase}../../types/c-rock.png" />`);
markup = markup.replace(/#type:STEEL#/g, `<img src="${iconbase}../../types/c-steel.png" />`);
markup = markup.replace(/#type:WATER#/g, `<img src="${iconbase}../../types/c-water.png" />`);

const fs = require('fs');
fs.writeFileSync('./log.html', markup);

