/**
 * Blessed high-level interface
 * Still in development
 */

/*
  API Example:
  This will render a box with ascii borders containing the
  text 'Hello world!', centered horizontally and vertically.

  var blessed = require('blessed')
    , program = blessed()
    , screen;

  screen = new blessed.Screen({
    program: program
  });

  screen.append(new blessed.Text({
    screen: screen,
    parent: screen,
    fg: 3,
    bg: 5,
    border: {
      type: 'ascii',
      fg: 1
    },
    content: 'Hello world!',
    top: 'center',
    left: 'center'
  }));

  program.on('keypress', function(ch, key) {
    if (key.name === 'escape') {
      process.exit(0);
    }
  });

  screen.render();
*/

/**
 * Modules
 */

var EventEmitter = require('events').EventEmitter;

/**
 * Node
 */

function Node(options) {
  EventEmitter.call(this);

  this.options = options || {};
  this.screen = this.screen
    || Screen._default
    || (function(){throw new Error('No active screen.')})();
  this.parent = options.parent || null; // this.screen;
  this.children = [];

  (options.children || []).forEach(this.append.bind(this));

  if (this._isScreen && !this.focused) {
    this.focused = this.children[0];
  }
}

Node.prototype.__proto__ = EventEmitter.prototype;

Node.prototype.prepend = function(element) {
  element.parent = this;

  if (this._isScreen && !this.focused) {
    this.focused = element;
  }

  if (!~this.children.indexOf(element)) {
    this.children.unshift(element);
  }

  // element.emit('reparent', this);
  // this.emit('append', element);
};

Node.prototype.append = function(element) {
  element.parent = this;

  if (this._isScreen && !this.focused) {
    this.focused = element;
  }

  if (!~this.children.indexOf(element)) {
    this.children.push(element);
  }

  // element.emit('reparent', this);
  // this.emit('append', element);
};

Node.prototype.remove = function(element) {
  element.parent = null; // this.screen;

  var i = this.children.indexOf(element);
  if (~i) {
    this.children.splice(i, 1);
  }

  if (this._isScreen && this.focused === element) {
    this.focused = this.children[0];
  }

  // element.emit('reparent', null);
  // this.emit('remove', element);
};

Node.prototype.detach = function(element) {
  this.parent.remove(element);
};

/**
 * Screen
 */

function Screen(options) {
  var self = this;

  if (!Screen._default) {
    Screen._default = this;
  }

  Node.call(this, options);

  this._isScreen = true;
  this.program = options.program;
  this.tput = this.program.tput;
  this.dattr = ((0 << 18) | (0x1ff << 9)) | 0x1ff;
  this.position = {
    left: this.left = 0,
    right: this.right = 0,
    top: this.top = 0,
    bottom: this.bottom = 0
  };

  this.focused = null;
  this.clickable = [];
  this.input = [];

  this.alloc();

  this.program.on('resize', function() {
    self.alloc();
    self.render();
    self.emit('resize');
  });

  this.program.alternateBuffer();
  this.program.hideCursor();

  process.on('exit', function() {
    self.program.clear();
    self.program.showCursor();
    self.program.normalBuffer();
  });
}

Screen._default = null;

Screen.prototype.__proto__ = Node.prototype;

// TODO: Bubble events.
Screen.prototype._listenMouse = function(el, hover) {
  var self = this;

  if (el) {
    if (!hover) this.clickable.push(el);
    else this.hover.push(el);
  }

  if (this._listenedMouse) return;
  this._listenedMouse = true;

  this.program.enableMouse();

  process.on('exit', function() {
    self.program.disableMouse();
  });

  this.program.on('mouse', function(data) {
    var i = 0, left, top, el;
    for (; i < self.clickable.length; i++) {
      el = self.clickable[i];
      left = el.left + (el.border ? 1 : 0);
      top = el.top + (el.border ? 1 : 0);
      if (el.parent.childBase != null) top -= el.parent.childBase;
      if (data.x > left && data.x <= left + el.width
          && data.y > top && data.y <= top + el.height) {
        el.emit('mouse', data);
        if (data.action === 'mouseup') {
          el.emit('click', data);
        } else if (data.action === 'movement') {
          el.emit('hover', data);
        }
        el.emit(data.action, data);
      }
    }
    self.emit('mouse', data);
  });
};

// TODO: Bubble events.
Screen.prototype._listenKeys = function(el) {
  var self = this;

  if (el) {
    this.input.push(el);
    //if (this.mouse)
    //el.on('click', function() {
    //  el.focus();
    //});
  }

  if (this._listenedKeys) return;
  this._listenedKeys = true;

  this.program.on('keypress', function(ch, key) {
    if (~self.input.indexOf(self.focused)) {
      self.focused.emit('keypress', ch, key);
    }
    self.emit('keypress', ch, key);
  });
};

Screen.prototype.__defineGetter__('cols', function() {
  return this.program.cols;
});

Screen.prototype.__defineGetter__('rows', function() {
  return this.program.rows;
});

Screen.prototype.__defineGetter__('width', function() {
  return this.program.cols;
});

Screen.prototype.__defineGetter__('height', function() {
  return this.program.rows;
});

Screen.prototype.alloc = function() {
  var x, y;
  this.lines = [];
  for (y = 0; y < this.rows; y++) {
    this.lines[y] = [];
    for (x = 0; x < this.cols; x++) {
      this.lines[y][x] = [this.dattr, ' '];
    }
    this.lines[y].dirty = true;
  }
  this.olines = [];
  for (y = 0; y < this.rows; y++) {
    this.olines[y] = [];
    for (x = 0; x < this.cols; x++) {
      this.olines[y][x] = [];
    }
  }
};

Screen.prototype.render = function() {
  this.children.forEach(function(el) {
    el.render();
  });
  this.draw(0, this.rows - 1);
  // this.emit('draw');
};

Screen.prototype.draw = function(start, end) {
  var x
    , y
    , line
    , out
    , ch
    , data
    , attr
    , fgColor
    , bgColor
    , flags;

  var lx = -1
    , ly = -1
    , o;

  this.program.saveCursor();

  for (y = start; y <= end; y++) {
    line = this.lines[y];
    o = this.olines[y];

    // TODO: Possibly get rid of .dirty altogether.
    if (!line.dirty) continue;
    line.dirty = false;

    out = '';
    attr = this.dattr;

    for (x = 0; x < this.cols; x++) {
      data = line[x][0];
      ch = line[x][1];

      if (data === o[x][0] && ch === o[x][1]) {
        if (lx === -1) {
          lx = x;
          ly = y;
        }
        continue;
      } else if (lx !== -1) {
        //out += y === ly ? this.tput.cuf(x - lx) : this.tput.cup(y, x);
        out += y === ly
          ? '\x1b[' + (x - lx) + 'C'
          : '\x1b[' + (y + 1) + ';' + (x + 1) + 'H';
        lx = -1, ly = -1;
      }
      o[x][0] = data;
      o[x][1] = ch;

      if (data !== attr) {
        if (attr !== this.dattr) {
          out += '\x1b[m';
        }
        if (data !== this.dattr) {
          out += '\x1b[';

          bgColor = data & 0x1ff;
          fgColor = (data >> 9) & 0x1ff;
          flags = data >> 18;

          // bold
          if (flags & 1) {
            out += '1;';
          }

          // underline
          if (flags & 2) {
            out += '4;';
          }

          // blink
          if (flags & 4) {
            out += '5;';
          }

          // inverse
          if (flags & 8) {
            out += '7;';
          }

          // invisible
          if (flags & 16) {
            out += '8;';
          }

          if (bgColor !== 0x1ff) {
            if (bgColor < 16 || this.tput.colors <= 16) {
              if (bgColor < 8) {
                bgColor += 40;
              } else if (bgColor < 16) {
                bgColor -= 8;
                bgColor += 100;
              }
              out += bgColor + ';';
            } else {
              out += '48;5;' + bgColor + ';';
            }
          }

          if (fgColor !== 0x1ff) {
            if (fgColor < 16 || this.tput.colors <= 16) {
              if (fgColor < 8) {
                fgColor += 30;
              } else if (fgColor < 16) {
                fgColor -= 8;
                fgColor += 90;
              }
              out += fgColor + ';';
            } else {
              out += '38;5;' + fgColor + ';';
            }
          }

          if (out[out.length-1] === ';') out = out.slice(0, -1);

          out += 'm';
        }
      }

      out += ch;
      attr = data;
    }

    if (attr !== this.dattr) {
      out += '\x1b[m';
    }

    //if (out) this.program.write(this.tput.cup(y, 1) + out);
    if (out) this.program.write('\x1b[' + (y + 1) + ';1H' + out);
  }

  this.program.restoreCursor();
};

Screen.prototype.focus = function(offset) {
  if (!this.input.length || !offset) return;
  var i = this.input.indexOf(this.focused);
  if (!~i) return;
  if (!this.input[i + offset]) {
    if (offset > 0) {
      while (offset--) if (++i > this.input.length - 1) i = 0;
    } else {
      offset = -offset;
      while (offset--) if (--i < 0) i = this.input.length - 1;
    }
  } else {
    i += offset;
  }
  return this.input[i].focus();
};

Screen.prototype.focusPrev = function() {
  return this.focus(-1);
};

Screen.prototype.focusNext = function() {
  return this.focus(1);
};

Screen.prototype.clearRegion = function(xi, xl, yi, yl) {
  var lines = this.lines
    , attr = this.dattr
    , ch = ' '
    , xx;

  for (; yi < yl; yi++) {
    if (!lines[yi]) break;
    for (xx = xi; xx < xl; xx++) {
      cell = lines[yi][xx];
      if (!cell) break;
      if (attr !== cell[0] || ch !== cell[1]) {
        lines[yi][xx][0] = attr;
        lines[yi][xx][1] = ch;
        lines[yi].dirty = true;
      }
    }
  }
};

/**
 * Element
 */

function Element(options) {
  Node.call(this, options);

  this.position = {
    left: options.left || 0,
    right: options.right || 0,
    top: options.top || 0,
    bottom: options.bottom || 0,
    width: options.width || null,
    height: options.height || null
  };

  this.hidden = options.hidden || false;
  this.fg = options.fg || 0x1ff;
  this.bg = options.bg || 0x1ff;
  this.bold = options.bold ? 1 : 0;
  this.underline = options.underline ? 2 : 0;

  if (this.fg === -1) this.fg = exports.NORMAL;
  if (this.bg === -1) this.bg = exports.NORMAL;

  this.fixed = options.fixed || false;
  this.border = options.border;
  if (this.border) {
    this.border.type = this.border.type || 'bg';
    this.border.fg = this.border.fg || -1;
    this.border.bg = this.border.bg || -1;
    this.border.ch = this.border.ch || ' ';
    this.border.bold = this.border.bold ? 1 : 0;
    this.border.underline = this.border.underline ? 2 : 0;
    if (this.border.fg === -1) this.border.fg = exports.NORMAL;
    if (this.border.bg === -1) this.border.bg = exports.NORMAL;
  }

  if (options.clickable) {
    this.screen._listenMouse(this);
  }

  if (options.input) {
    this.screen._listenKeys(this);
  }

  this.content = options.content || '';
}

Element.prototype.__proto__ = Node.prototype;

Element._addListener = Element.prototype.addListener;
Element.prototype.on =
Element.prototype.addListener = function(type, listener) {
  if (type === 'mouse'
    || type === 'click'
    || type === 'hover'
    || type === 'mousedown'
    || type === 'mouseup'
    || type === 'mousewheel'
    || type === 'wheeldown'
    || type === 'wheelup'
    || type === 'mousemove'
    || type === 'movement') {
    this.screen._listenMouse(this);
  } else if (type === 'keypress') {
    this.screen._listenKeys(this);
  }
  return Element._addListener.apply(this, arguments);
};

Element.prototype.hide = function() {
  var ret = this.render(true);
  this.hidden = true;
  this.screen.clearRegion(ret.xi, ret.xl, ret.yi, ret.yl);
};

Element.prototype.show = function() {
  this.hidden = false;
  //this.render();
};

Element.prototype.toggle = function() {
  return this.hidden ? this.show() : this.hide();
};

Element.prototype.focus = function() {
  var old = this.screen.focused;
  this.screen.focused = this;
  old.emit('blur', this);
  this.emit('focus', old);
  this.screen.emit('element blur', old, this);
  this.screen.emit('element focus', old, this);
};

Element.prototype.__defineGetter__('left', function() {
  var left = this.position.left;

  if (typeof left === 'string') {
    if (left === 'center') left = '50%';
    left = +left.slice(0, -1) / 100;
    var len = Math.min(this.width, this.parent.width);
    left = (this.parent.width - len) * left | 0;
  }

  if (this.options.left == null && this.options.right != null) {
    return this.screen.cols - this.width - this.right;
  }

  return (this.parent.left || 0) + left;
});

Element.prototype.__defineGetter__('right', function() {
  //if (this.options.right == null && this.options.left != null) {
  //  return this.screen.cols - (this.left + this.width);
  //}
  return (this.parent.right || 0) + this.position.right;
});

Element.prototype.__defineGetter__('top', function() {
  var top = this.position.top;

  if (typeof top === 'string') {
    if (top === 'center') top = '50%';
    top = +top.slice(0, -1) / 100;
    var len = Math.min(this.height, this.parent.height);
    top = (this.parent.height - len) * top | 0;
  }

  if (this.options.top == null && this.options.bottom != null) {
    return this.screen.rows - this.height - this.bottom;
  }

  return (this.parent.top || 0) + top;
});

Element.prototype.__defineGetter__('bottom', function() {
  //if (this.options.bottom == null && this.options.top != null) {
  //  return this.screen.rows - (this.top + this.height);
  //}
  return (this.parent.bottom || 0) + this.position.bottom;
});

Element.prototype.__defineGetter__('width', function() {
  var width = this.position.width;
  if (typeof width === 'string') {
    if (width === 'half') width = '50%';
    width = +width.slice(0, -1) / 100;
    return this.parent.width * width | 0;
  }
  if (!width) {
    // Problem if .left is 'center', we can't calculate the width
    var left = this.position.left;
    if (typeof left === 'string') {
      if (left === 'center') left = '50%';
      left = +left.slice(0, -1) / 100;
      left = this.parent.width * left | 0;
    }
    width = this.parent.width - this.position.right - left;
  }
  return width;
});

Element.prototype.__defineGetter__('height', function() {
  var height = this.position.height;
  if (typeof height === 'string') {
    if (height === 'half') height = '50%';
    height = +height.slice(0, -1) / 100;
    return this.parent.height * height | 0;
  }
  if (!height) {
    // Problem if .top is 'center', we can't calculate the height
    var top = this.position.top;
    if (typeof top === 'string') {
      if (top === 'center') top = '50%';
      top = +top.slice(0, -1) / 100;
      top = this.parent.height * top | 0;
    }
    height = this.parent.height - this.position.bottom - top;
  }
  return height;
});

Element.prototype.__defineGetter__('rleft', function() {
  var left = this.position.left;

  if (typeof left === 'string') {
    if (left === 'center') left = '50%';
    left = +left.slice(0, -1) / 100;
    var len = Math.min(this.width, this.parent.width);
    left = len * left | 0;
  }

  if (this.options.left == null && this.options.right != null) {
    return this.parent.width - this.width - this.right;
  }

  return left;
});

Element.prototype.__defineGetter__('rright', function() {
  return this.position.right;
});

Element.prototype.__defineGetter__('rtop', function() {
  var top = this.position.top;

  if (typeof top === 'string') {
    if (top === 'center') top = '50%';
    top = +top.slice(0, -1) / 100;
    var len = Math.min(this.height, this.parent.height);
    top = len * top | 0;
  }

  if (this.options.top == null && this.options.bottom != null) {
    return this.parent.height - this.height - this.bottom;
  }

  return top;
});

Element.prototype.__defineGetter__('rbottom', function() {
  return this.position.bottom;
});

/**
 * Box
 */

function Box(options) {
  Element.call(this, options);
}

Box.prototype.__proto__ = Element.prototype;

Box.prototype.render = function(stop) {
  // NOTE: Maybe move this `hidden` check down below `stop` check and return `ret`.
  if (this.hidden) return;

  var lines = this.screen.lines
    , xi = this.left
    , xl = this.screen.cols - this.right
    , yi = this.top
    , yl = this.screen.rows - this.bottom
    , cell
    , attr
    , ch
    , ci = this.contentIndex || 0
    , cl = this.content.length
    , battr
    , dattr
    , c;

  if (this.position.width) {
    xl = xi + this.width;
  }

  if (this.position.height) {
    yl = yi + this.height;
  }

  if (this.parent.childBase != null && ~this.parent.items.indexOf(this)) {
    var rtop = this.rtop - (this.parent.border ? 1 : 0)
      , visible = this.parent.height - (this.parent.border ? 2 : 0);

    yi -= this.parent.childBase;
    // if (noOverflow) ...
    yl = Math.min(yl, this.screen.rows - this.parent.bottom);
    // yl -= this.parent.childBase; // necessary here, but not necessary in Text.render for some reason.

    if (rtop - this.parent.childBase < 0) {
      return;
    }
    if (rtop - this.parent.childBase >= visible) {
      return;
    }
  }

  var ret = {
    xi: xi,
    xl: xl,
    yi: yi,
    yl: yl
  };

  if (stop) return ret;

  battr = this.border
    ? ((this.border.bold << 18) + (this.border.underline << 18)) | (this.border.fg << 9) | this.border.bg
    : 0;

  //if (this.escapes) dattr = this.screen.dattr;
  dattr = ((this.bold << 18) + (this.underline << 18)) | (this.fg << 9) | this.bg;
  attr = dattr;

  for (; yi < yl; yi++) {
    if (!lines[yi]) break;
    for (xi = this.left; xi < xl; xi++) {
      cell = lines[yi][xi];
      if (!cell) break;

      if (this.border && (yi === this.top || xi === this.left || yi === yl - 1 || xi === xl - 1)) {
        if (this.border.type === 'ascii') {
          if (yi === this.top) {
            if (xi === this.left) ch = '┌';
            else if (xi === xl - 1) ch = '┐';
            else ch = '─';
          } else if (yi === yl - 1) {
            if (xi === this.left) ch = '└';
            else if (xi === xl - 1) ch = '┘';
            else ch = '─';
          } else if (xi === this.left || xi === xl - 1) {
            ch = '│';
          }
        } else if (this.border.type === 'bg') {
          ch = this.border.ch;
        }
        if (battr !== cell[0] || ch !== cell[1]) {
          lines[yi][xi][0] = battr;
          lines[yi][xi][1] = ch;
          lines[yi].dirty = true;
        }
        continue;
      }

      ch = this.content[ci++] || ' ';

      // Handle escape codes.
      while (ch === '\x1b') {
        if (c = /^\x1b\[(?:\d+(?:;\d+)*)?m/.exec(this.content.substring(ci - 1))) {
          ci += c[0].length - 1;
          attr = attrCode(c[0], attr);
          ch = this.content[ci] || ' ';
          ci++;
        }
      }

      // Handle newlines.
      if (ch === '\t') ch = ' ';
      if (ch === '\n' || ch === '\r') {
        ch = ' ';
        var xxl = xl - (this.border ? 1 : 0);
        for (; xi < xxl; xi++) {
          cell = lines[yi][xi];
          if (!cell) break;
          if (attr !== cell[0] || ch !== cell[1]) {
            lines[yi][xi][0] = attr;
            lines[yi][xi][1] = ch;
            lines[yi].dirty = true;
          }
        }
        if (this.border) xi--;
        continue;
      }

      if (attr !== cell[0] || ch !== cell[1]) {
        lines[yi][xi][0] = attr;
        lines[yi][xi][1] = ch;
        lines[yi].dirty = true;
      }
    }
  }

  this.children.forEach(function(el) {
    el.render();
  });

  return ret;
};

/**
 * Text
 */

function Text(options) {
  Element.call(this, options);
  this.full = options.full;
}

Text.prototype.__proto__ = Element.prototype;

// TODO: Remove duplication of code by reusing box.render
// better. Possibly remove Text altogether.
// TODO: Maybe just remove escape code and newline handling from here.
Text.prototype.render = function(stop) {
  // NOTE: Maybe move this `hidden` check down below `stop` check and return `ret`.
  if (this.hidden) return;

  var lines = this.screen.lines
    , xi = this.left
    , xl = this.screen.cols - this.right
    , yi = this.top
    , yl = this.screen.rows - this.bottom
    , cell
    , attr
    , ch
    , ci = this.contentIndex || 0
    , cl = this.content.length
    , ended = -1
    , dattr
    , c;

  if (this.position.width) {
    xl = xi + this.width;
  }

  if (this.position.height) {
    yl = yi + this.height;
  }

  if (this.full) {
    xl = xi + this.parent.width - (this.parent.border ? 2 : 0) - this.rleft - this.rright;
  }

  if (this.parent.childBase != null && ~this.parent.items.indexOf(this)) {
    var rtop = this.rtop - (this.parent.border ? 1 : 0)
      , visible = this.parent.height - (this.parent.border ? 2 : 0);

    yi -= this.parent.childBase;
    // if (noOverflow) ...
    yl = Math.min(yl, this.screen.rows - this.parent.bottom);

    if (rtop - this.parent.childBase < 0) {
      return;
    }
    if (rtop - this.parent.childBase >= visible) {
      return;
    }
  }

  var ret = {
    xi: xi,
    xl: xl,
    yi: yi,
    yl: yl
  };

  if (stop) return ret;

  dattr = ((this.bold << 18) + (this.underline << 18)) | (this.fg << 9) | this.bg;
  attr = dattr;

  for (; yi < yl; yi++) {
    if (!lines[yi]) break;
    for (xi = this.left; xi < xl; xi++) {
      cell = lines[yi][xi];
      if (!cell) break;

      ch = this.content[ci++];

      // Handle escape codes.
      while (ch === '\x1b') {
        if (c = /^\x1b\[(?:\d+(?:;\d+)*)?m/.exec(this.content.substring(ci - 1))) {
          ci += c[0].length - 1;
          attr = attrCode(c[0], attr);
          ch = this.content[ci];
          ci++;
        }
      }

      // Handle newlines.
      if (ch === '\t') ch = ' ';
      if (ch === '\n' || ch === '\r') {
        ch = ' ';
        var xxl = xl;
        for (; xi < xxl; xi++) {
          cell = lines[yi][xi];
          if (!cell) break;
          if (attr !== cell[0] || ch !== cell[1]) {
            lines[yi][xi][0] = attr;
            lines[yi][xi][1] = ch;
            lines[yi].dirty = true;
          }
        }
        continue;
      }

      if (!ch) {
        if (this.full) {
          if (ended === -1) ended = yi;
          if (yi === ended) {
            ch = ' ';
          } else {
            break;
          }
        } else {
          break;
        }
      }

      if (attr !== cell[0] || ch !== cell[1]) {
        lines[yi][xi][0] = attr;
        lines[yi][xi][1] = ch;
        lines[yi].dirty = true;
      }
    }
  }

  return ret;
};

/**
 * Line
 */

function Line(options) {
  var orientation = options.orientation || 'vertical';
  delete options.orientation;

  if (orientation === 'vertical') {
    options.width = 1;
  } else {
    options.height = 1;
  }

  options.border = {
    type: 'bg',
    bg: options.bg || -1,
    fg: options.fg || -1,
    ch: !options.type || options.type === 'ascii'
      ? orientation === 'horizontal' ? '─' : '│'
      : options.ch || ' '
  };

  delete options.bg;
  delete options.fg;
  delete options.ch;

  Box.call(this, options);
}

Line.prototype.__proto__ = Box.prototype;

/**
 * ScrollableBox
 */

function ScrollableBox(options) {
  Box.call(this, options);
  this.scrollable = true;
  this.childOffset = 0;
  this.childBase = 0;
  this.baseLimit = options.baseLimit || Infinity;
  this.alwaysScroll = options.alwaysScroll;
}

ScrollableBox.prototype.__proto__ = Box.prototype;

ScrollableBox.prototype.scroll = function(offset) {
  var visible = this.height - (this.border ? 2 : 0);
  if (this.alwaysScroll) {
    // Semi-workaround
    this.childOffset = offset > 0
      ? visible - 1 + offset
      : offset;
  } else {
    this.childOffset += offset;
  }
  if (this.childOffset > visible - 1) {
    var d = this.childOffset - (visible - 1);
    this.childOffset -= d;
    this.childBase += d;
  } else if (this.childOffset < 0) {
    var d = this.childOffset;
    this.childOffset += -d;
    this.childBase += d;
  }
  if (this.childBase < 0) this.childBase = 0;
  else if (this.childBase > this.baseLimit) this.childBase = this.baseLimit;
};

/**
 * List
 */

function List(options) {
  var self = this;

  ScrollableBox.call(this, options);

  this.items = [];
  this.selected = 0;

  this.selectedBg = options.selectedBg || -1;
  this.selectedFg = options.selectedFg || -1;
  this.selectedBold = options.selectedBold ? 1 : 0;
  this.selectedUnderline = options.selectedUnderline ? 2 : 0;

  if (this.selectedBg === -1) this.selectedBg = exports.NORMAL;
  if (this.selectedFg === -1) this.selectedFg = exports.NORMAL;

  this.mouse = options.mouse || false;

  if (options.items) {
    options.items.forEach(this.add.bind(this));
  }

  if (this.children.length) {
    // Will throw if this.parent is not set!
    // Probably not good to have in a constructor.
    // this.select(0);
  }

  if (this.mouse) {
    self.on('wheeldown', function(data) {
      self.select(self.selected + 2);
      self.screen.render();
    });

    self.on('wheelup', function(data) {
      self.select(self.selected - 2);
      self.screen.render();
    });
  }
}

List.prototype.__proto__ = ScrollableBox.prototype;

List.prototype.add = function(item) {
  var self = this;

  // TODO: Use box here and get rid of text.
  var item = new Text({
    screen: this.screen,
    parent: this,
    fg: this.fg,
    bg: this.bg,
    content: item.content || item,
    top: this.items.length + (this.border ? 1 : 0),
    left: (this.border ? 1 : 0) + 1,
    full: true,
    height: 1
  });

  this.append(item);
  this.items.push(item);

  if (this.mouse) {
    item.on('click', function(data) {
      self.select(item);
      self.screen.render();
    });
  }
};

List.prototype._remove = List.prototype.remove;
List.prototype.remove = function(child) {
  if (typeof child === 'number') {
    child = this.children[child];
  }
  var i = this.items.indexOf(child);
  if (~i) this.items.splice(i, 1);
  this._remove(child);
};

List.prototype.select = function(index) {
  if (!this.items.length) return;

  if (typeof index === 'object') {
    index = this.items.indexOf(index);
  }

  if (index < 0) index = 0;
  else if (index >= this.items.length) index = this.items.length - 1;

  if (this.selected === index && this._listInitialized) return;
  this._listInitialized = true;

  if (this.selectedBg) {
    this.items[this.selected].bg = this.bg;
    this.items[index].bg = this.selectedBg;
  }

  if (this.selectedFg) {
    this.items[this.selected].fg = this.fg;
    this.items[index].fg = this.selectedFg;
  }

  if (this.selectedBold != null) {
    this.items[this.selected].bold = this.bold;
    this.items[index].bold = this.selectedBold;
  }

  if (this.selectedUnderline != null) {
    this.items[this.selected].underline = this.underline;
    this.items[index].underline = this.selectedUnderline;
  }

  var diff = index - this.selected;
  this.selected = index;
  this.scroll(diff);
};

List.prototype.move = function(offset) {
  this.select(this.selected + offset);
};

List.prototype.up = function(offset) {
  this.move(-(offset || 1));
};

List.prototype.down = function(offset) {
  this.move(offset || 1);
};

/**
 * ScrollableText
 */

function ScrollableText(options) {
  options.alwaysScroll = true;
  ScrollableBox.call(this, options);

  if (options.mouse) {
    var self = this;
    this.on('wheeldown', function(data) {
      self.scroll(self.height / 2 | 0 || 1);
      self.screen.render();
    });
    this.on('wheelup', function(data) {
      self.scroll(-(self.height / 2 | 0) || -1);
      self.screen.render();
    });
  }

  this.contentIndex = 0;
}

ScrollableText.prototype.__proto__ = ScrollableBox.prototype;

ScrollableText.prototype._scroll = ScrollableText.prototype.scroll;
ScrollableText.prototype.scroll = function(offset) {
  var base = this.childBase
    , ret = this._scroll(offset)
    , diff = this.childBase - base;

  if (diff === 0) {
    return ret;
  }

  // When scrolling text, we want to be able to handle SGR codes as well as line
  // feeds. This allows us to take preformatted text output from other programs
  // and put it in a scrollable text box.
  if (this.content != null) {
    var cb = this.childBase
      , data = this.render(true) || 0
      , xi = data.xi
      , xl = data.xl
      , xxl = xl - (this.border ? 1 : 0)
      , xxi
      , ci = 0
      , xxxi
      , cci;

    // XXX Temporary workaround for .render() not working while hidden.
    if (!data) return ret;

    if (this.contentIndex != null) {
      ci = this.contentIndex;
      cb = diff;
      // Scroll up.
      // This is confusing because we have to parse the
      // text backwards if we want to be efficient instead
      // of being O(ridiculous).
      // TODO: Remove code duplication.
      if (cb < 0) {
        cb = -cb;
        while (cb--) {
          if (ci < 0) break;
          for (xxi = xi + (this.border ? 1 : 0); xxi < xxl; xxi++) {
            if (this.content[ci] === '\n' || this.content[ci] === '\r') {
              ci--;
              // TODO: Come up with a cleaner way of doing this:
              for (xxxi = xi + (this.border ? 1 : 0); xxxi < xxl; xxxi++) {
                if (this.content[ci] === '\n' || this.content[ci] === '\r') {
                  ci++;
                  break;
                } else if (this.content[ci] === 'm') {
                  for (cci = ci - 1; cci >= 0; cci--) {
                    if (/[^\x1b\[\d;]/.test(this.content[cci])) {
                      break;
                    }
                    if (this.content[cci] === '\x1b') {
                      xxxi -= (ci - cci);
                      ci = cci;
                      break;
                    }
                  }
                  ci--;
                } else {
                  ci--;
                }
              }
              break;
            } else if (this.content[ci] === 'm') {
              for (cci = ci - 1; cci >= 0; cci--) {
                if (/[^\x1b\[\d;]/.test(this.content[cci])) {
                  break;
                }
                if (this.content[cci] === '\x1b') {
                  xxi -= (ci - cci);
                  ci = cci;
                  break;
                }
              }
              ci--;
            } else {
              ci--;
            }
          }
        }
        if (ci < 0) ci = 0;
        this.contentIndex = ci;
        return ret;
      }
    }

    // Scroll down.
    while (cb--) {
      for (xxi = xi + (this.border ? 1 : 0); xxi < xxl; xxi++) {
        if (this.content[ci] === '\n' || this.content[ci] === '\r') {
          ci++;
          break;
        } else if (this.content[ci] === '\x1b') {
          for (; ci < this.content.length; ci++) {
            xxi--;
            if (this.content[ci] === 'm') break;
          }
          ci++;
        } else {
          ci++;
        }
      }
    }

    // TODO: Parse the last few lines to see how
    // many characters we need to subtract.
    if (ci >= this.content.length) {
      if (this.contentIndex >= this.content.length) {
        this.childBase = base;
      }
      ci = this.content.length;
    }

    this.contentIndex = ci;
  }

  return ret;
};

/**
 * Input
 */

function Input(options) {
  Box.call(this, options);
}

Input.prototype.__proto__ = Box.prototype;

/**
 * Textbox
 */

function Textbox(options) {
  Input.call(this, options);
}

Textbox.prototype.__proto__ = Input.prototype;

/**
 * Button
 */

function Button(options) {
  Input.call(this, options);
}

Button.prototype.__proto__ = Input.prototype;

/**
 * ProgressBar
 */

function ProgressBar(options) {
  Input.call(this, options);
  this.filled = options.filled || 0;
  if (typeof this.filled === 'string') {
    this.filled = +this.filled.slice(0, -1);
  }
  this.ch = options.ch || ' ';
  this.barFg = options.barFg || -1;
  this.barBg = options.barBg || -1;
  if (this.barFg === -1) this.barFg = exports.NORMAL;
  if (this.barBg === -1) this.barBg = exports.NORMAL;
}

ProgressBar.prototype.__proto__ = Input.prototype;

ProgressBar.prototype._render = ProgressBar.prototype.render;
ProgressBar.prototype.render = function(stop) {
  // NOTE: Maybe move this `hidden` check down below `stop` check and return `ret`.
  if (this.hidden) return;

  //var hash = this.filled + ':' + dattr;
  //if (this._hash === hash) return;
  //this._hash = hash;

  var ret = this._render(stop);
  if (stop) return ret;

  var xi = ret.xi
    , xl = ret.xl
    , yi = ret.yi
    , yl = ret.yl
    , cell
    , ch
    , x
    , y;

  var lines = this.screen.lines;

  if (this.border) xi++, yi++, xl--, yl--;

  xl = xi + ((xl - xi) * (this.filled / 100)) | 0;

  var dattr = ((this.bold << 18) + (this.underline << 18)) | (this.barFg << 9) | this.barBg;

  for (y = yi; y < yl; y++) {
    if (!lines[y]) break;
    for (x = xi; x < xl; x++) {
      ch = this.ch;
      cell = lines[y][x];
      if (!cell) break;
      if (dattr !== cell[0] || ch !== cell[1]) {
        lines[y][x][0] = dattr;
        lines[y][x][1] = ch;
        lines[y].dirty = true;
      }
    }
  }

  return ret;
};

ProgressBar.prototype.progress = function(filled) {
  this.filled += filled;
  if (this.filled < 0) this.filled = 0;
  else if (this.filled > 100) this.filled = 100;
};

/**
 * Helpers
 */

// Convert an SGR string to our own attribute format.
function attrCode(code, cur) {
  var flags = (cur >> 18) & 0x1ff;
  var fg = (cur >> 9) & 0x1ff;
  var bg = cur & 0x1ff;
  var c, i;

  code = /^\x1b\[([^m]*)m$/.exec(code)[1].split(';');
  if (!code[0]) code[0] = '0';

  for (i = 0; i < code.length; i++) {
    c = +code[i] || 0;
    switch (c) {
      case 0:
        bg = 0x1ff;
        fg = 0x1ff;
        flags = 0;
        break;
      case 1:
        flags |= 1;
        break;
      case 4:
        flags |= 2;
        break;
      case 5:
        flags |= 4;
        break;
      case 7:
        flags |= 8;
        break;
      case 8:
        flags |= 16;
        break;
      default:
        if (c === 48 && code[i+1] === '5') {
          i += 2;
          bg = +code[i];
          break;
        } else if (c === 38 && code[i+1] === '5') {
          i += 2;
          fg = +code[i];
          break;
        }
        if (c >= 40 && c <= 47) {
          bg = c - 40;
        } else if (c >= 100 && c <= 107) {
          bg = c - 100;
          bg += 8;
        } else if (c >= 30 && c <= 37) {
          fg = c - 30;
        } else if (c >= 90 && c <= 97) {
          fg = c - 90;
          fg += 8;
        }
        break;
    }
  }

  return (flags << 18) | (fg << 9) | bg;
}

/**
 * Constants
 */

exports.NORMAL = 0x1ff;

/**
 * Expose
 */

exports.Screen = Screen;
exports.Box = Box;
exports.Text = Text;
exports.Line = Line;
exports.ScrollableBox = ScrollableBox;
exports.List = List;
exports.ScrollableText = ScrollableText;
exports.Input = Input;
exports.Textbox = Textbox;
exports.Button = Button;
exports.ProgressBar = ProgressBar;
