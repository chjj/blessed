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

  this.listen();
}

Program.prototype.__proto__ = EventEmitter.prototype;

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

  readline.emitKeypressEvents(this.input);

  this.input.resume();

  this.output.on('resize', function() {
    self.cols = self.output.columns;
    self.rows = self.output.rows;
    self.emit('resize');
  });
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

  if (text) this.echo(text);
};

Program.prototype.listChoices = function(list) {
  var self = this;
};

Program.prototype.write =
Program.prototype.echo = function(text, attr) {
  if (attr) {
    this.attr(attr, true);
    this.echo(text);
    this.attr(attr, false);
    return;
  }
  return this.output.write(text);
};

Program.prototype.setX = function(x) {
  return this.cursorPos(this.y, x);
};

Program.prototype.setY = function(y) {
  return this.cursorPos(y, this.x);
};

Program.prototype.move = function(x, y) {
  return this.cursorPos(y, x);
};

// NOTE: There are better ways to do rel movements.

Program.prototype.rsetX = function(x) {
  return this.cursorPos(this.y, this.x + x);
};

Program.prototype.rsetY = function(y) {
  return this.cursorPos(this.y + y, this.x);
};

Program.prototype.rmove = function(x, y) {
  return this.cursorPos(this.y + y, this.x + x);
};

/*
Program.prototype.__defineGetter('x', function() {
  return this._x || 1;
});
Program.prototype.__defineSetter__('x', function(x) {
  this.cursorPos(x, this.y);
  return this._x = x;
});
Program.prototype.__defineGetter('y', function() {
  return this._y || 1;
});
Program.prototype.__defineSetter__('y', function(y) {
  this.cursorPos(this.x, y);
  return this._y = y;
});
*/

/**
 * Normal
 */

Program.prototype.nul = function() {
  this.echo('\0');
};

Program.prototype.bell = function() {
  this.echo('\x07');
};

Program.prototype.vtab = function() {
  this.echo('\x0b');
};

Program.prototype.form = function() {
  this.echo('\x0c');
};

Program.prototype.backspace = function() {
  this.echo('\x08');
};

Program.prototype.tab = function() {
  this.echo('\t');
};

Program.prototype.shiftOut = function() {
  this.echo('\x0e');
};

Program.prototype.shiftIn = function() {
  this.echo('\x0f');
};

Program.prototype.return = function() {
  this.echo('\r');
};

Program.prototype.feed = function() {
  this.echo('\n');
};

/**
 * Esc
 */

// ESC D Index (IND is 0x84).
Program.prototype.index = function() {
  this.echo('\x1bD');
};

// ESC M Reverse Index (RI is 0x8d).
Program.prototype.reverse =
Program.prototype.reverseIndex = function() {
  this.echo('\x1bM');
};

// ESC c Full Reset (RIS).
Program.prototype.reset = function() {
  this.echo('\x1bc');
};

// ESC H Tab Set (HTS is 0x88).
Program.prototype.tabSet = function() {
  this.echo('\x1bH');
};

Program.prototype.esc = function(code) {
  this.echo('\x1b' + code);
};

/**
 * CSI
 */

Program.prototype.csi = function(code) {
  this.esc('[' + code);
};

// CSI Ps A
// Cursor Up Ps Times (default = 1) (CUU).
Program.prototype.up =
Program.prototype.cursorUp = function(param) {
  this.y -= param || 1;
  this.echo('\x1b[' + (param || '') + 'A');
};

// CSI Ps B
// Cursor Down Ps Times (default = 1) (CUD).
Program.prototype.down =
Program.prototype.cursorDown = function(param) {
  this.y += param || 1;
  this.echo('\x1b[' + (param || '') + 'B');
};

// CSI Ps C
// Cursor Forward Ps Times (default = 1) (CUF).
Program.prototype.forward =
Program.prototype.cursorForward = function(param) {
  this.x += param || 1;
  this.echo('\x1b[' + (param || '') + 'C');
};

// CSI Ps D
// Cursor Backward Ps Times (default = 1) (CUB).
Program.prototype.back =
Program.prototype.cursorBackward = function(param) {
  this.x -= param || 1;
  this.echo('\x1b[' + (param || '') + 'D');
};

// CSI Ps ; Ps H
// Cursor Position [row;column] (default = [1,1]) (CUP).
Program.prototype.pos =
Program.prototype.cursorPos = function(row, col) {
  this.x = col || 1;
  this.y = row || 1;
  this.echo('\x1b[' + (row || '1') + ';' + (col || '1') + 'H');
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
Program.prototype.eraseInDisplay = function(param) {
  switch (param) {
    case 'above':
      this.echo('\x1b[1J');
      break;
    case 'all':
      this.echo('\x1b[2J');
      break;
    case 'saved':
      this.echo('\x1b[3J');
      break;
    case 'below':
    default:
      this.echo('\x1b[J');
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
Program.prototype.eraseInLine = function(param) {
  switch (param) {
    case 'left':
      this.echo('\x1b[1K');
      break;
    case 'all':
      this.echo('\x1b[2K');
      break;
    case 'right':
    default:
      this.echo('\x1b[K');
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
Program.prototype.attr =
Program.prototype.charAttributes = function(param, val) {
  switch (param) {
    case 'normal':
      this.echo('\x1b[m');
      break;
    case 'bold':
      if (val === false) {
        this.echo('\x1b[22m');
      } else {
        this.echo('\x1b[1m');
      }
      break;
    case 'underlined':
      if (val === false) {
        this.echo('\x1b[24m');
      } else {
        this.echo('\x1b[4m');
      }
      break;
    case 'blink':
      if (val === false) {
        this.echo('\x1b[25m');
      } else {
        this.echo('\x1b[5m');
      }
      break;
    case 'inverse':
      if (val === false) {
        this.echo('\x1b[27m');
      } else {
        this.echo('\x1b[7m');
      }
      break;
    case 'invisible':
      if (val === false) {
        this.echo('\x1b[28m');
      } else {
        this.echo('\x1b[8m');
      }
      break;
    case 'invisible':
      if (val === false) {
        this.echo('\x1b[28m');
      } else {
        this.echo('\x1b[8m');
      }
      break;

    case 'black fg':
      if (val === false) {
        this.echo('\x1b[39m');
        break;
      }
      this.echo('\x1b[30m');
      break;
    case 'red fg':
      if (val === false) {
        this.echo('\x1b[39m');
        break;
      }
      this.echo('\x1b[31m');
      break;
    case 'green fg':
      if (val === false) {
        this.echo('\x1b[39m');
        break;
      }
      this.echo('\x1b[32m');
      break;
    case 'yellow fg':
      if (val === false) {
        this.echo('\x1b[39m');
        break;
      }
      this.echo('\x1b[33m');
      break;
    case 'blue fg':
      if (val === false) {
        this.echo('\x1b[39m');
        break;
      }
      this.echo('\x1b[34m');
      break;
    case 'magenta fg':
      if (val === false) {
        this.echo('\x1b[39m');
        break;
      }
      this.echo('\x1b[35m');
      break;
    case 'cyan fg':
      if (val === false) {
        this.echo('\x1b[39m');
        break;
      }
      this.echo('\x1b[36m');
      break;
    case 'white fg':
      if (val === false) {
        this.echo('\x1b[39m');
        break;
      }
      this.echo('\x1b[37m');
      break;
    case 'default fg':
      this.echo('\x1b[39m');
      break;

    case 'black bg':
      if (val === false) {
        this.echo('\x1b[49m');
        break;
      }
      this.echo('\x1b[40m');
      break;
    case 'red bg':
      if (val === false) {
        this.echo('\x1b[49m');
        break;
      }
      this.echo('\x1b[41m');
      break;
    case 'green bg':
      if (val === false) {
        this.echo('\x1b[49m');
        break;
      }
      this.echo('\x1b[42m');
      break;
    case 'yellow bg':
      if (val === false) {
        this.echo('\x1b[49m');
        break;
      }
      this.echo('\x1b[43m');
      break;
    case 'blue bg':
      if (val === false) {
        this.echo('\x1b[49m');
        break;
      }
      this.echo('\x1b[44m');
      break;
    case 'magenta bg':
      if (val === false) {
        this.echo('\x1b[49m');
        break;
      }
      this.echo('\x1b[45m');
      break;
    case 'cyan bg':
      if (val === false) {
        this.echo('\x1b[49m');
        break;
      }
      this.echo('\x1b[46m');
      break;
    case 'white bg':
      if (val === false) {
        this.echo('\x1b[49m');
        break;
      }
      this.echo('\x1b[47m');
      break;
    case 'default bg':
      this.echo('\x1b[49m');
      break;
    default:
      this.echo('\x1b[' + param + 'm');
      break;
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
Program.prototype.deviceStatus = function(params) {
};

/**
 * Additions
 */

Program.prototype.isArray = function(obj) {
  return Object.prototype.toString.call(obj) === '[object Array]';
};

// CSI Ps @
// Insert Ps (Blank) Character(s) (default = 1) (ICH).
Program.prototype.insertChars = function(param) {
  this.echo('\x1b[' + (param || '') + '@');
};

// CSI Ps E
// Cursor Next Line Ps Times (default = 1) (CNL).
// same as CSI Ps B ?
Program.prototype.cursorNextLine = function(param) {
  this.y += param || 1;
  this.echo('\x1b[' + (param || '') + 'E');
};

// CSI Ps F
// Cursor Preceding Line Ps Times (default = 1) (CNL).
// reuse CSI Ps A ?
Program.prototype.cursorPrecedingLine = function(param) {
  this.y -= param || 1;
  this.echo('\x1b[' + (param || '') + 'F');
};

// CSI Ps G
// Cursor Character Absolute  [column] (default = [row,1]) (CHA).
Program.prototype.cursorCharAbsolute = function(param) {
  this.x = param || 1;
  this.y = 1;
  this.echo('\x1b[' + (param || '') + 'G');
};

// CSI Ps L
// Insert Ps Line(s) (default = 1) (IL).
Program.prototype.insertLines = function(param) {
  this.echo('\x1b[' + (param || '') + 'L');
};

// CSI Ps M
// Delete Ps Line(s) (default = 1) (DL).
Program.prototype.deleteLines = function(param) {
  this.echo('\x1b[' + (param || '') + 'M');
};

// CSI Ps P
// Delete Ps Character(s) (default = 1) (DCH).
Program.prototype.deleteChars = function(param) {
  this.echo('\x1b[' + (param || '') + 'P');
};

// CSI Ps X
// Erase Ps Character(s) (default = 1) (ECH).
Program.prototype.eraseChars = function(param) {
  this.echo('\x1b[' + (param || '') + 'X');
};

// CSI Pm `  Character Position Absolute
//   [column] (default = [row,1]) (HPA).
Program.prototype.charPosAbsolute = function() {
  var param = Array.prototype.slice.call(arguments).join(';');
  this.echo('\x1b[' + (param || '') + '`');
};

// 141 61 a * HPR -
// Horizontal Position Relative
// reuse CSI Ps C ?
Program.prototype.HPositionRelative = function(param) {
  this.echo('\x1b[' + (param || '') + 'a');
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
Program.prototype.linePosAbsolute = function() {
  var param = Array.prototype.slice.call(arguments).join(';');
  this.echo('\x1b[' + (param || '') + 'd');
};

// 145 65 e * VPR - Vertical Position Relative
// reuse CSI Ps B ?
Program.prototype.VPositionRelative = function(param) {
  this.echo('\x1b[' + (param || '') + 'e');
};

// CSI Ps ; Ps f
//   Horizontal and Vertical Position [row;column] (default =
//   [1,1]) (HVP).
Program.prototype.HVPosition = function(row, col) {
  this.echo('\x1b[' + (row || '1') + ';' + (col || '1') + 'f');
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
Program.prototype.setMode = function() {
  var param = Array.prototype.slice.call(arguments).join(';');
  //if (private) {
  //  return this.echo('\x1b[?' + (param || '') + 'h');
  //}
  this.echo('\x1b[' + (param || '') + 'h');
};

Program.prototype.showCursor = function() {
  return this.setMode('?25');
};

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
Program.prototype.resetMode = function() {
  var param = Array.prototype.slice.call(arguments).join(';');
  //if (private) {
  //  return this.echo('\x1b[?' + (param || '') + 'l');
  //}
  this.echo('\x1b[' + (param || '') + 'l');
};

Program.prototype.hideCursor = function() {
  return this.resetMode('?25');
};

Program.prototype.normalBuffer = function() {
  //return this.resetMode('?47');
  //return this.resetMode('?1047');
  return this.resetMode('?1049');
};

// CSI Ps ; Ps r
//   Set Scrolling Region [top;bottom] (default = full size of win-
//   dow) (DECSTBM).
// CSI ? Pm r
Program.prototype.setScrollRegion = function(top, bottom) {
  this.echo('\x1b[' + (top || 1) + ';' + (bottom || this.rows) + 'r');
  this.scrollTop = (top || 1) - 1;
  this.scrollBottom = (bottom || this.rows) - 1;
  this.x = 0;
  this.y = 0;
};

// CSI s
//   Save cursor (ANSI.SYS).
Program.prototype.saveCursor = function() {
  this.echo('\x1b[s');
  this.savedX = this.x;
  this.savedY = this.y;
};

// CSI u
//   Restore cursor (ANSI.SYS).
Program.prototype.restoreCursor = function() {
  this.echo('\x1b[u');
  this.x = this.savedX || 0;
  this.y = this.savedY || 0;
};

/**
 * Expose
 */

module.exports = Program;
