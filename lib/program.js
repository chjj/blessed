/**
 * Blessed
 * A curses-like library for node.js.
 * Copyright (c) 2013, Christopher Jeffrey (MIT License).
 */

/**
 * Modules
 */

var EventEmitter = require('events').EventEmitter;

/**
 * Program
 */

function Program(input, output) {
  var self = this;

  EventEmitter.call(this);

  this.input = input || process.stdin;
  this.output = output || process.stdout;

  this.x = 1;
  this.y = 1;

  this.cols = this.output.columns || 1;
  this.rows = this.output.rows || 1;

  this.terminal = process.env.TERM || 'xterm';

  this.listen();
}

Program.prototype.__proto__ = EventEmitter.prototype;

Program.prototype.term = function(is) {
  return this.terminal.indexOf(is) === 0;
};

Program.prototype.listen = function() {
  if (!this.input.isTTY || !this.output.isTTY) return;

  var readline = require('readline')
    , self = this;

  this._raw = true;

  this.input.setRawMode(true);

  this.input.on('keypress', function(ch, key) {
    key = key || 0;
    if (key.ctrl && key.name === 'c') {
      if (process.listeners('SIGINT').length) {
        process.emit('SIGINT');
      }
      if (self.listeners('SIGINT').length) {
        self.emit('SIGINT');
      }
      return;
    }
    self.emit('keypress', ch, key);
  });

  this.input.on('data', function(data) {
    self.emit('data', data);
  });

  readline.emitKeypressEvents(this.input);

  this.input.resume();

  this.output.on('resize', function() {
    self.cols = self.output.columns;
    self.rows = self.output.rows;
    self.emit('resize');
  });

  // this.getCursor(function(err, cursor) {
  //   if (err) return;
  //   self.x = cursor.x;
  //   self.y = cursor.y;
  // });

  this.on('newListener', function fn(type) {
    if (type === 'mouse') {
      self.removeListener('newListener', fn);
      self.bindMouse();
    }
  });
};

// XTerm mouse events
// http://invisible-island.net/xterm/ctlseqs/ctlseqs.html#Mouse%20Tracking
// To better understand these
// the xterm code is very helpful:
// Relevant files:
//   button.c, charproc.c, misc.c
// Relevant functions in xterm/button.c:
//   BtnCode, EmitButtonCode, EditorButton, SendMousePosition
// send a mouse event:
// regular/utf8: ^[[M Cb Cx Cy
// urxvt: ^[[ Cb ; Cx ; Cy M
// sgr: ^[[ Cb ; Cx ; Cy M/m
// vt300: ^[[ 24(1/3/5)~ [ Cx , Cy ] \r
// locator: CSI P e ; P b ; P r ; P c ; P p & w
// motion example of a left click:
// ^[[M 3<^[[M@4<^[[M@5<^[[M@6<^[[M@7<^[[M#7<
// mouseup, mousedown, mousewheel
// left click: ^[[M 3<^[[M#3<
// mousewheel up: ^[[M`3>
Program.prototype.bindMouse = function() {
  this.on('data', this._bindMouse.bind(this));
  this.bindMouse = function() {};
};

Program.prototype._bindMouse = function(s) {
  var self = this;

  // FROM: node/lib/readline.js
  var ch
    , key = {
        name: undefined,
        ctrl: false,
        meta: false,
        shift: false
      }
    , parts;

  if (Buffer.isBuffer(s)) {
    if (s[0] > 127 && s[1] === undefined) {
      s[0] -= 128;
      s = '\x1b' + s.toString('utf-8');
    } else {
      s = s.toString('utf-8');
    }
  }

  // XTerm / X10
  if (parts = /^\x1b\[M([\x00\u0020-\xffff]{3})/.exec(s)) {
    var b = parts[1].charCodeAt(0)
      , x = parts[1].charCodeAt(1)
      , y = parts[1].charCodeAt(2)
      , mod;

    key.name = 'mouse';
    key.type = 'X10';

    key.raw = [b, x, y, parts[0]];
    key.x = x - 32;
    key.y = y - 32;

    if (key.x === -32) key.x = 255;
    if (key.y === -32) key.y = 255;

    mod = b >> 3;
    key.shift = mod & 4;
    key.meta = mod & 8;
    key.ctrl = mod & 16;

    b -= 32;

    if (b === 64) {
      key.action = 'wheelup';
      key.button = 'middle';
    } else if (b === 65) {
      key.action = 'wheeldown';
      key.button = 'middle';
    } else if (b === 3) {
      // Could also be a movement.
      key.action = 'mouseup';
      key.button = 'unknown';
    } else {
      key.action = 'mousedown';
      key.button =
        b === 0 ? 'left'
        : b === 1 ? 'middle'
        : b === 2 ? 'right'
        : 'unknown';
    }

    // It's a movement
    // Wrong
    //if (b > 32 && b < 64) {
    //  delete key.button;
    //  key.action = 'movement';
    //}

    self.emit('keypress', null, key);
    self.emit('mouse', key);

    return;
  }

  // URxvt
  if (parts = /^\x1b\[(\d+;\d+;\d+)M/.exec(s)) {
    var parts = parts[1].split(';')
      , b = +parts[0]
      , x = +parts[1]
      , y = +parts[2];

    key.name = 'mouse';
    key.type = 'urxvt';

    key.x = x;
    key.y = y;

    // NOTE: Duplicate of the above.
    mod = b >> 3;
    key.shift = mod & 4;
    key.meta = mod & 8;
    key.ctrl = mod & 16;

    b -= 32;

    if (b === 64) {
      key.action = 'wheelup';
      key.button = 'middle';
    } else if (b === 65) {
      key.action = 'wheeldown';
      key.button = 'middle';
    } else if (b === 3) {
      // Could also be a movement.
      key.action = 'mouseup';
      key.button = 'unknown';
    } else {
      key.action = 'mousedown';
      key.button =
        b === 0 ? 'left'
        : b === 1 ? 'middle'
        : b === 2 ? 'right'
        : 'unknown';
    }

    // It's a movement
    // Wrong
    //if (b > 32 && b < 64) {
    //  delete key.button;
    //  key.action = 'movement';
    //}

    self.emit('keypress', null, key);
    self.emit('mouse', key);

    return;
  }

  // SGR
  if (parts = /^\x1b\[<(\d+;\d+;\d+)([mM])/.exec(s)) {
    var down = parts[2] === 'm'
      , parts = parts[1].split(';')
      , b = +parts[0]
      , x = +parts[1]
      , y = +parts[2];

    key.name = 'mouse';
    key.type = 'sgr';

    key.x = x;
    key.y = y;

    b &= 3;

    // NOTE: Get mod. And wheel.

    key.action = down
      ? 'mousedown'
      : 'mouseup';

    key.button =
      b === 0 ? 'left'
      : b === 1 ? 'middle'
      : b === 2 ? 'right'
      : 'unknown';

    self.emit('keypress', null, key);
    self.emit('mouse', key);

    return;
  }

  // DEC
  if (parts = /^\x1b\[<(\d+;\d+;\d+;\d+)&w/.exec(s)) {
    var parts = parts[1].split(';')
      , b = +parts[0]
      , x = +parts[1]
      , y = +parts[2]
      , page = +parts[3];

    key.name = 'mouse';
    key.type = 'dec';

    key.button = b;
    key.x = x;
    key.y = y;

    key.action = b === 3
      ? 'mouseup'
      : 'mousedown';

    key.button =
      b === 2 ? 'left'
      : b === 4 ? 'middle'
      : b === 6 ? 'right'
      : 'unknown';

    self.emit('keypress', null, key);
    self.emit('mouse', key);

    return;
  }

  // vt300
  if (parts = /^\x1b\[24([0135])~\[(\d+),(\d+)\]\r/.exec(s)) {
    var b = +parts[1]
      , x = +parts[2]
      , y = +parts[3];

    key.name = 'mouse';
    key.type = 'vt300';

    key.x = x;
    key.y = y;

    key.action = 'mousedown';
    key.button =
      b === 1 ? 'left'
      : b === 2 ? 'middle'
      : b === 5 ? 'right'
      : 'unknown';

    self.emit('keypress', null, key);
    self.emit('mouse', key);

    return;
  }

  if (parts = /^\x1b\[(O|I)/.exec(s)) {
    key.action = parts[1] === 'I'
      ? 'focus'
      : 'blur';

    self.emit('mouse', key);
    self.emit(key.action);

    return;
  }
};

Program.prototype.receive = function(text, callback) {
  var listeners = this.listeners('keypress')
    , bak = listeners.slice();

  if (!this._raw) {
    throw new Error('Input must be raw.');
  }

  listeners.length = 0;

  if (!callback) {
    callback = text;
    text = null;
  }

  this.input.once('data', function(data) {
    listeners.push.apply(listeners, bak);
    if (typeof data !== 'string') {
      data = data.toString('utf8');
    }
    return callback(null, data);
  });

  if (text) this.write(text);
};

Program.prototype.write =
Program.prototype.echo = function(text, attr) {
  if (attr) {
    this.attr(attr, true);
    this.write(text);
    this.attr(attr, false);
    return;
  }
  return this.output.write(text);
};

Program.prototype.setx = function(x) {
  // return this.cursorCharAbsolute(x);
  return this.charPosAbsolute(x);
};

Program.prototype.sety = function(y) {
  return this.linePosAbsolute(y);
};

Program.prototype.move = function(x, y) {
  return this.cursorPos(y, x);
};

Program.prototype.rsetx = function(x) {
  // return this.HPositionRelative(x);
  if (!x) return;
  return x > 0
    ? this.forward(x)
    : this.back(x);
};

Program.prototype.rsety = function(y) {
  // return this.VPositionRelative(y);
  if (!y) return;
  return y > 0
    ? this.up(y)
    : this.down(y);
};

Program.prototype.rmove = function(x, y) {
  this.rsetX(x);
  this.rsetY(y);
};

/**
 * Normal
 */

Program.prototype.nul = function() {
  return this.write('\0');
};

Program.prototype.bell = function() {
  return this.write('\x07');
};

Program.prototype.vtab = function() {
  this.y++;
  return this.write('\x0b');
};

Program.prototype.form = function() {
  return this.write('\x0c');
};

Program.prototype.backspace = function() {
  this.x--;
  return this.write('\x08');
};

Program.prototype.tab = function() {
  this.x += 8;
  return this.write('\t');
};

Program.prototype.shiftOut = function() {
  return this.write('\x0e');
};

Program.prototype.shiftIn = function() {
  return this.write('\x0f');
};

Program.prototype.return = function() {
  this.x = 1;
  return this.write('\r');
};

Program.prototype.feed = function() {
  this.x = 1;
  this.y++;
  return this.write('\n');
};

/**
 * Esc
 */

Program.prototype.esc = function(code) {
  return this.write('\x1b' + code);
};

// ESC D Index (IND is 0x84).
Program.prototype.index = function() {
  this.y++;
  return this.write('\x1bD');
};

// ESC M Reverse Index (RI is 0x8d).
Program.prototype.reverse =
Program.prototype.reverseIndex = function() {
  this.y--;
  return this.write('\x1bM');
};

// ESC E Next Line (NEL is 0x85).
Program.prototype.nextLine = function() {
  this.y++;
  this.x = 1;
  return this.write('\x1bE');
};

// ESC c Full Reset (RIS).
Program.prototype.reset = function() {
  //this.x = this.y = 1;
  return this.write('\x1bc');
};

// ESC H Tab Set (HTS is 0x88).
Program.prototype.tabSet = function() {
  return this.write('\x1bH');
};

// ESC 7 Save Cursor (DECSC).
Program.prototype.saveCursor = function() {
  this.savedX = this.x || 1;
  this.savedY = this.y || 1;
  return this.esc('7');
};

// ESC 8 Restore Cursor (DECRC).
Program.prototype.restoreCursor = function() {
  this.x = this.savedX || 1;
  this.y = this.savedY || 1;
  return this.esc('8');
};

// ESC # 3 DEC line height/width
Program.prototype.lineHeight = function() {
  return this.esc('#');
};

// ESC (,),*,+,-,. Designate G0-G2 Character Set.
Program.prototype.charset = function(val, level) {
  level = level || 0;

  switch (level) {
    case 0:
      level = '(';
      break;
    case 1:
      level = ')';
      break;
    case 2:
      level = '*';
      break;
    case 3:
      level = '+';
      break;
  }

  switch (val) {
    case 'SCLD': // DEC Special Character and Line Drawing Set.
      val = '0';
      break;
    case 'UK': // UK
      val = 'A';
      break;
    case 'US': // United States (USASCII).
      val = 'B';
      break;
    case 'Dutch': // Dutch
      val = '4';
      break;
    case 'Finnish': // Finnish
      val = 'C';
      val = '5';
      break;
    case 'French': // French
      val = 'R';
      break;
    case 'FrenchCanadian': // FrenchCanadian
      val = 'Q';
      break;
    case 'German':  // German
      val = 'K';
      break;
    case 'Italian': // Italian
      val = 'Y';
      break;
    case 'NorwegianDanish': // NorwegianDanish
      val = 'E';
      val = '6';
      break;
    case 'Spanish': // Spanish
      val = 'Z';
      break;
    case 'Swedish': // Swedish
      val = 'H';
      val = '7';
      break;
    case 'Swiss': // Swiss
      val = '=';
      break;
    case 'ISOLatin': // ISOLatin (actually /A)
      val = '/A';
      break;
    default: // Default
      val = 'B';
      break;
  }

  return this.write('\x1b(' + val);
};

// ESC N
// Single Shift Select of G2 Character Set
// ( SS2 is 0x8e). This affects next character only.
// ESC O
// Single Shift Select of G3 Character Set
// ( SS3 is 0x8f). This affects next character only.
// ESC n
// Invoke the G2 Character Set as GL (LS2).
// ESC o
// Invoke the G3 Character Set as GL (LS3).
// ESC |
// Invoke the G3 Character Set as GR (LS3R).
// ESC }
// Invoke the G2 Character Set as GR (LS2R).
// ESC ~
// Invoke the G1 Character Set as GR (LS1R).
Program.prototype.setG = function(val) {
  switch (val) {
    case 1:
      val = '~'; // GR
      break;
    case 2:
      val = 'n'; // GL
      val = '}'; // GR
      val = 'N'; // Next Char Only
      break;
    case 3:
      val = 'o'; // GL
      val = '|'; // GR
      val = 'O'; // Next Char Only
      break;
  }
  return this.esc(val);
};

/**
 * OSC
 */

Program.prototype.osc = function(code) {
  return this.esc(']' + code);
};

// OSC Ps ; Pt ST
// OSC Ps ; Pt BEL
//   Set Text Parameters.
Program.prototype.setTitle = function(title) {
  return this.osc('0;' + title + '\x07');
};

/**
 * CSI
 */

Program.prototype.csi = function(code) {
  return this.esc('[' + code);
};

// CSI Ps A
// Cursor Up Ps Times (default = 1) (CUU).
Program.prototype.cuu =
Program.prototype.up =
Program.prototype.cursorUp = function(param) {
  this.y -= param || 1;
  return this.write('\x1b[' + (param || '') + 'A');
};

// CSI Ps B
// Cursor Down Ps Times (default = 1) (CUD).
Program.prototype.cud =
Program.prototype.down =
Program.prototype.cursorDown = function(param) {
  this.y += param || 1;
  return this.write('\x1b[' + (param || '') + 'B');
};

// CSI Ps C
// Cursor Forward Ps Times (default = 1) (CUF).
Program.prototype.cuf =
Program.prototype.right =
Program.prototype.forward =
Program.prototype.cursorForward = function(param) {
  this.x += param || 1;
  return this.write('\x1b[' + (param || '') + 'C');
};

// CSI Ps D
// Cursor Backward Ps Times (default = 1) (CUB).
Program.prototype.cub =
Program.prototype.left =
Program.prototype.back =
Program.prototype.cursorBackward = function(param) {
  this.x -= param || 1;
  return this.write('\x1b[' + (param || '') + 'D');
};

// CSI Ps ; Ps H
// Cursor Position [row;column] (default = [1,1]) (CUP).
Program.prototype.cup =
Program.prototype.pos =
Program.prototype.cursorPos = function(row, col) {
  this.x = col || 1;
  this.y = row || 1;
  return this.write('\x1b[' + (row || '1') + ';' + (col || '1') + 'H');
};

// CSI Ps J  Erase in Display (ED).
//     Ps = 0  -> Erase Below (default).
//     Ps = 1  -> Erase Above.
//     Ps = 2  -> Erase All.
//     Ps = 3  -> Erase Saved Lines (xterm).
// CSI ? Ps J
//   Erase in Display (DECSED).
//     Ps = 0  -> Selective Erase Below (default).
//     Ps = 1  -> Selective Erase Above.
//     Ps = 2  -> Selective Erase All.
Program.prototype.ed =
Program.prototype.eraseInDisplay = function(param) {
  switch (param) {
    case 'above':
      this.write('\x1b[1J');
      break;
    case 'all':
      this.write('\x1b[2J');
      break;
    case 'saved':
      this.write('\x1b[3J');
      break;
    case 'below':
    default:
      this.write('\x1b[J');
      break;
  }
};

Program.prototype.clear = function() {
  return this.eraseInDisplay('all');
};

// CSI Ps K  Erase in Line (EL).
//     Ps = 0  -> Erase to Right (default).
//     Ps = 1  -> Erase to Left.
//     Ps = 2  -> Erase All.
// CSI ? Ps K
//   Erase in Line (DECSEL).
//     Ps = 0  -> Selective Erase to Right (default).
//     Ps = 1  -> Selective Erase to Left.
//     Ps = 2  -> Selective Erase All.
Program.prototype.el =
Program.prototype.eraseInLine = function(param) {
  switch (param) {
    case 'left':
      this.write('\x1b[1K');
      break;
    case 'all':
      this.write('\x1b[2K');
      break;
    case 'right':
    default:
      this.write('\x1b[K');
      break;
  }
};

// CSI Pm m  Character Attributes (SGR).
//     Ps = 0  -> Normal (default).
//     Ps = 1  -> Bold.
//     Ps = 4  -> Underlined.
//     Ps = 5  -> Blink (appears as Bold).
//     Ps = 7  -> Inverse.
//     Ps = 8  -> Invisible, i.e., hidden (VT300).
//     Ps = 2 2  -> Normal (neither bold nor faint).
//     Ps = 2 4  -> Not underlined.
//     Ps = 2 5  -> Steady (not blinking).
//     Ps = 2 7  -> Positive (not inverse).
//     Ps = 2 8  -> Visible, i.e., not hidden (VT300).
//     Ps = 3 0  -> Set foreground color to Black.
//     Ps = 3 1  -> Set foreground color to Red.
//     Ps = 3 2  -> Set foreground color to Green.
//     Ps = 3 3  -> Set foreground color to Yellow.
//     Ps = 3 4  -> Set foreground color to Blue.
//     Ps = 3 5  -> Set foreground color to Magenta.
//     Ps = 3 6  -> Set foreground color to Cyan.
//     Ps = 3 7  -> Set foreground color to White.
//     Ps = 3 9  -> Set foreground color to default (original).
//     Ps = 4 0  -> Set background color to Black.
//     Ps = 4 1  -> Set background color to Red.
//     Ps = 4 2  -> Set background color to Green.
//     Ps = 4 3  -> Set background color to Yellow.
//     Ps = 4 4  -> Set background color to Blue.
//     Ps = 4 5  -> Set background color to Magenta.
//     Ps = 4 6  -> Set background color to Cyan.
//     Ps = 4 7  -> Set background color to White.
//     Ps = 4 9  -> Set background color to default (original).

//   If 16-color support is compiled, the following apply.  Assume
//   that xterm's resources are set so that the ISO color codes are
//   the first 8 of a set of 16.  Then the aixterm colors are the
//   bright versions of the ISO colors:
//     Ps = 9 0  -> Set foreground color to Black.
//     Ps = 9 1  -> Set foreground color to Red.
//     Ps = 9 2  -> Set foreground color to Green.
//     Ps = 9 3  -> Set foreground color to Yellow.
//     Ps = 9 4  -> Set foreground color to Blue.
//     Ps = 9 5  -> Set foreground color to Magenta.
//     Ps = 9 6  -> Set foreground color to Cyan.
//     Ps = 9 7  -> Set foreground color to White.
//     Ps = 1 0 0  -> Set background color to Black.
//     Ps = 1 0 1  -> Set background color to Red.
//     Ps = 1 0 2  -> Set background color to Green.
//     Ps = 1 0 3  -> Set background color to Yellow.
//     Ps = 1 0 4  -> Set background color to Blue.
//     Ps = 1 0 5  -> Set background color to Magenta.
//     Ps = 1 0 6  -> Set background color to Cyan.
//     Ps = 1 0 7  -> Set background color to White.

//   If xterm is compiled with the 16-color support disabled, it
//   supports the following, from rxvt:
//     Ps = 1 0 0  -> Set foreground and background color to
//     default.

//   If 88- or 256-color support is compiled, the following apply.
//     Ps = 3 8  ; 5  ; Ps -> Set foreground color to the second
//     Ps.
//     Ps = 4 8  ; 5  ; Ps -> Set background color to the second
//     Ps.
Program.prototype.sgr =
Program.prototype.attr =
Program.prototype.charAttributes = function(param, val) {
  if (param.indexOf('no ') === 0) {
    param = param.substring(3);
    val = false;
  } else if (param.indexOf('!') === 0) {
    param = param.substring(1);
    val = false;
  }
  switch (param) {
    case 'normal':
      return this.write('\x1b[m');
    case 'bold':
      return val === false
        ? this.write('\x1b[22m')
        : this.write('\x1b[1m');
    case 'underlined':
      return val === false
        ? this.write('\x1b[24m')
        : this.write('\x1b[4m');
    case 'blink':
      return val === false
        ? this.write('\x1b[25m')
        : this.write('\x1b[5m');
    case 'inverse':
      return val === false
        ? this.write('\x1b[27m')
        : this.write('\x1b[7m');
      break;
    case 'invisible':
      return val === false
        ? this.write('\x1b[28m')
        : this.write('\x1b[8m');
    case 'invisible':
      return val === false
        ? this.write('\x1b[28m')
        : this.write('\x1b[8m');

    case 'black fg':
      return val === false
        ? this.write('\x1b[39m')
        : this.write('\x1b[30m');
    case 'red fg':
      return val === false
        ? this.write('\x1b[39m')
        : this.write('\x1b[31m');
    case 'green fg':
    return val === false
      ? this.write('\x1b[39m')
      : this.write('\x1b[32m');
    case 'yellow fg':
      return val === false
        ? this.write('\x1b[39m')
        : this.write('\x1b[33m');
    case 'blue fg':
      return val === false
        ? this.write('\x1b[39m')
        : this.write('\x1b[34m');
    case 'magenta fg':
      return val === false
        ? this.write('\x1b[39m')
        : this.write('\x1b[35m');
    case 'cyan fg':
      return val === false
        ? this.write('\x1b[39m')
        : this.write('\x1b[36m');
    case 'white fg':
      return val === false
        ? this.write('\x1b[39m')
        : this.write('\x1b[37m');
    case 'default fg':
      return this.write('\x1b[39m');

    case 'black bg':
      return val === false
        ? this.write('\x1b[49m')
        : this.write('\x1b[40m');
    case 'red bg':
      return val === false
        ? this.write('\x1b[49m')
        : this.write('\x1b[41m');
    case 'green bg':
      return val === false
        ? this.write('\x1b[49m')
        : this.write('\x1b[42m');
    case 'yellow bg':
      return val === false
        ? this.write('\x1b[49m')
        : this.write('\x1b[43m');
    case 'blue bg':
      return val === false
        ? this.write('\x1b[49m')
        : this.write('\x1b[44m');
    case 'magenta bg':
      return val === false
        ? this.write('\x1b[49m')
        : this.write('\x1b[45m');
    case 'cyan bg':
      return val === false
        ? this.write('\x1b[49m')
        : this.write('\x1b[46m');
    case 'white bg':
      return val === false
        ? this.write('\x1b[49m')
        : this.write('\x1b[47m');
    case 'default bg':
      return this.write('\x1b[49m');

    default:
      return this.write('\x1b[' + param + 'm');
  }
};

Program.prototype.fg =
Program.prototype.setForeground = function(color, val) {
  return this.attr(color + ' fg', val);
};

Program.prototype.bg =
Program.prototype.setBackground = function(color, val) {
  return this.attr(color + ' bg', val);
};

// CSI Ps n  Device Status Report (DSR).
//     Ps = 5  -> Status Report.  Result (``OK'') is
//   CSI 0 n
//     Ps = 6  -> Report Cursor Position (CPR) [row;column].
//   Result is
//   CSI r ; c R
// CSI ? Ps n
//   Device Status Report (DSR, DEC-specific).
//     Ps = 6  -> Report Cursor Position (CPR) [row;column] as CSI
//     ? r ; c R (assumes page is zero).
//     Ps = 1 5  -> Report Printer status as CSI ? 1 0  n  (ready).
//     or CSI ? 1 1  n  (not ready).
//     Ps = 2 5  -> Report UDK status as CSI ? 2 0  n  (unlocked)
//     or CSI ? 2 1  n  (locked).
//     Ps = 2 6  -> Report Keyboard status as
//   CSI ? 2 7  ;  1  ;  0  ;  0  n  (North American).
//   The last two parameters apply to VT400 & up, and denote key-
//   board ready and LK01 respectively.
//     Ps = 5 3  -> Report Locator status as
//   CSI ? 5 3  n  Locator available, if compiled-in, or
//   CSI ? 5 0  n  No Locator, if not.
Program.prototype.dsr =
Program.prototype.deviceStatus = function(param, callback, dec) {
  if (dec) {
    return this.receive('\x1b[?' + (param || '0') + 'n', callback);
  }
  return this.receive('\x1b[' + (param || '0') + 'n', callback);
};

Program.prototype.getCursor = function(callback) {
  return this.deviceStatus('6', function(err, data) {
    if (err) return callback(err);
    data = data.slice(2, -1).split(';');
    return callback(null, {
      x: +data[1],
      y: +data[0]
    });
  });
};

/**
 * Additions
 */

// CSI Ps @
// Insert Ps (Blank) Character(s) (default = 1) (ICH).
Program.prototype.ich =
Program.prototype.insertChars = function(param) {
  this.x += param || 1;
  return this.write('\x1b[' + (param || 1) + '@');
};

// CSI Ps E
// Cursor Next Line Ps Times (default = 1) (CNL).
// same as CSI Ps B ?
Program.prototype.cnl =
Program.prototype.cursorNextLine = function(param) {
  this.y += param || 1;
  return this.write('\x1b[' + (param || '') + 'E');
};

// CSI Ps F
// Cursor Preceding Line Ps Times (default = 1) (CNL).
// reuse CSI Ps A ?
Program.prototype.cpl =
Program.prototype.cursorPrecedingLine = function(param) {
  this.y -= param || 1;
  return this.write('\x1b[' + (param || '') + 'F');
};

// CSI Ps G
// Cursor Character Absolute  [column] (default = [row,1]) (CHA).
Program.prototype.cha =
Program.prototype.cursorCharAbsolute = function(param) {
  this.x = param || 1;
  this.y = 1;
  return this.write('\x1b[' + (param || '') + 'G');
};

// CSI Ps L
// Insert Ps Line(s) (default = 1) (IL).
Program.prototype.il =
Program.prototype.insertLines = function(param) {
  return this.write('\x1b[' + (param || '') + 'L');
};

// CSI Ps M
// Delete Ps Line(s) (default = 1) (DL).
Program.prototype.dl =
Program.prototype.deleteLines = function(param) {
  return this.write('\x1b[' + (param || '') + 'M');
};

// CSI Ps P
// Delete Ps Character(s) (default = 1) (DCH).
Program.prototype.dch =
Program.prototype.deleteChars = function(param) {
  return this.write('\x1b[' + (param || '') + 'P');
};

// CSI Ps X
// Erase Ps Character(s) (default = 1) (ECH).
Program.prototype.ech =
Program.prototype.eraseChars = function(param) {
  return this.write('\x1b[' + (param || '') + 'X');
};

// CSI Pm `  Character Position Absolute
//   [column] (default = [row,1]) (HPA).
Program.prototype.hpa =
Program.prototype.charPosAbsolute = function() {
  this.x = arguments[0] || 1;
  var param = Array.prototype.slice.call(arguments).join(';');
  return this.write('\x1b[' + (param || '') + '`');
};

// 141 61 a * HPR -
// Horizontal Position Relative
// reuse CSI Ps C ?
Program.prototype.hpr =
Program.prototype.HPositionRelative = function(param) {
  this.x += param || 1;
  return this.write('\x1b[' + (param || '') + 'a');
};

// CSI Ps c  Send Device Attributes (Primary DA).
//     Ps = 0  or omitted -> request attributes from terminal.  The
//     response depends on the decTerminalID resource setting.
//     -> CSI ? 1 ; 2 c  (``VT100 with Advanced Video Option'')
//     -> CSI ? 1 ; 0 c  (``VT101 with No Options'')
//     -> CSI ? 6 c  (``VT102'')
//     -> CSI ? 6 0 ; 1 ; 2 ; 6 ; 8 ; 9 ; 1 5 ; c  (``VT220'')
//   The VT100-style response parameters do not mean anything by
//   themselves.  VT220 parameters do, telling the host what fea-
//   tures the terminal supports:
//     Ps = 1  -> 132-columns.
//     Ps = 2  -> Printer.
//     Ps = 6  -> Selective erase.
//     Ps = 8  -> User-defined keys.
//     Ps = 9  -> National replacement character sets.
//     Ps = 1 5  -> Technical characters.
//     Ps = 2 2  -> ANSI color, e.g., VT525.
//     Ps = 2 9  -> ANSI text locator (i.e., DEC Locator mode).
// CSI > Ps c
//   Send Device Attributes (Secondary DA).
//     Ps = 0  or omitted -> request the terminal's identification
//     code.  The response depends on the decTerminalID resource set-
//     ting.  It should apply only to VT220 and up, but xterm extends
//     this to VT100.
//     -> CSI  > Pp ; Pv ; Pc c
//   where Pp denotes the terminal type
//     Pp = 0  -> ``VT100''.
//     Pp = 1  -> ``VT220''.
//   and Pv is the firmware version (for xterm, this was originally
//   the XFree86 patch number, starting with 95).  In a DEC termi-
//   nal, Pc indicates the ROM cartridge registration number and is
//   always zero.
// More information:
//   xterm/charproc.c - line 2012, for more information.
//   vim responds with ^[[?0c or ^[[?1c after the terminal's response (?)
Program.prototype.da =
Program.prototype.sendDeviceAttributes = function(param, callback) {
  return this.receive('\x1b[' + (param || '') + 'c', function(err, response) {
    if (err) return callback(err);
    if (response === '\x1b[?1;2c') {
      return callback(null, 'VT100 with Advanced Video Option');
    }
    return callback(null, 'Unknown');
  });
};

// CSI Pm d
// Line Position Absolute  [row] (default = [1,column]) (VPA).
Program.prototype.vpa =
Program.prototype.linePosAbsolute = function() {
  this.y = arguments[0] || 1;
  var param = Array.prototype.slice.call(arguments).join(';');
  return this.write('\x1b[' + (param || '') + 'd');
};

// 145 65 e * VPR - Vertical Position Relative
// reuse CSI Ps B ?
Program.prototype.vpr =
Program.prototype.VPositionRelative = function(param) {
  this.y += param || 1;
  return this.write('\x1b[' + (param || '') + 'e');
};

// CSI Ps ; Ps f
//   Horizontal and Vertical Position [row;column] (default =
//   [1,1]) (HVP).
Program.prototype.hvp =
Program.prototype.HVPosition = function(row, col) {
  this.y += row || 1;
  this.x += col || 1;
  return this.write('\x1b[' + (row || '1') + ';' + (col || '1') + 'f');
};

// CSI Pm h  Set Mode (SM).
//     Ps = 2  -> Keyboard Action Mode (AM).
//     Ps = 4  -> Insert Mode (IRM).
//     Ps = 1 2  -> Send/receive (SRM).
//     Ps = 2 0  -> Automatic Newline (LNM).
// CSI ? Pm h
//   DEC Private Mode Set (DECSET).
//     Ps = 1  -> Application Cursor Keys (DECCKM).
//     Ps = 2  -> Designate USASCII for character sets G0-G3
//     (DECANM), and set VT100 mode.
//     Ps = 3  -> 132 Column Mode (DECCOLM).
//     Ps = 4  -> Smooth (Slow) Scroll (DECSCLM).
//     Ps = 5  -> Reverse Video (DECSCNM).
//     Ps = 6  -> Origin Mode (DECOM).
//     Ps = 7  -> Wraparound Mode (DECAWM).
//     Ps = 8  -> Auto-repeat Keys (DECARM).
//     Ps = 9  -> Send Mouse X & Y on button press.  See the sec-
//     tion Mouse Tracking.
//     Ps = 1 0  -> Show toolbar (rxvt).
//     Ps = 1 2  -> Start Blinking Cursor (att610).
//     Ps = 1 8  -> Print form feed (DECPFF).
//     Ps = 1 9  -> Set print extent to full screen (DECPEX).
//     Ps = 2 5  -> Show Cursor (DECTCEM).
//     Ps = 3 0  -> Show scrollbar (rxvt).
//     Ps = 3 5  -> Enable font-shifting functions (rxvt).
//     Ps = 3 8  -> Enter Tektronix Mode (DECTEK).
//     Ps = 4 0  -> Allow 80 -> 132 Mode.
//     Ps = 4 1  -> more(1) fix (see curses resource).
//     Ps = 4 2  -> Enable Nation Replacement Character sets (DECN-
//     RCM).
//     Ps = 4 4  -> Turn On Margin Bell.
//     Ps = 4 5  -> Reverse-wraparound Mode.
//     Ps = 4 6  -> Start Logging.  This is normally disabled by a
//     compile-time option.
//     Ps = 4 7  -> Use Alternate Screen Buffer.  (This may be dis-
//     abled by the titeInhibit resource).
//     Ps = 6 6  -> Application keypad (DECNKM).
//     Ps = 6 7  -> Backarrow key sends backspace (DECBKM).
//     Ps = 1 0 0 0  -> Send Mouse X & Y on button press and
//     release.  See the section Mouse Tracking.
//     Ps = 1 0 0 1  -> Use Hilite Mouse Tracking.
//     Ps = 1 0 0 2  -> Use Cell Motion Mouse Tracking.
//     Ps = 1 0 0 3  -> Use All Motion Mouse Tracking.
//     Ps = 1 0 0 4  -> Send FocusIn/FocusOut events.
//     Ps = 1 0 0 5  -> Enable Extended Mouse Mode.
//     Ps = 1 0 1 0  -> Scroll to bottom on tty output (rxvt).
//     Ps = 1 0 1 1  -> Scroll to bottom on key press (rxvt).
//     Ps = 1 0 3 4  -> Interpret "meta" key, sets eighth bit.
//     (enables the eightBitInput resource).
//     Ps = 1 0 3 5  -> Enable special modifiers for Alt and Num-
//     Lock keys.  (This enables the numLock resource).
//     Ps = 1 0 3 6  -> Send ESC   when Meta modifies a key.  (This
//     enables the metaSendsEscape resource).
//     Ps = 1 0 3 7  -> Send DEL from the editing-keypad Delete
//     key.
//     Ps = 1 0 3 9  -> Send ESC  when Alt modifies a key.  (This
//     enables the altSendsEscape resource).
//     Ps = 1 0 4 0  -> Keep selection even if not highlighted.
//     (This enables the keepSelection resource).
//     Ps = 1 0 4 1  -> Use the CLIPBOARD selection.  (This enables
//     the selectToClipboard resource).
//     Ps = 1 0 4 2  -> Enable Urgency window manager hint when
//     Control-G is received.  (This enables the bellIsUrgent
//     resource).
//     Ps = 1 0 4 3  -> Enable raising of the window when Control-G
//     is received.  (enables the popOnBell resource).
//     Ps = 1 0 4 7  -> Use Alternate Screen Buffer.  (This may be
//     disabled by the titeInhibit resource).
//     Ps = 1 0 4 8  -> Save cursor as in DECSC.  (This may be dis-
//     abled by the titeInhibit resource).
//     Ps = 1 0 4 9  -> Save cursor as in DECSC and use Alternate
//     Screen Buffer, clearing it first.  (This may be disabled by
//     the titeInhibit resource).  This combines the effects of the 1
//     0 4 7  and 1 0 4 8  modes.  Use this with terminfo-based
//     applications rather than the 4 7  mode.
//     Ps = 1 0 5 0  -> Set terminfo/termcap function-key mode.
//     Ps = 1 0 5 1  -> Set Sun function-key mode.
//     Ps = 1 0 5 2  -> Set HP function-key mode.
//     Ps = 1 0 5 3  -> Set SCO function-key mode.
//     Ps = 1 0 6 0  -> Set legacy keyboard emulation (X11R6).
//     Ps = 1 0 6 1  -> Set VT220 keyboard emulation.
//     Ps = 2 0 0 4  -> Set bracketed paste mode.
// Modes:
//   http://vt100.net/docs/vt220-rm/chapter4.html
Program.prototype.sm =
Program.prototype.setMode = function() {
  var param = Array.prototype.slice.call(arguments).join(';');
  //if (private) {
  //  return this.write('\x1b[?' + (param || '') + 'h');
  //}
  return this.write('\x1b[' + (param || '') + 'h');
};

Program.prototype.decset = function() {
  var param = Array.prototype.slice.call(arguments).join(';');
  return this.setMode('?' + param);
};

Program.prototype.dectcem =
Program.prototype.showCursor = function() {
  return this.setMode('?25');
};

Program.prototype.alternate =
Program.prototype.alternateBuffer = function() {
  //return this.setMode('?47');
  //return this.setMode('?1047');
  return this.setMode('?1049');
};

// CSI Pm l  Reset Mode (RM).
//     Ps = 2  -> Keyboard Action Mode (AM).
//     Ps = 4  -> Replace Mode (IRM).
//     Ps = 1 2  -> Send/receive (SRM).
//     Ps = 2 0  -> Normal Linefeed (LNM).
// CSI ? Pm l
//   DEC Private Mode Reset (DECRST).
//     Ps = 1  -> Normal Cursor Keys (DECCKM).
//     Ps = 2  -> Designate VT52 mode (DECANM).
//     Ps = 3  -> 80 Column Mode (DECCOLM).
//     Ps = 4  -> Jump (Fast) Scroll (DECSCLM).
//     Ps = 5  -> Normal Video (DECSCNM).
//     Ps = 6  -> Normal Cursor Mode (DECOM).
//     Ps = 7  -> No Wraparound Mode (DECAWM).
//     Ps = 8  -> No Auto-repeat Keys (DECARM).
//     Ps = 9  -> Don't send Mouse X & Y on button press.
//     Ps = 1 0  -> Hide toolbar (rxvt).
//     Ps = 1 2  -> Stop Blinking Cursor (att610).
//     Ps = 1 8  -> Don't print form feed (DECPFF).
//     Ps = 1 9  -> Limit print to scrolling region (DECPEX).
//     Ps = 2 5  -> Hide Cursor (DECTCEM).
//     Ps = 3 0  -> Don't show scrollbar (rxvt).
//     Ps = 3 5  -> Disable font-shifting functions (rxvt).
//     Ps = 4 0  -> Disallow 80 -> 132 Mode.
//     Ps = 4 1  -> No more(1) fix (see curses resource).
//     Ps = 4 2  -> Disable Nation Replacement Character sets (DEC-
//     NRCM).
//     Ps = 4 4  -> Turn Off Margin Bell.
//     Ps = 4 5  -> No Reverse-wraparound Mode.
//     Ps = 4 6  -> Stop Logging.  (This is normally disabled by a
//     compile-time option).
//     Ps = 4 7  -> Use Normal Screen Buffer.
//     Ps = 6 6  -> Numeric keypad (DECNKM).
//     Ps = 6 7  -> Backarrow key sends delete (DECBKM).
//     Ps = 1 0 0 0  -> Don't send Mouse X & Y on button press and
//     release.  See the section Mouse Tracking.
//     Ps = 1 0 0 1  -> Don't use Hilite Mouse Tracking.
//     Ps = 1 0 0 2  -> Don't use Cell Motion Mouse Tracking.
//     Ps = 1 0 0 3  -> Don't use All Motion Mouse Tracking.
//     Ps = 1 0 0 4  -> Don't send FocusIn/FocusOut events.
//     Ps = 1 0 0 5  -> Disable Extended Mouse Mode.
//     Ps = 1 0 1 0  -> Don't scroll to bottom on tty output
//     (rxvt).
//     Ps = 1 0 1 1  -> Don't scroll to bottom on key press (rxvt).
//     Ps = 1 0 3 4  -> Don't interpret "meta" key.  (This disables
//     the eightBitInput resource).
//     Ps = 1 0 3 5  -> Disable special modifiers for Alt and Num-
//     Lock keys.  (This disables the numLock resource).
//     Ps = 1 0 3 6  -> Don't send ESC  when Meta modifies a key.
//     (This disables the metaSendsEscape resource).
//     Ps = 1 0 3 7  -> Send VT220 Remove from the editing-keypad
//     Delete key.
//     Ps = 1 0 3 9  -> Don't send ESC  when Alt modifies a key.
//     (This disables the altSendsEscape resource).
//     Ps = 1 0 4 0  -> Do not keep selection when not highlighted.
//     (This disables the keepSelection resource).
//     Ps = 1 0 4 1  -> Use the PRIMARY selection.  (This disables
//     the selectToClipboard resource).
//     Ps = 1 0 4 2  -> Disable Urgency window manager hint when
//     Control-G is received.  (This disables the bellIsUrgent
//     resource).
//     Ps = 1 0 4 3  -> Disable raising of the window when Control-
//     G is received.  (This disables the popOnBell resource).
//     Ps = 1 0 4 7  -> Use Normal Screen Buffer, clearing screen
//     first if in the Alternate Screen.  (This may be disabled by
//     the titeInhibit resource).
//     Ps = 1 0 4 8  -> Restore cursor as in DECRC.  (This may be
//     disabled by the titeInhibit resource).
//     Ps = 1 0 4 9  -> Use Normal Screen Buffer and restore cursor
//     as in DECRC.  (This may be disabled by the titeInhibit
//     resource).  This combines the effects of the 1 0 4 7  and 1 0
//     4 8  modes.  Use this with terminfo-based applications rather
//     than the 4 7  mode.
//     Ps = 1 0 5 0  -> Reset terminfo/termcap function-key mode.
//     Ps = 1 0 5 1  -> Reset Sun function-key mode.
//     Ps = 1 0 5 2  -> Reset HP function-key mode.
//     Ps = 1 0 5 3  -> Reset SCO function-key mode.
//     Ps = 1 0 6 0  -> Reset legacy keyboard emulation (X11R6).
//     Ps = 1 0 6 1  -> Reset keyboard emulation to Sun/PC style.
//     Ps = 2 0 0 4  -> Reset bracketed paste mode.
Program.prototype.rm =
Program.prototype.resetMode = function() {
  var param = Array.prototype.slice.call(arguments).join(';');
  //if (private) {
  //  return this.write('\x1b[?' + (param || '') + 'l');
  //}
  return this.write('\x1b[' + (param || '') + 'l');
};

Program.prototype.decrst = function() {
  var param = Array.prototype.slice.call(arguments).join(';');
  return this.resetMode('?' + param);
};

Program.prototype.dectcemh =
Program.prototype.hideCursor = function() {
  return this.resetMode('?25');
};

Program.prototype.normalBuffer = function() {
  //return this.resetMode('?47');
  //return this.resetMode('?1047');
  return this.resetMode('?1049');
};

Program.prototype.enableMouse = function() {
  if (this.term('urxvt')) {
    return this.setMouse({ urxvtMouse: true });
  }

  if (this.term('xterm') || this.term('screen')) {
    return this.setMouse({
      allMotion: true,
      utfMouse: true,
      sendFocus: true
    });
  }

  if (this.term('vt')) {
    return this.setMouse({ vt200Mouse: true });
  }
};

Program.prototype.disableMouse = function() {
  return this.setMouse({
    x10Mouse: false,
    vt200Mouse: false,
    hiliteTracking: false,
    cellMotion: false,
    allMotion: false,
    sendFocus: false,
    utfMouse: false,
    sgrMouse: false,
    urxvtMouse: false
  });
};

// Set Mouse
Program.prototype.setMouse = function(opt) {
  if (opt.normalMouse != null) {
    opt.cellMotion = opt.normalMouse;
    opt.allMotion = opt.normalMouse;
  }

  //     Ps = 9  -> Send Mouse X & Y on button press.  See the sec-
  //     tion Mouse Tracking.
  //     Ps = 9  -> Don't send Mouse X & Y on button press.
  // x10 mouse
  if (opt.x10Mouse != null) {
    if (opt.x10Mouse) this.setMode('?9');
    else this.resetMode('?9');
  }

  //     Ps = 1 0 0 0  -> Send Mouse X & Y on button press and
  //     release.  See the section Mouse Tracking.
  //     Ps = 1 0 0 0  -> Don't send Mouse X & Y on button press and
  //     release.  See the section Mouse Tracking.
  // vt200 mouse
  if (opt.vt200Mouse != null) {
    if (opt.vt200Mouse) this.setMode('?1000');
    else this.resetMode('?1000');
  }

  //     Ps = 1 0 0 1  -> Use Hilite Mouse Tracking.
  //     Ps = 1 0 0 1  -> Don't use Hilite Mouse Tracking.
  if (opt.hiliteTracking != null) {
    if (opt.hiliteTracking) this.setMode('?1001');
    else this.resetMode('?1001');
  }

  //     Ps = 1 0 0 2  -> Use Cell Motion Mouse Tracking.
  //     Ps = 1 0 0 2  -> Don't use Cell Motion Mouse Tracking.
  // button event mouse
  if (opt.cellMotion != null) {
    if (opt.cellMotion) this.setMode('?1002');
    else this.resetMode('?1002');
  }

  //     Ps = 1 0 0 3  -> Use All Motion Mouse Tracking.
  //     Ps = 1 0 0 3  -> Don't use All Motion Mouse Tracking.
  // any event mouse
  if (opt.allMotion != null) {
    if (opt.allMotion) this.setMode('?1003');
    else this.resetMode('?1003');
  }

  //     Ps = 1 0 0 4  -> Send FocusIn/FocusOut events.
  //     Ps = 1 0 0 4  -> Don't send FocusIn/FocusOut events.
  if (opt.sendFocus != null) {
    if (opt.sendFocus) this.setMode('?1004');
    else this.resetMode('?1004');
  }

  //     Ps = 1 0 0 5  -> Enable Extended Mouse Mode.
  //     Ps = 1 0 0 5  -> Disable Extended Mouse Mode.
  if (opt.utfMouse != null) {
    if (opt.utfMouse) this.setMode('?1005');
    else this.resetMode('?1005');
  }

  // sgr mouse
  if (opt.sgrMouse != null) {
    if (opt.sgrMouse) this.setMode('?1006');
    else this.resetMode('?1006');
  }

  // urxvt mouse
  if (opt.urxvtMouse != null) {
    if (opt.urxvtMouse) this.setMode('?1015');
    else this.resetMode('?1015');
  }
};

// CSI Ps ; Ps r
//   Set Scrolling Region [top;bottom] (default = full size of win-
//   dow) (DECSTBM).
// CSI ? Pm r
Program.prototype.decstbm =
Program.prototype.setScrollRegion = function(top, bottom) {
  this.scrollTop = (top || 1) - 1;
  this.scrollBottom = (bottom || this.rows) - 1;
  this.x = 1;
  this.y = 1;
  return this.write('\x1b[' + (top || 1) + ';' + (bottom || this.rows) + 'r');
};

// CSI s
//   Save cursor (ANSI.SYS).
Program.prototype.saveCursor = function() {
  this.savedX = this.x;
  this.savedY = this.y;
  return this.write('\x1b[s');
};

// CSI u
//   Restore cursor (ANSI.SYS).
Program.prototype.restoreCursor = function() {
  this.x = this.savedX || 1;
  this.y = this.savedY || 1;
  return this.write('\x1b[u');
};

/**
 * Lesser Used
 */

// CSI Ps I
//   Cursor Forward Tabulation Ps tab stops (default = 1) (CHT).
Program.prototype.cht =
Program.prototype.cursorForwardTab = function(param) {
  this.x += 8;
  return this.write('\x1b[' + (param || 1) + 'I');
};

// CSI Ps S  Scroll up Ps lines (default = 1) (SU).
Program.prototype.su =
Program.prototype.scrollUp = function(param) {
  this.y -= param || 1;
  return this.write('\x1b[' + (param || 1) + 'I');
};

// CSI Ps T  Scroll down Ps lines (default = 1) (SD).
Program.prototype.sd =
Program.prototype.scrollDown = function(param) {
  this.y += param || 1;
  return this.write('\x1b[' + (param || 1) + 'T');
};

// CSI Ps ; Ps ; Ps ; Ps ; Ps T
//   Initiate highlight mouse tracking.  Parameters are
//   [func;startx;starty;firstrow;lastrow].  See the section Mouse
//   Tracking.
Program.prototype.initMouseTracking = function() {
  return this.write('\x1b[' + Array.prototype.slice.call(arguments).join(';') + 'T');
};

// CSI > Ps; Ps T
//   Reset one or more features of the title modes to the default
//   value.  Normally, "reset" disables the feature.  It is possi-
//   ble to disable the ability to reset features by compiling a
//   different default for the title modes into xterm.
//     Ps = 0  -> Do not set window/icon labels using hexadecimal.
//     Ps = 1  -> Do not query window/icon labels using hexadeci-
//     mal.
//     Ps = 2  -> Do not set window/icon labels using UTF-8.
//     Ps = 3  -> Do not query window/icon labels using UTF-8.
//   (See discussion of "Title Modes").
Program.prototype.resetTitleModes = function() {
  return this.write('\x1b[>' + Array.prototype.slice.call(arguments).join(';') + 'T');
};

// CSI Ps Z  Cursor Backward Tabulation Ps tab stops (default = 1) (CBT).
Program.prototype.cbt =
Program.prototype.cursorBackwardTab = function(param) {
  this.x -= 8;
  return this.write('\x1b[' + (param || 1) + 'Z');
};

// CSI Ps b  Repeat the preceding graphic character Ps times (REP).
Program.prototype.rep =
Program.prototype.repeatPrecedingCharacter = function(param) {
  //this.x += param || 1;
  return this.write('\x1b[' + (param || 1) + 'b');
};

// CSI Ps g  Tab Clear (TBC).
//     Ps = 0  -> Clear Current Column (default).
//     Ps = 3  -> Clear All.
// Potentially:
//   Ps = 2  -> Clear Stops on Line.
//   http://vt100.net/annarbor/aaa-ug/section6.html
Program.prototype.tbc =
Program.prototype.tabClear = function(param) {
  return this.write('\x1b[' + (param || 0) + 'g');
};

// CSI Pm i  Media Copy (MC).
//     Ps = 0  -> Print screen (default).
//     Ps = 4  -> Turn off printer controller mode.
//     Ps = 5  -> Turn on printer controller mode.
// CSI ? Pm i
//   Media Copy (MC, DEC-specific).
//     Ps = 1  -> Print line containing cursor.
//     Ps = 4  -> Turn off autoprint mode.
//     Ps = 5  -> Turn on autoprint mode.
//     Ps = 1  0  -> Print composed display, ignores DECPEX.
//     Ps = 1  1  -> Print all pages.
Program.prototype.mc =
Program.prototype.mediaCopy = function() {
  //if (dec) {
  //  this.write('\x1b[?' + Array.prototype.slice.call(arguments).join(';') + 'i');
  //  return;
  //}
  return this.write('\x1b[' + Array.prototype.slice.call(arguments).join(';') + 'i');
};

// CSI > Ps; Ps m
//   Set or reset resource-values used by xterm to decide whether
//   to construct escape sequences holding information about the
//   modifiers pressed with a given key.  The first parameter iden-
//   tifies the resource to set/reset.  The second parameter is the
//   value to assign to the resource.  If the second parameter is
//   omitted, the resource is reset to its initial value.
//     Ps = 1  -> modifyCursorKeys.
//     Ps = 2  -> modifyFunctionKeys.
//     Ps = 4  -> modifyOtherKeys.
//   If no parameters are given, all resources are reset to their
//   initial values.
Program.prototype.setResources = function() {
  return this.write('\x1b[>' + Array.prototype.slice.call(arguments).join(';') + 'm');
};

// CSI > Ps n
//   Disable modifiers which may be enabled via the CSI > Ps; Ps m
//   sequence.  This corresponds to a resource value of "-1", which
//   cannot be set with the other sequence.  The parameter identi-
//   fies the resource to be disabled:
//     Ps = 1  -> modifyCursorKeys.
//     Ps = 2  -> modifyFunctionKeys.
//     Ps = 4  -> modifyOtherKeys.
//   If the parameter is omitted, modifyFunctionKeys is disabled.
//   When modifyFunctionKeys is disabled, xterm uses the modifier
//   keys to make an extended sequence of functions rather than
//   adding a parameter to each function key to denote the modi-
//   fiers.
Program.prototype.disableModifiers = function(param) {
  return this.write('\x1b[>' + (param || '') + 'n');
};

// CSI > Ps p
//   Set resource value pointerMode.  This is used by xterm to
//   decide whether to hide the pointer cursor as the user types.
//   Valid values for the parameter:
//     Ps = 0  -> never hide the pointer.
//     Ps = 1  -> hide if the mouse tracking mode is not enabled.
//     Ps = 2  -> always hide the pointer.  If no parameter is
//     given, xterm uses the default, which is 1 .
Program.prototype.setPointerMode = function(param) {
  return this.write('\x1b[>' + (param || '') + 'p');
};

// CSI ! p   Soft terminal reset (DECSTR).
// http://vt100.net/docs/vt220-rm/table4-10.html
Program.prototype.decstr =
Program.prototype.softReset = function() {
  return this.write('\x1b[!p');
};

// CSI Ps$ p
//   Request ANSI mode (DECRQM).  For VT300 and up, reply is
//     CSI Ps; Pm$ y
//   where Ps is the mode number as in RM, and Pm is the mode
//   value:
//     0 - not recognized
//     1 - set
//     2 - reset
//     3 - permanently set
//     4 - permanently reset
Program.prototype.decrqm =
Program.prototype.requestAnsiMode = function(param) {
  return this.write('\x1b[' + (param || '') + '$p');
};

// CSI ? Ps$ p
//   Request DEC private mode (DECRQM).  For VT300 and up, reply is
//     CSI ? Ps; Pm$ p
//   where Ps is the mode number as in DECSET, Pm is the mode value
//   as in the ANSI DECRQM.
Program.prototype.decrqmp =
Program.prototype.requestPrivateMode = function(param) {
  return this.write('\x1b[?' + (param || '') + '$p');
};

// CSI Ps ; Ps " p
//   Set conformance level (DECSCL).  Valid values for the first
//   parameter:
//     Ps = 6 1  -> VT100.
//     Ps = 6 2  -> VT200.
//     Ps = 6 3  -> VT300.
//   Valid values for the second parameter:
//     Ps = 0  -> 8-bit controls.
//     Ps = 1  -> 7-bit controls (always set for VT100).
//     Ps = 2  -> 8-bit controls.
Program.prototype.decscl =
Program.prototype.setConformanceLevel = function() {
  return this.write('\x1b[' + Array.prototype.slice.call(arguments).join(';') + '"p');
};

// CSI Ps q  Load LEDs (DECLL).
//     Ps = 0  -> Clear all LEDS (default).
//     Ps = 1  -> Light Num Lock.
//     Ps = 2  -> Light Caps Lock.
//     Ps = 3  -> Light Scroll Lock.
//     Ps = 2  1  -> Extinguish Num Lock.
//     Ps = 2  2  -> Extinguish Caps Lock.
//     Ps = 2  3  -> Extinguish Scroll Lock.
Program.prototype.decll =
Program.prototype.loadLEDs = function(param) {
  return this.write('\x1b[' + (param || '') + 'q');
};

// CSI Ps SP q
//   Set cursor style (DECSCUSR, VT520).
//     Ps = 0  -> blinking block.
//     Ps = 1  -> blinking block (default).
//     Ps = 2  -> steady block.
//     Ps = 3  -> blinking underline.
//     Ps = 4  -> steady underline.
Program.prototype.decscusr =
Program.prototype.setCursorStyle = function(param) {
  switch (param) {
    case 'blinking block':
      param = '0';
      param = '1';
      break;
    case 'block':
    case 'steady block':
      param = '2';
      break;
    case 'blinking underline':
      param = '3';
      break;
    case 'underline':
    case 'steady underline':
      param = '4';
      break;
    case 'blinking bar':
      param = '5';
      break;
    case 'bar':
    case 'steady bar':
      param = '6';
      break;
  }
  return this.write('\x1b[' + (param || 1) + ' q');
};

// CSI Ps " q
//   Select character protection attribute (DECSCA).  Valid values
//   for the parameter:
//     Ps = 0  -> DECSED and DECSEL can erase (default).
//     Ps = 1  -> DECSED and DECSEL cannot erase.
//     Ps = 2  -> DECSED and DECSEL can erase.
Program.prototype.decsca =
Program.prototype.setCharProtectionAttr = function(param) {
  return this.write('\x1b[' + (param || 0) + '"q');
};

// CSI ? Pm r
//   Restore DEC Private Mode Values.  The value of Ps previously
//   saved is restored.  Ps values are the same as for DECSET.
Program.prototype.restorePrivateValues = function() {
  return this.write('\x1b[?' + Array.prototype.slice.call(arguments).join(';') + 'r');
};

// CSI Pt; Pl; Pb; Pr; Ps$ r
//   Change Attributes in Rectangular Area (DECCARA), VT400 and up.
//     Pt; Pl; Pb; Pr denotes the rectangle.
//     Ps denotes the SGR attributes to change: 0, 1, 4, 5, 7.
// NOTE: xterm doesn't enable this code by default.
Program.prototype.deccara =
Program.prototype.setAttrInRectangle = function() {
  return this.write('\x1b[' + Array.prototype.slice.call(arguments).join(';') + '$r');
};

// CSI ? Pm s
//   Save DEC Private Mode Values.  Ps values are the same as for
//   DECSET.
Program.prototype.savePrivateValues = function(params) {
  return this.write('\x1b[?' + Array.prototype.slice.call(arguments).join(';') + 's');
};

// CSI Ps ; Ps ; Ps t
//   Window manipulation (from dtterm, as well as extensions).
//   These controls may be disabled using the allowWindowOps
//   resource.  Valid values for the first (and any additional
//   parameters) are:
//     Ps = 1  -> De-iconify window.
//     Ps = 2  -> Iconify window.
//     Ps = 3  ;  x ;  y -> Move window to [x, y].
//     Ps = 4  ;  height ;  width -> Resize the xterm window to
//     height and width in pixels.
//     Ps = 5  -> Raise the xterm window to the front of the stack-
//     ing order.
//     Ps = 6  -> Lower the xterm window to the bottom of the
//     stacking order.
//     Ps = 7  -> Refresh the xterm window.
//     Ps = 8  ;  height ;  width -> Resize the text area to
//     [height;width] in characters.
//     Ps = 9  ;  0  -> Restore maximized window.
//     Ps = 9  ;  1  -> Maximize window (i.e., resize to screen
//     size).
//     Ps = 1 0  ;  0  -> Undo full-screen mode.
//     Ps = 1 0  ;  1  -> Change to full-screen.
//     Ps = 1 1  -> Report xterm window state.  If the xterm window
//     is open (non-iconified), it returns CSI 1 t .  If the xterm
//     window is iconified, it returns CSI 2 t .
//     Ps = 1 3  -> Report xterm window position.  Result is CSI 3
//     ; x ; y t
//     Ps = 1 4  -> Report xterm window in pixels.  Result is CSI
//     4  ;  height ;  width t
//     Ps = 1 8  -> Report the size of the text area in characters.
//     Result is CSI  8  ;  height ;  width t
//     Ps = 1 9  -> Report the size of the screen in characters.
//     Result is CSI  9  ;  height ;  width t
//     Ps = 2 0  -> Report xterm window's icon label.  Result is
//     OSC  L  label ST
//     Ps = 2 1  -> Report xterm window's title.  Result is OSC  l
//     label ST
//     Ps = 2 2  ;  0  -> Save xterm icon and window title on
//     stack.
//     Ps = 2 2  ;  1  -> Save xterm icon title on stack.
//     Ps = 2 2  ;  2  -> Save xterm window title on stack.
//     Ps = 2 3  ;  0  -> Restore xterm icon and window title from
//     stack.
//     Ps = 2 3  ;  1  -> Restore xterm icon title from stack.
//     Ps = 2 3  ;  2  -> Restore xterm window title from stack.
//     Ps >= 2 4  -> Resize to Ps lines (DECSLPP).
Program.prototype.manipulateWindow = function() {
  var args = Array.prototype.slice.call(arguments);

  var callback = typeof args[args.length-1] === 'function'
    ? args.pop()
    : function() {};

  return this.receive('\x1b[' + args.join(';') + 't', callback);
};

Program.prototype.getWindowSize = function(callback) {
  return this.manipulateWindow('18', function(err, data) {
    if (err) return callback(err);
    data = data.slice(2, -1).split(';');
    return callback(null, {
      height: +data[0],
      width: +data[1]
    });
  });
};

// CSI Pt; Pl; Pb; Pr; Ps$ t
//   Reverse Attributes in Rectangular Area (DECRARA), VT400 and
//   up.
//     Pt; Pl; Pb; Pr denotes the rectangle.
//     Ps denotes the attributes to reverse, i.e.,  1, 4, 5, 7.
// NOTE: xterm doesn't enable this code by default.
Program.prototype.decrara =
Program.prototype.reverseAttrInRectangle = function(params) {
  return this.write('\x1b[' + Array.prototype.slice.call(arguments).join(';') + '$t');
};

// CSI > Ps; Ps t
//   Set one or more features of the title modes.  Each parameter
//   enables a single feature.
//     Ps = 0  -> Set window/icon labels using hexadecimal.
//     Ps = 1  -> Query window/icon labels using hexadecimal.
//     Ps = 2  -> Set window/icon labels using UTF-8.
//     Ps = 3  -> Query window/icon labels using UTF-8.  (See dis-
//     cussion of "Title Modes")
Program.prototype.setTitleModeFeature = function(params) {
  return this.write('\x1b[>' + Array.prototype.slice.call(arguments).join(';') + 't');
};

// CSI Ps SP t
//   Set warning-bell volume (DECSWBV, VT520).
//     Ps = 0  or 1  -> off.
//     Ps = 2 , 3  or 4  -> low.
//     Ps = 5 , 6 , 7 , or 8  -> high.
Program.prototype.decswbv =
Program.prototype.setWarningBellVolume = function(params) {
  return this.write('\x1b[' + (param || '') + ' t');
};

// CSI Ps SP u
//   Set margin-bell volume (DECSMBV, VT520).
//     Ps = 1  -> off.
//     Ps = 2 , 3  or 4  -> low.
//     Ps = 0 , 5 , 6 , 7 , or 8  -> high.
Program.prototype.decsmbv =
Program.prototype.setMarginBellVolume = function(params) {
  return this.write('\x1b[' + (param || '') + ' u');
};

// CSI Pt; Pl; Pb; Pr; Pp; Pt; Pl; Pp$ v
//   Copy Rectangular Area (DECCRA, VT400 and up).
//     Pt; Pl; Pb; Pr denotes the rectangle.
//     Pp denotes the source page.
//     Pt; Pl denotes the target location.
//     Pp denotes the target page.
// NOTE: xterm doesn't enable this code by default.
Program.prototype.deccra =
Program.prototype.copyRectangle = function(params) {
  return this.write('\x1b[' + Array.prototype.slice.call(arguments).join(';') + '$v');
};

// CSI Pt ; Pl ; Pb ; Pr ' w
//   Enable Filter Rectangle (DECEFR), VT420 and up.
//   Parameters are [top;left;bottom;right].
//   Defines the coordinates of a filter rectangle and activates
//   it.  Anytime the locator is detected outside of the filter
//   rectangle, an outside rectangle event is generated and the
//   rectangle is disabled.  Filter rectangles are always treated
//   as "one-shot" events.  Any parameters that are omitted default
//   to the current locator position.  If all parameters are omit-
//   ted, any locator motion will be reported.  DECELR always can-
//   cels any prevous rectangle definition.
Program.prototype.decefr =
Program.prototype.enableFilterRectangle = function(params) {
  return this.write('\x1b[' + Array.prototype.slice.call(arguments).join(';') + '\'w');
};

// CSI Ps x  Request Terminal Parameters (DECREQTPARM).
//   if Ps is a "0" (default) or "1", and xterm is emulating VT100,
//   the control sequence elicits a response of the same form whose
//   parameters describe the terminal:
//     Ps -> the given Ps incremented by 2.
//     Pn = 1  <- no parity.
//     Pn = 1  <- eight bits.
//     Pn = 1  <- 2  8  transmit 38.4k baud.
//     Pn = 1  <- 2  8  receive 38.4k baud.
//     Pn = 1  <- clock multiplier.
//     Pn = 0  <- STP flags.
Program.prototype.decreqtparm =
Program.prototype.requestParameters = function(params) {
  return this.write('\x1b[' + (param || 0) + 'x');
};

// CSI Ps x  Select Attribute Change Extent (DECSACE).
//     Ps = 0  -> from start to end position, wrapped.
//     Ps = 1  -> from start to end position, wrapped.
//     Ps = 2  -> rectangle (exact).
Program.prototype.decsace =
Program.prototype.selectChangeExtent = function(params) {
  return this.write('\x1b[' + (param || 0) + 'x');
};

// CSI Pc; Pt; Pl; Pb; Pr$ x
//   Fill Rectangular Area (DECFRA), VT420 and up.
//     Pc is the character to use.
//     Pt; Pl; Pb; Pr denotes the rectangle.
// NOTE: xterm doesn't enable this code by default.
Program.prototype.decfra =
Program.prototype.fillRectangle = function(params) {
  return this.write('\x1b[' + Array.prototype.slice.call(arguments).join(';') + '$x');
};

// CSI Ps ; Pu ' z
//   Enable Locator Reporting (DECELR).
//   Valid values for the first parameter:
//     Ps = 0  -> Locator disabled (default).
//     Ps = 1  -> Locator enabled.
//     Ps = 2  -> Locator enabled for one report, then disabled.
//   The second parameter specifies the coordinate unit for locator
//   reports.
//   Valid values for the second parameter:
//     Pu = 0  <- or omitted -> default to character cells.
//     Pu = 1  <- device physical pixels.
//     Pu = 2  <- character cells.
Program.prototype.decelr =
Program.prototype.enableLocatorReporting = function(params) {
  return this.write('\x1b[' + Array.prototype.slice.call(arguments).join(';') + '\'z');
};

// CSI Pt; Pl; Pb; Pr$ z
//   Erase Rectangular Area (DECERA), VT400 and up.
//     Pt; Pl; Pb; Pr denotes the rectangle.
// NOTE: xterm doesn't enable this code by default.
Program.prototype.decera =
Program.prototype.eraseRectangle = function(params) {
  return this.write('\x1b[' + Array.prototype.slice.call(arguments).join(';') + '$z');
};

// CSI Pm ' {
//   Select Locator Events (DECSLE).
//   Valid values for the first (and any additional parameters)
//   are:
//     Ps = 0  -> only respond to explicit host requests (DECRQLP).
//                (This is default).  It also cancels any filter
//   rectangle.
//     Ps = 1  -> report button down transitions.
//     Ps = 2  -> do not report button down transitions.
//     Ps = 3  -> report button up transitions.
//     Ps = 4  -> do not report button up transitions.
Program.prototype.decsle =
Program.prototype.setLocatorEvents = function(params) {
  return this.write('\x1b[' + Array.prototype.slice.call(arguments).join(';') + '\'{');
};

// CSI Pt; Pl; Pb; Pr$ {
//   Selective Erase Rectangular Area (DECSERA), VT400 and up.
//     Pt; Pl; Pb; Pr denotes the rectangle.
Program.prototype.decsera =
Program.prototype.selectiveEraseRectangle = function(params) {
  return this.write('\x1b[' + Array.prototype.slice.call(arguments).join(';') + '${');
};

// CSI Ps ' |
//   Request Locator Position (DECRQLP).
//   Valid values for the parameter are:
//     Ps = 0 , 1 or omitted -> transmit a single DECLRP locator
//     report.

//   If Locator Reporting has been enabled by a DECELR, xterm will
//   respond with a DECLRP Locator Report.  This report is also
//   generated on button up and down events if they have been
//   enabled with a DECSLE, or when the locator is detected outside
//   of a filter rectangle, if filter rectangles have been enabled
//   with a DECEFR.

//     -> CSI Pe ; Pb ; Pr ; Pc ; Pp &  w

//   Parameters are [event;button;row;column;page].
//   Valid values for the event:
//     Pe = 0  -> locator unavailable - no other parameters sent.
//     Pe = 1  -> request - xterm received a DECRQLP.
//     Pe = 2  -> left button down.
//     Pe = 3  -> left button up.
//     Pe = 4  -> middle button down.
//     Pe = 5  -> middle button up.
//     Pe = 6  -> right button down.
//     Pe = 7  -> right button up.
//     Pe = 8  -> M4 button down.
//     Pe = 9  -> M4 button up.
//     Pe = 1 0  -> locator outside filter rectangle.
//   ``button'' parameter is a bitmask indicating which buttons are
//     pressed:
//     Pb = 0  <- no buttons down.
//     Pb & 1  <- right button down.
//     Pb & 2  <- middle button down.
//     Pb & 4  <- left button down.
//     Pb & 8  <- M4 button down.
//   ``row'' and ``column'' parameters are the coordinates of the
//     locator position in the xterm window, encoded as ASCII deci-
//     mal.
//   The ``page'' parameter is not used by xterm, and will be omit-
//   ted.
Program.prototype.decrqlp =
Program.prototype.requestLocatorPosition = function(params, callback) {
  return this.receive('\x1b[' + (param || '') + '\'|', callback);
};

// CSI P m SP }
// Insert P s Column(s) (default = 1) (DECIC), VT420 and up.
// NOTE: xterm doesn't enable this code by default.
Program.prototype.decic =
Program.prototype.insertColumns = function() {
  return this.write('\x1b[' + Array.prototype.slice.call(arguments).join(';') + ' }');
};

// CSI P m SP ~
// Delete P s Column(s) (default = 1) (DECDC), VT420 and up
// NOTE: xterm doesn't enable this code by default.
Program.prototype.decdc =
Program.prototype.deleteColumns = function() {
  return this.write('\x1b[' + Array.prototype.slice.call(arguments).join(';') + ' ~');
};

/**
 * Expose
 */

module.exports = Program;
