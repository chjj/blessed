var fs = require('fs')
  , blessed = require('../')
  , unicode = blessed.unicode;

var screen = blessed.screen({
  dump: __dirname + '/logs/unicode.log',
  smartCSR: true,
  dockBorders: true,
  useBCE: true,
  fullUnicode: ~process.argv.indexOf('-') ? false : true,
  warnings: true
});

/**
 * Unicode Characters
 */

// var DU = '杜';
var DU = unicode.fromCodePoint(0x675C);

// var JUAN = '鹃';
var JUAN = unicode.fromCodePoint(0x9E43);

// one flew over the 杜鹃's nest.
// var DOUBLE = '杜鹃';
var DOUBLE = DU + JUAN;

// var SURROGATE_DOUBLE = '𰀀';
// var SURROGATE_DOUBLE = String.fromCharCode(0xD880, 0xDC00);
// var SURROGATE_DOUBLE = unicode.fromCodePoint(0x30000);

// var SURROGATE_DOUBLE = '𠀀';
// var SURROGATE_DOUBLE = String.fromCharCode(0xd840, 0xdc00);
var SURROGATE_DOUBLE = unicode.fromCodePoint(0x20000);

// var SURROGATE_DOUBLE = '🉐';
// var SURROGATE_DOUBLE = String.fromCharCode(0xD83C, 0xDE50);
// var SURROGATE_DOUBLE = unicode.fromCodePoint(0x1F250);

// var SURROGATE_SINGLE = '𝌆';
// var SURROGATE_SINGLE = String.fromCharCode(0xD834, 0xDF06);
var SURROGATE_SINGLE = unicode.fromCodePoint(0x1D306);

// var COMBINE_NONSURROGATE = 's̀'.substring(1); // s + combining
var COMBINE_NONSURROGATE = unicode.fromCodePoint(0x0300);

// var COMBINE = 's𐨁'.substring(1); // s + combining
// var COMBINE = String.fromCharCode(0xD802, 0xDE01);
var COMBINE = unicode.fromCodePoint(0x10A01);

/**
 * Content
 */

var lorem = fs.readFileSync(__dirname + '/lorem.txt', 'utf8');

lorem = lorem.replace(/e/gi, DOUBLE);
//lorem = lorem.replace(/e/gi, DU);
//lorem = lorem.replace(/r/gi, JUAN);
lorem = lorem.replace(/a/gi, SURROGATE_DOUBLE);
lorem = lorem.replace(/o/gi, SURROGATE_SINGLE);
if (~process.argv.indexOf('s')) {
  lorem = lorem.replace(/s/gi, 's' + COMBINE);
} else {
  lorem = lorem.replace('s', 's' + COMBINE);
}

// Surrogate pair emoticons from the SMP:
lorem += '\n';
lorem += 'emoticons: ';
for (var point = 0x1f600; point <= 0x1f64f; point++) {
  // These are technically single-width,
  // but they _look_ like they should be
  // double-width in gnome-terminal (they overlap).
  var emoticon = unicode.fromCodePoint(point);
  lorem += emoticon + ' ';
}

/**
 * UI
 */

var main = blessed.box({
  parent: screen,
  left: 'center',
  top: 'center',
  width: '50%',
  height: '50%',
  style: {
    bg: 'grey'
  },
  border: 'line',
  draggable: true,
  tags: true,
  // content: '{black-bg}{blue-fg}{bold}' + lorem + '{/}',
  // XXX {bold} breaks JUAN!
  content: '{black-bg}{light-blue-fg}' + lorem + '{/}',
  scrollable: true,
  alwaysScroll: true,
  keys: true,
  vi: true,
  mouse: true
});

main.focus();

screen.key('q', function() {
  return process.exit(0);
});

screen.render();
