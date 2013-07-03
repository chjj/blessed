/**
 * Colors
 */

// Try to match a hex code to a terminal color as best as possible.
exports.matchColor = function(col) {
  if (col[0] !== '#') return col;

  if (exports._cache[col] != null) {
    return exports._cache[col];
  }

  var col_ = parseInt(col.substring(1), 16)
    , r = (col_ >> 16) & 0xff
    , g = (col_ >> 8) & 0xff
    , b = col_ & 0xff
    , ldiff = Infinity
    , li = -1
    , i = 0
    , c
    , tr
    , tg
    , tb
    , diff;

  for (; i < exports.vcolors.length; i++) {
    c = exports.vcolors[i];
    tr = c[0];
    tg = c[1];
    tb = c[2];

    diff = Math.abs(r - tr)
      + Math.abs(g - tg)
      + Math.abs(b - tb);

    if (diff === 0) {
      li = i;
      break;
    }

    if (diff < ldiff) {
      ldiff = diff;
      li = i;
    }
  }

  return exports._cache[col] = li;
};

exports._cache = {};

// Default VGA-like colors
exports.def = [
  '#000000',
  '#ee0000',
  '#00ee00',
  '#eeee00',
  '#0000ee',
  '#ee00ee',
  '#00eeee',
  '#eeeeee',
  '#111111',
  '#ff0000',
  '#00ff00',
  '#ffff00',
  '#0000ff',
  '#ff00ff',
  '#00ffff',
  '#ffffff'
];

// XTerm Colors
// These were actually tough to track down. The xterm source only uses color
// keywords. The X11 source needed to be examined to find the actual values.
// They then had to be mapped to rgb values and then converted to hex values.
exports.xterm = [
  '#000000', // black
  '#cd0000', // red3
  '#00cd00', // green3
  '#cdcd00', // yellow3
  '#0000ee', // blue2
  '#cd00cd', // magenta3
  '#00cdcd', // cyan3
  '#e5e5e5', // gray90
  '#7f7f7f', // gray50
  '#ff0000', // red
  '#00ff00', // green
  '#ffff00', // yellow
  '#5c5cff', // rgb:5c/5c/ff
  '#ff00ff', // magenta
  '#00ffff', // cyan
  '#ffffff'  // white
];

// Seed all 256 colors. Assume xterm defaults.
// Ported from the xterm color generation script.
exports.colors = (function() {
  var cols = exports.colors = []
    , _cols = exports.vcolors = []
    , r
    , g
    , b
    , i
    , l;

  function hex(n) {
    n = n.toString(16);
    if (n.length < 2) n = '0' + n;
    return n;
  }

  function push(i, r, g, b) {
    cols[i] = '#' + hex(r) + hex(g) + hex(b);
    _cols[i] = [r, g, b];
  }

  // 0 - 15
  exports.xterm.forEach(function(c, i) {
    c = parseInt(c.substring(1), 16);
    push(i, (c >> 16) & 0xff, (c >> 8) & 0xff, c & 0xff);
  });

  // 16 - 231
  for (r = 0; r < 6; r++) {
    for (g = 0; g < 6; g++) {
      for (b = 0; b < 6; b++) {
        i = 16 + (r * 36) + (g * 6) + b;
        push(i,
          r ? (r * 40 + 55) : 0,
          g ? (g * 40 + 55) : 0,
          b ? (b * 40 + 55) : 0);
      }
    }
  }

  // 232 - 255 are grey.
  for (g = 0; g < 24; g++) {
    l = (g * 10) + 8;
    i = 232 + g;
    push(i, l, l, l);
  }

  return cols;
})();

// Map higher colors to the first 8 colors.
// This allows translation of high colors to low colors on 8-color terminals.
exports.ccolors = (function() {
  var _cols = exports.vcolors.slice()
    , cols = exports.colors.slice()
    , out;

  exports.vcolors = exports.vcolors.slice(0, 8);
  exports.colors = exports.colors.slice(0, 8);

  out = cols.map(exports.matchColor);

  exports.colors = cols;
  exports.vcolors = _cols;
  exports.ccolors = out;

  return out;
})();

var colorNames = exports.colorNames = {
  default: -1,
  bg: -1,
  fg: -1,
  black: 0,
  red: 1,
  green: 2,
  yellow: 3,
  blue: 4,
  magenta: 5,
  cyan: 6,
  white: 7,
  lightblack: 8,
  lightred: 9,
  lightgreen: 10,
  lightyellow: 11,
  lightblue: 12,
  lightmagenta: 13,
  lightcyan: 14,
  lightwhite: 15
};

//Object.keys(colorNames).forEach(function(name) {
//  colorNames[colorNames[name]] = name;
//});

exports.convert = function(color) {
  var val = colorNames[color];
  if (val == null) val = color;
  if (val == null) val = -1;
  if (typeof val === 'string') {
    val = exports.matchColor(val);
  }
  if (val === -1) return 0x1ff;
  return val;
};

// Map higher colors to the first 8 colors.
// This allows translation of high colors to low colors on 8-color terminals.
// Why the hell did I do this by hand?
exports.ccolors = {
  blue: [
    4,
    12,
    [17, 21],
    [24, 27],
    [31, 33],
    [38, 39],
    45,
    [54, 57],
    [60, 63],
    [67, 69],
    [74, 75],
    81,
    [91, 93],
    [97, 99],
    [103, 105],
    [110, 111],
    117,
    [128, 129],
    [134, 135],
    [140, 141],
    [146, 147],
    153,
    165,
    171,
    177,
    183,
    189
  ],

  green: [
    2,
    10,
    22,
    [28, 29],
    [34, 36],
    [40, 43],
    [46, 50],
    [64, 65],
    [70, 72],
    [76, 79],
    [82, 86],
    [106, 108],
    [112, 115],
    [118, 122],
    [148, 151],
    [154, 158],
    [190, 194]
  ],

  cyan: [
    6,
    14,
    23,
    30,
    37,
    44,
    51,
    66,
    73,
    80,
    87,
    109,
    116,
    123,
    152,
    159,
    195
  ],

  red: [
    1,
    9,
    52,
    [88, 89],
    [94, 95],
    [124, 126],
    [130, 132],
    [136, 138],
    [160, 163],
    [166, 169],
    [172, 175],
    [178, 181],
    [196, 200],
    [202, 206],
    [208, 212],
    [214, 218],
    [220, 224]
  ],

  magenta: [
    5,
    13,
    53,
    90,
    96,
    127,
    133,
    139,
    164,
    170,
    176,
    182,
    201,
    207,
    213,
    219,
    225
  ],

  yellow: [
    3,
    11,
    58,
    [100, 101],
    [142, 144],
    [184, 187],
    [226, 230]
  ],

  black: [
    0,
    8,
    16,
    59,
    102,
    [232, 243]
  ],

  white: [
    7,
    15,
    145,
    188,
    231,
    [244, 255]
  ]
};

Object.keys(exports.ccolors).forEach(function(name) {
  exports.ccolors[name].forEach(function(offset) {
    if (typeof offset === 'number') {
      exports.ccolors[offset] = exports.colorNames[name];
      return;
    }
    for (var i = offset[0], l = offset[1]; i <= l; i++) {
      exports.ccolors[i] = exports.colorNames[name];
    }
  });
  delete exports.ccolors[name];
});
