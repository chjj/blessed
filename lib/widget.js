/**
 * Blessed high-level interface
 * Copyright (c) 2013, Christopher Jeffrey (MIT License)
 * Still under heavy development.
 */

/**
 * Modules
 */

var EventEmitter = require('events').EventEmitter
  , path = require('path')
  , fs = require('fs')
  , colors = require('./colors');

/**
 * Node
 */

function Node(options) {
  if (!(this instanceof Node)) {
    return new Node(options);
  }

  EventEmitter.call(this);

  this.options = options || {};
  this.screen = this.screen
    || Screen.global
    || (function(){throw new Error('No active screen.')})();
  this.parent = options.parent || null;
  this.children = [];
  this.$ = this._ = this.data = {};
  this.uid = Node.uid++;
  this.index = -1;

  if (this.parent) {
    this.parent.append(this);
  }

  if (!this.parent) {
    this._detached = true;
  }

  (options.children || []).forEach(this.append.bind(this));

  // if (this.type === 'screen' && !this.focused) {
  //   this.focused = this.children[0];
  // }
}

Node.uid = 0;

Node.prototype.__proto__ = EventEmitter.prototype;

Node.prototype.type = 'node';

Node.prototype.insert = function(element, i) {
  // var old = element.parent;

  element.detach();
  element.parent = this;

  if (this.type === 'screen' && !this.focused) {
    this.focused = element;
  }

  if (!~this.children.indexOf(element)) {
    if (i === 0) {
      this.children.unshift(element);
    } else if (i === this.children.length) {
      this.children.push(element);
    } else {
      this.children.splice(i, 0, element);
    }
  }

  element.emit('reparent', this);
  this.emit('adopt', element);

  // if (!old) {
  (function emit(el) {
    el._detached = false;
    el.emit('attach');
    if (el.children) el.children.forEach(emit);
  })(element);

  // element.emitDescendants('attach', function(el) {
  //   el._detached = false;
  // });
};

Node.prototype.prepend = function(element) {
  this.insert(element, 0);
};

Node.prototype.append = function(element) {
  this.insert(element, this.children.length);
};

Node.prototype.insertBefore = function(element, other) {
  var i = this.children.indexOf(other);
  if (~i) this.insert(element, i);
};

Node.prototype.insertAfter = function(element, other) {
  var i = this.children.indexOf(other);
  if (~i) this.insert(element, i + 1);
};

Node.prototype.remove = function(element) {
  element.parent = null;

  var i = this.children.indexOf(element);
  if (~i) {
    this.children.splice(i, 1);
  }

  if (this.type !== 'screen') {
    i = this.screen.clickable.indexOf(element);
    if (~i) this.screen.clickable.splice(i, 1);
    i = this.screen.input.indexOf(element);
    if (~i) this.screen.input.splice(i, 1);
  }

  if (this.type === 'screen' && this.focused === element) {
    this.focused = this.children[0];
  }

  element.emit('reparent', null);
  this.emit('remove', element);

  (function emit(el) {
    el._detached = true;
    el.emit('detach');
    if (el.children) el.children.forEach(emit);
  })(element);

  // element.emitDescendants('detach', function(el) {
  //   el._detached = true;
  // });

  // this.clearPos();
};

Node.prototype.detach = function() {
  if (this.parent) this.parent.remove(this);
  // this.clearPos();
};

Node.prototype.emitDescendants = function() {
  var args = Array.prototype.slice(arguments)
    , iter;

  if (typeof args[args.length-1] === 'function') {
    iter = args.pop();
  }

  (function emit(el) {
    if (iter) iter(el);
    el.emit.apply(el, args);
    if (el.children) {
      el.children.forEach(emit);
    }
  })(this);
};

Node.prototype.emitAncestors = function() {
  var args = Array.prototype.slice(arguments)
    , el = this
    , iter;

  if (typeof args[args.length-1] === 'function') {
    iter = args.pop();
  }

  do {
    if (iter) iter(el);
    el.emit.apply(el, args);
  } while (el = el.parent);
};

Node.prototype.hasDescendant = function(target) {
  return (function find(el) {
    for (var i = 0; i < el.children.length; i++) {
      if (el.children[i] === target) {
        return true;
      }
      if (find(el.children[i]) === true) {
        return true;
      }
    }
    return false;
  })(this);
};

Node.prototype.hasAncestor = function(target) {
  var el = this;
  while (el = el.parent) {
    if (el === target) return true;
  }
  return false;
};

Node.prototype.gon = function(type, callback) {
  var self = this
    , events = this._events || {}
    , listeners = (events[type] || []).slice();

  return this.on(type, function() {
    if (callback.apply(this, arguments) === true) {
      self._events[type] = listeners;
    }
  });
};

Node.prototype.get = function(name, value) {
  if (this.data.hasOwnProperty(name)) {
    return this.data[name];
  }
  return value;
};

Node.prototype.set = function(name, value) {
  return this.data[name] = value;
};

/**
 * Screen
 */

function Screen(options) {
  var self = this;

  if (!(this instanceof Screen)) {
    return new Screen(options);
  }

  if (options && options.rsety && options.listen) {
    options = { program: options };
  }

  options = options || {};
  options.program = options.program
    || require('./program').global
    || new (require('./program'))(options);

  if (!Screen.global) {
    Screen.global = this;
  }

  Node.call(this, options);

  this.program = options.program;
  this.program.zero = true;
  this.tput = this.program.tput;

  this.dattr = ((0 << 18) | (0x1ff << 9)) | 0x1ff;

  this.position = {
    left: this.left = this.rleft = 0,
    right: this.right = this.rright = 0,
    top: this.top = this.rtop = 0,
    bottom: this.bottom = this.rbottom = 0
  };

  this.hover = null;
  this.history = [];
  this.clickable = [];
  this.input = [];
  this.grabKeys = false;
  this.lockKeys = false;
  this.focused;

  this._ci = -1;

  function resize() {
    self.alloc();
    self.render();
    (function emit(el) {
      el.emit('resize');
      if (el.children) {
        el.children.forEach(emit);
      }
    })(self);
    // self.emitDescendants('resize');
  }

  this.program.on('resize', function() {
    if (!self.options.resizeTimeout) {
      return resize();
    }
    if (self._resizeTimer) {
      clearTimeout(self._resizeTimer);
      delete self._resizeTimer;
    }
    var time = typeof self.options.resizeTimeout === 'number'
      ? self.options.resizeTimeout
      : 300;
    self._resizeTimer = setTimeout(resize, time);
  });

  this.program.on('focus', function() {
    self.emit('focus');
  });

  this.program.on('blur', function() {
    self.emit('blur');
  });

  this.program.alternateBuffer();
  this.program.hideCursor();
  this.program.cup(0, 0);
  //this.program.csr(0, this.height - 1);
  this.alloc();

  function reset() {
    if (reset.done) return;
    reset.done = true;
    if (self.program.scrollTop !== 0
        || self.program.scrollBottom !== self.rows - 1) {
      self.program.csr(0, self.height - 1);
    }
    self.program.clear();
    self.program.showCursor();
    self.program.normalBuffer();
    if (self._listenedMouse) {
      self.program.disableMouse();
    }
  }

  this._maxListeners = Infinity;

  process.on('uncaughtException', function(err) {
    reset();
    if (err) console.error(err.stack + '');
    return process.exit(0);
  });

  process.on('exit', function() {
    reset();
  });

  this.on('newListener', function fn(type) {
    if (type === 'keypress' || type.indexOf('key ') === 0 || type === 'mouse') {
      if (type === 'keypress' || type.indexOf('key ') === 0) self._listenKeys();
      if (type === 'mouse') self._listenMouse();
    }
    if (type === 'mouse'
      || type === 'click'
      || type === 'mouseover'
      || type === 'mouseout'
      || type === 'mousedown'
      || type === 'mouseup'
      || type === 'mousewheel'
      || type === 'wheeldown'
      || type === 'wheelup'
      || type === 'mousemove') {
      self._listenMouse();
    }
  });
}

Screen.global = null;

Screen.prototype.__proto__ = Node.prototype;

Screen.prototype.type = 'screen';

// TODO: Bubble and capture events throughout the tree.
Screen.prototype._listenMouse = function(el) {
  var self = this;

  if (el && !~this.clickable.indexOf(el)) {
    this.clickable.push(el);
  }

  if (this._listenedMouse) return;
  this._listenedMouse = true;

  this.program.enableMouse();

  // this.on('element click', el.focus.bind(el));

  this.program.on('mouse', function(data) {
    if (self.lockKeys) return;

    var clickable = hsort(self.clickable)
      , i = 0
      , left
      , top
      , width
      , height
      , el
      , set
      , ret;

    for (; i < clickable.length; i++) {
      el = clickable[i];

      if (!el.visible) continue;

      // Something like (doesn't work because textbox is usually focused):
      // if (self.grabKeys && self.focused !== el
      //     && !el.hasAncestor(self.focused)) continue;

      // Get the true coordinates.
      ret = el._lastPos;
      if (!ret) continue;
      left = ret.xi;
      top = ret.yi;
      width = ret.xl - ret.xi;
      height = ret.yl - ret.yi;

      if (data.x >= left && data.x < left + width
          && data.y >= top && data.y < top + height) {
        el.emit('mouse', data);
        self.emit('element mouse', el, data);
        if (data.action === 'mouseup') {
          el.emit('click', data);
          self.emit('element click', el, data);
        } else if (data.action === 'mousemove') {
          if (self.hover && el.index > self.hover.index) {
            set = false;
          }
          if (self.hover !== el && !set) {
            if (self.hover) {
              self.hover.emit('mouseout', data);
              self.emit('element mouseout', self.hover, data);
            }
            el.emit('mouseover', data);
            self.emit('element mouseover', el, data);
            self.hover = el;
          }
          set = true;
        }
        el.emit(data.action, data);
        self.emit('element ' + data.action, el, data);

        // XXX Temporary workaround for List wheel events.
        // Make sure they get propogated to the list instead of the list item.
        if ((data.action === 'wheeldown' || data.action === 'wheelup')
            && el.listeners(data.action).length === 0
            && el.parent.listeners(data.action).length > 0) {
          el.parent.emit(data.action, data);
          self.emit('element ' + data.action, el.parent, data);
        }

        // Seems to work better without this if statement:
        // if (data.action !== 'mousemove')
        break;
      }
    }

    // Just mouseover?
    if ((data.action === 'mousemove'
        || data.action === 'mousedown'
        || data.action === 'mouseup')
        && self.hover
        && !set) {
      self.hover.emit('mouseout', data);
      self.emit('element mouseout', self.hover, data);
      self.hover = null;
    }

    self.emit('mouse', data);
  });
};

// TODO: Bubble and capture events throughout the tree.
Screen.prototype._listenKeys = function(el) {
  var self = this;

  if (el && !~this.input.indexOf(el)) {
    // Listen for click, but do not enable
    // mouse if it's not enabled yet.
    if (el.options.autoFocus !== false) {
      var lm = this._listenedMouse;
      this._listenedMouse = true;
      el.on('click', el.focus.bind(el));
      this._listenedMouse = lm;
    }
    this.input.push(el);
  }

  if (this._listenedKeys) return;
  this._listenedKeys = true;

  // NOTE: The event emissions used to be reversed:
  // element + screen
  // They are now:
  // screen + element
  // After the first keypress emitted, the handler
  // checks to make sure grabKeys, lockKeys, and focused
  // weren't changed, and handles those situations appropriately.
  this.program.on('keypress', function(ch, key) {
    if (self.lockKeys) return;

    var focused = self.focused
      , grabKeys = self.grabKeys;

    if (!grabKeys) {
      self.emit('keypress', ch, key);
      self.emit('key ' + key.full, ch, key);
    }

    // If something changed from the screen key handler, stop.
    if (self.grabKeys !== grabKeys || self.lockKeys) {
      return;
    }

    if (~self.input.indexOf(focused)) {
      focused.emit('keypress', ch, key);
      focused.emit('key ' + key.full, ch, key);
      // self.emit('element keypress', focused, ch, key);
      // self.emit('element key ' + key.full, focused, ch, key);
    }
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
    this.lines[y].dirty = false;
  }

  this.olines = [];
  for (y = 0; y < this.rows; y++) {
    this.olines[y] = [];
    for (x = 0; x < this.cols; x++) {
      this.olines[y][x] = [this.dattr, ' '];
    }
  }

  this.program.clear();
};

Screen.prototype.render = function() {
  var self = this;

  this.emit('prerender');

  // TODO: Could possibly drop .dirty and just clear the `lines` buffer every
  // time before a screen.render. This way clearRegion doesn't have to be
  // called in arbitrary places for the sake of clearing a spot where an
  // element used to be (e.g. when an element moves or is hidden). There could
  // be some overhead though.
  // this.screen.clearRegion(0, this.cols, 0, this.rows);
  this._ci = 0;
  this.children.forEach(function(el) {
    el.index = self._ci++;
    el.render();
  });
  this._ci = -1;

  this.draw(0, this.rows - 1);

  this.emit('render');
};

Screen.prototype.blankLine = function(ch, dirty) {
  var out = [];
  for (var x = 0; x < this.cols; x++) {
    out[x] = [this.dattr, ch || ' '];
  }
  out.dirty = dirty;
  return out;
};

Screen.prototype.insertLine = function(n, y, top, bottom) {
  if (!this.tput
      || !this.tput.strings.change_scroll_region
      || !this.tput.strings.delete_line
      || !this.tput.strings.insert_line) return;

  this.program.sc();
  this.program.csr(top, bottom);
  this.program.cup(y, 0);
  //if (y === top && n === 1) {
  //  this.program.ri(); // su
  //} else {
  this.program.il(n);
  this.program.csr(0, this.height - 1);
  this.program.rc();

  var j = bottom + 1;

  while (n--) {
    this.lines.splice(y, 0, this.blankLine());
    this.lines.splice(j, 1);
    this.olines.splice(y, 0, this.blankLine());
    this.olines.splice(j, 1);
  }
};

Screen.prototype.deleteLine = function(n, y, top, bottom) {
  if (!this.tput
      || !this.tput.strings.change_scroll_region
      || !this.tput.strings.delete_line
      || !this.tput.strings.insert_line) return;

  this.program.sc();
  this.program.csr(top, bottom);
  //if (y === top && n === 1) {
  //  this.program.cup(bottom, 0);
  //  this.program.ind(); // sd
  //} else {
  this.program.cup(y, 0);
  this.program.dl(n);
  this.program.csr(0, this.height - 1);
  this.program.rc();

  var j = bottom + 1;

  while (n--) {
    this.lines.splice(j, 0, this.blankLine());
    this.lines.splice(y, 1);
    this.olines.splice(j, 0, this.blankLine());
    this.olines.splice(y, 1);
  }
};

Screen.prototype.insertBottom = function(top, bottom) {
  return this.deleteLine(1, top, top, bottom);
};

Screen.prototype.insertTop = function(top, bottom) {
  return this.insertLine(1, top, top, bottom);
};

Screen.prototype.deleteBottom = function(top, bottom) {
  return this.clearRegion(0, this.width, bottom, bottom);
};

Screen.prototype.deleteTop = function(top, bottom) {
  // Same as: return this.insertBottom(top, bottom);
  return this.deleteLine(1, top, top, bottom);
};

// Parse the sides of an element to determine
// whether an element has uniform cells on
// both sides. If it does, we can use CSR to
// optimize scrolling on a scrollable element.
// Not exactly sure how worthwile this is.
// This will cause a performance/cpu-usage hit,
// but will it be less or greater than the
// performance hit of slow-rendering scrollable
// boxes with clean sides?
Screen.prototype.cleanSides = function(el) {
  var pos = el._lastPos;

  if (!pos) {
    return false;
  }

  if (pos._cleanSides != null) {
    return pos._cleanSides;
  }

  if (pos.xi === 0 && pos.xl === this.width) {
    return pos._cleanSides = true;
  }

  if (!this.options.smartCSR) {
    return false;
  }

  var yi = pos.yi + (el.border ? 1 : 0) + el.padding
    , yl = pos.yl - (el.border ? 1 : 0) - el.padding
    , first
    , ch
    , x
    , y;

  for (x = pos.xi - 1; x >= 0; x--) {
    first = this.olines[yi][x];
    for (y = yi; y < yl; y++) {
      ch = this.olines[y][x];
      if (ch[0] !== first[0] || ch[1] !== first[1]) {
        return pos._cleanSides = false;
      }
    }
  }

  for (x = pos.xl; x < this.width; x++) {
    first = this.olines[yi][x];
    for (y = yi; y < yl; y++) {
      ch = this.olines[y][x];
      if (ch[0] !== first[0] || ch[1] !== first[1]) {
        return pos._cleanSides = false;
      }
    }
  }

  return pos._cleanSides = true;
};

Screen.prototype.draw = function(start, end) {
  var x
    , y
    , line
    , out
    , ch
    , data
    , attr
    , fg
    , bg
    , flags;

  var lx = -1
    , ly = -1
    , o;

  // var cx = this.program.x
  //   , cy = this.program.y
  //   , ch = this.program.cursorHidden;
  //
  // if (!ch) this.program.hideCursor();

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
        if (this.tput) {
          out += y === ly
            ? this.tput.cuf(x - lx)
            : this.tput.cup(y, x);
        } else {
          out += y === ly
            ? '\x1b[' + (x - lx) + 'C'
            : '\x1b[' + (y + 1) + ';' + (x + 1) + 'H';
        }
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

          bg = data & 0x1ff;
          fg = (data >> 9) & 0x1ff;
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

          if (bg !== 0x1ff) {
            bg = this._reduceColor(bg);
            if (bg < 16) {
              if (bg < 8) {
                bg += 40;
              } else if (bg < 16) {
                bg -= 8;
                bg += 100;
              }
              out += bg + ';';
            } else {
              out += '48;5;' + bg + ';';
            }
          }

          if (fg !== 0x1ff) {
            fg = this._reduceColor(fg);
            if (fg < 16) {
              if (fg < 8) {
                fg += 30;
              } else if (fg < 16) {
                fg -= 8;
                fg += 90;
              }
              out += fg + ';';
            } else {
              out += '38;5;' + fg + ';';
            }
          }

          if (out[out.length-1] === ';') out = out.slice(0, -1);

          out += 'm';
        }
      }

      // Attempt to use ACS for supported characters.
      // XXX We may not want to check tput.unicode here.
      if (this.tput
          && this.tput.strings.enter_alt_charset_mode
          && this.tput.acscr[ch]
          && !this.tput.brokenACS
          && !this.tput.unicode) {
        ch = this.tput.smacs()
          + this.tput.acscr[ch]
          + this.tput.rmacs();
      }

      out += ch;
      attr = data;
    }

    if (attr !== this.dattr) {
      out += '\x1b[m';
    }

    if (this.tput) {
      if (out) this.program.write(this.tput.cup(y, 0) + out);
    } else {
      if (out) this.program.write('\x1b[' + (y + 1) + ';1H' + out);
    }
  }

  // this.program.cup(cy, cx);
  // if (ch) this.program.hideCursor();

  this.program.restoreCursor();
};

Screen.prototype._reduceColor = function(col) {
  if (this.tput) {
    if (col >= 16 && this.tput.colors <= 16) {
      col = colors.ccolors[col];
    } else if (col >= 8 && this.tput.colors <= 8) {
      col -= 8;
    } else if (col >= 2 && this.tput.colors <= 2) {
      col %= 2;
    }
  }
  return col;
};

// Convert an SGR string to our own attribute format.
Screen.prototype.attrCode = function(code, cur) {
  var flags = (cur >> 18) & 0x1ff
    , fg = (cur >> 9) & 0x1ff
    , bg = cur & 0x1ff
    , c
    , i;

  code = /^\x1b\[([\d;]*)m$/.exec(code);
  if (!code) return cur;

  code = code[1].split(';');
  if (!code[0]) code[0] = '0';

  for (i = 0; i < code.length; i++) {
    c = +code[i] || 0;
    switch (c) {
      case 0: // normal
        bg = 0x1ff;
        fg = 0x1ff;
        flags = 0;
        break;
      case 1: // bold
        flags |= 1;
        break;
      case 22:
        flags &= ~1;
        break;
      case 4: // underline
        flags |= 2;
        break;
      case 24:
        flags &= ~2;
        break;
      case 5: // blink
        flags |= 4;
        break;
      case 25:
        flags &= ~4;
        break;
      case 7: // inverse
        flags |= 8;
        break;
      case 27:
        flags &= ~8;
        break;
      case 8: // invisible
        flags |= 16;
        break;
      case 28:
        flags &= ~16;
        break;
      default: // color
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
        } else if (c === 49) {
          bg = 0x1ff;
        } else if (c >= 30 && c <= 37) {
          fg = c - 30;
        } else if (c >= 90 && c <= 97) {
          fg = c - 90;
          fg += 8;
        } else if (c === 39) {
          fg = 0x1ff;
        }
        break;
    }
  }

  return (flags << 18) | (fg << 9) | bg;
};

// Convert our own attribute format to an SGR string.
Screen.prototype.codeAttr = function(code) {
  var flags = (code >> 18) & 0x1ff
    , fg = (code >> 9) & 0x1ff
    , bg = code & 0x1ff
    , out = '';

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

  if (bg !== 0x1ff) {
    bg = this._reduceColor(bg);
    if (bg < 16) {
      if (bg < 8) {
        bg += 40;
      } else if (bg < 16) {
        bg -= 8;
        bg += 100;
      }
      out += bg + ';';
    } else {
      out += '48;5;' + bg + ';';
    }
  }

  if (fg !== 0x1ff) {
    fg = this._reduceColor(fg);
    if (fg < 16) {
      if (fg < 8) {
        fg += 30;
      } else if (fg < 16) {
        fg -= 8;
        fg += 90;
      }
      out += fg + ';';
    } else {
      out += '38;5;' + fg + ';';
    }
  }

  if (out[out.length-1] === ';') out = out.slice(0, -1);

  return '\x1b[' + out + 'm';
};

Screen.prototype.focus = function(offset) {
  var shown = this.input.filter(function(el) {
    return el.visible;
  });
  if (!shown.length || !offset) return;
  var i = this.input.indexOf(this.focused);
  if (!~i) return;
  if (offset > 0) {
    while (offset--) {
      if (++i > this.input.length - 1) i = 0;
      if (!this.input[i].visible) offset++;
    }
  } else {
    offset = -offset;
    while (offset--) {
      if (--i < 0) i = this.input.length - 1;
      if (!this.input[i].visible) offset++;
    }
  }
  return this.input[i].focus();
};

Screen.prototype.focusPrev = function() {
  return this.focus(-1);
};

Screen.prototype.focusNext = function() {
  return this.focus(1);
};

Screen.prototype.focusPush = function(el) {
  if (this.history.length === 10) {
    this.history.shift();
  }
  this.history.push(el);
};

Screen.prototype.focusLast =
Screen.prototype.focusPop = function() {
  return this.history.pop();
};

Screen.prototype.saveFocus = function() {
  return this._savedFocus = this.focused;
};

Screen.prototype.restoreFocus = function() {
  if (!this._savedFocus) return;
  this._savedFocus.focus();
  delete this._savedFocus;
  return this.focused;
};

Screen.prototype.__defineGetter__('focused', function() {
  return this.history[this.history.length-1];
});

Screen.prototype.__defineSetter__('focused', function(el) {
  return this.focusPush(el);
});

Screen.prototype.clearRegion = function(xi, xl, yi, yl) {
  return this.fillRegion(this.dattr, ' ', xi, xl, yi, yl);
};

Screen.prototype.fillRegion = function(attr, ch, xi, xl, yi, yl) {
  var lines = this.lines
    , cell
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

Screen.prototype.key = function() {
  return this.program.key.apply(this, arguments);
};

Screen.prototype.onceKey = function() {
  return this.program.onceKey.apply(this, arguments);
};

Screen.prototype.unkey =
Screen.prototype.removeKey = function() {
  return this.program.unkey.apply(this, arguments);
};

Screen.prototype.spawn = function(file, args, options) {
  if (!Array.isArray(args)) {
    options = args;
    args = [];
  }

  var options = options || {}
    , spawn = require('child_process').spawn
    , screen = this;

  options.stdio = 'inherit';

  screen.program.saveCursor();
  screen.program.normalBuffer();
  screen.program.showCursor();

  var listenedMouse = screen._listenedMouse;
  if (listenedMouse) {
    screen.program.disableMouse();
  }

  var write = screen.program.output.write;
  screen.program.output.write = function() {};
  screen.program.input.pause();
  screen.program.input.setRawMode(false);

  var resume = function() {
    if (resume.done) return;
    resume.done = true;

    screen.program.input.setRawMode(true);
    screen.program.input.resume();
    screen.program.output.write = write;

    screen.program.alternateBuffer();
    // Restoring the cursor, or resetting to program.x/y - either works.
    // Technically, restoring cursor might be more foolproof.
    // screen.program.cup(screen.program.y, screen.program.x);
    screen.program.restoreCursor();
    screen.program.hideCursor();
    if (listenedMouse) {
      screen.program.enableMouse();
    }

    screen.alloc();
    screen.render();
  };

  var ps = spawn(file, args, options);

  ps.on('error', resume);

  ps.on('exit', resume);

  return ps;
};

Screen.prototype.exec = function(file, args, options, callback) {
  var callback = arguments[arguments.length-1]
    , ps = this.spawn(file, args, options);

  ps.on('error', function(err) {
    return callback(err, false);
  });

  ps.on('exit', function(code) {
    return callback(null, code === 0);
  });

  return ps;
};

Screen.prototype.readEditor = function(options, callback) {
  if (typeof options === 'string') {
    options = { editor: options };
  }

  if (!callback) {
    callback = options;
    options = null;
  }

  options = options || {};

  var self = this
    , fs = require('fs')
    , editor = options.editor || process.env.EDITOR || 'vi'
    , name = options.name || process.title || 'blessed'
    , rnd = Math.random().toString(36).split('.').pop()
    , file = '/tmp/' + name + '.' + rnd
    , args = [file]
    , opt;

  opt = {
    stdio: 'inherit',
    env: process.env,
    cwd: process.env.HOME
  };

  function writeFile(callback) {
    if (!options.value) return callback();
    return fs.writeFile(file, options.value, callback);
  }

  return writeFile(function() {
    return self.exec(editor, args, opt, function(err, success) {
      if (err) return callback(err);
      return fs.readFile(file, 'utf8', function(err, data) {
        return fs.unlink(file, function() {
          if (err) return callback(err);
          return callback(null, data);
        });
      });
    });
  });
};

Screen.prototype.setEffects = function(el, fel, over, out, effects, temp) {
  if (!effects) return;

  var tmp = {};
  if (temp) el[temp] = tmp;

  if (typeof el !== 'function') {
    var _el = el;
    el = function() { return _el; };
  }

  fel.on(over, function() {
    Object.keys(effects).forEach(function(key) {
      var val = effects[key];
      if (val !== null && typeof val === 'object') {
        tmp[key] = tmp[key] || {};
        Object.keys(val).forEach(function(k) {
          var v = val[k];
          tmp[key][k] = el()[key][k];
          el()[key][k] = v;
        });
        return;
      }
      tmp[key] = el()[key];
      el()[key] = val;
    });
    el().screen.render();
  });

  fel.on(out, function() {
    Object.keys(effects).forEach(function(key) {
      var val = effects[key];
      if (val !== null && typeof val === 'object') {
        tmp[key] = tmp[key] || {};
        Object.keys(val).forEach(function(k) {
          if (tmp[key][k] != null) {
            el()[key][k] = tmp[key][k];
          }
        });
        return;
      }
      if (tmp[key] != null) {
        el()[key] = tmp[key];
      }
    });
    el().screen.render();
  });
};

Screen.prototype.sigtstp = function(callback) {
  var self = this;
  this.program.sigtstp(function() {
    self.alloc();
    self.render();
    if (callback) callback();
  });
};

/**
 * Element
 */

function Element(options) {
  var self = this;

  if (!(this instanceof Element)) {
    return new Element(options);
  }

  Node.call(this, options);

  this.position = {
    left: options.left || 0,
    right: options.right || 0,
    top: options.top || 0,
    bottom: options.bottom || 0,
    width: options.width || null,
    height: options.height || null
  };

  // TODO: Possibly add padding/margins?
  // this.position.padding = options.padding || 0;
  // this.position.margin = options.margin || 0;

  this.fg = cens(options.fg);
  this.bg = cens(options.bg);
  this.bold = options.bold;
  this.underline = options.underline;
  this.blink = options.blink;
  this.inverse = options.inverse;
  this.invisible = options.invisible;

  this.hidden = options.hidden || false;
  this.fixed = options.fixed || false;
  this.align = options.align || 'left';
  this.shrink = options.shrink;
  this.padding = options.padding || 0;

  this.border = options.border;
  if (this.border) {
    this.border.type = this.border.type || 'bg';
    this.border.fg = cens(this.border.fg);
    this.border.bg = cens(this.border.bg);
    this.border.ch = this.border.ch || ' ';
  }

  if (options.clickable) {
    this.screen._listenMouse(this);
  }

  if (options.input) {
    this.screen._listenKeys(this);
  }

  this.parseTags = options.parseTags || options.tags;

  this.setContent(options.content || '');

  if (options.label) {
    this.append(new Box({
      screen: this.screen,
      content: options.label,
      left: 2,
      top: this.border ? 0 : -1,
      tags: this.parseTags,
      shrink: true
      // bg: this.border ? this.border.bg : null,
      // fg: this.border ? this.border.fg : null
    }));
  }

  // TODO: Possibly move this to Node for screen.on('mouse', ...).
  this.on('newListener', function fn(type) {
    if (type === 'mouse'
      || type === 'click'
      || type === 'mouseover'
      || type === 'mouseout'
      || type === 'mousedown'
      || type === 'mouseup'
      || type === 'mousewheel'
      || type === 'wheeldown'
      || type === 'wheelup'
      || type === 'mousemove') {
      self.screen._listenMouse(self);
    } else if (type === 'keypress' || type.indexOf('key ') === 0) {
      self.screen._listenKeys(self);
    }
  });

  this.on('resize', function() {
    self.parseContent();
  });

  this.on('attach', function() {
    self.parseContent();
  });

  // Legacy
  if (this.options.hoverBg != null) {
    this.options.hoverEffects = this.options.hoverEffects || {};
    this.options.hoverEffects.bg = this.options.hoverBg;
  }

  [['hoverEffects', 'mouseover', 'mouseout', '_htemp'],
   ['focusEffects', 'focus', 'blur', '_ftemp']].forEach(function(props) {
    var pname = props[0], over = props[1], out = props[2], temp = props[3];
    self.screen.setEffects(self, self, over, out, self.options[pname], temp);
  });

  if (options.focused) {
    this.focus();
  }
}

Element.prototype.__proto__ = Node.prototype;

Element.prototype.type = 'element';

Element.prototype.onScreenEvent = function(type, listener) {
  var self = this;
  if (this.parent) {
    this.screen.on(type, listener);
  }
  this.on('attach', function() {
    self.screen.on(type, listener);
  });
  this.on('detach', function() {
    self.screen.removeListener(type, listener);
  });
};

Element.prototype.hide = function() {
  if (this.hidden) return;
  this.hidden = true;
  this.clearPos();
  this.emit('hide');
  var below = this.screen.history[this.screen.history.length-2];
  if (below && this.screen.focused === this) below.focus();
};

Element.prototype.show = function() {
  if (!this.hidden) return;
  this.hidden = false;
  // this.render();
  this.emit('show');
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

Element.prototype.setContent = function(content, noClear) {
  this.content = content || '';
  this.parseContent();
  if (!noClear) this.clearPos();
};

Element.prototype.parseContent = function() {
  if (this.detached) return false;

  var width = this.width - (this.border ? 2 : 0) - this.padding * 2;
  if (this._clines == null
      || this._clines.width !== width
      || this._clines.content !== this.content) {
    var content = this.content;
    // Could move these 2 lines back to setContent (?)
    content = content.replace(/\x1b(?!\[[\d;]*m)/g, '');
    content = this._parseTags(content || '');
    content = content.replace(/\t/g, '        ');
    this._clines = wrapContent(content, width,
      this.parseTags, this.align, this.type === 'textarea');
    this._clines.width = width;
    this._clines.content = this.content;
    this._pcontent = this._clines.join('\n');
    this.emit('parsed content');
    return true;
  }

  return false;
};

// Convert `{red-fg}foo{/red-fg}` to `\x1b[31mfoo\x1b[39m`.
Element.prototype._parseTags = function(text) {
  if (!this.parseTags) return text;
  var program = this.screen.program;
  return text.replace(/{(\/?)([\w\-,;!#]*)}/g, function(tag, slash, color) {
    if (!color) return slash ? '\x1b[m' : tag;

    color = color.replace(/-/g, ' ');
    var result = program._attr(color, !slash);

    // Parse error. Just return the original text.
    if (!/^\x1b\[[\d;]*m$/.test(result)) {
      return tag;
    }

    return result;
  });
};

Element.prototype.__defineGetter__('visible', function() {
  var el = this;
  do {
    if (el.hidden) return false;
  } while (el = el.parent);
  return true;
});

Element.prototype.__defineGetter__('detached', function() {
  var el = this;
  do {
    if (el.type === 'screen') return false;
    if (!el.parent) return true;
  } while (el = el.parent);
  return false;
});

Element.prototype.key = function() {
  return this.screen.program.key.apply(this, arguments);
};

Element.prototype.onceKey = function() {
  return this.screen.program.onceKey.apply(this, arguments);
};

Element.prototype.unkey =
Element.prototype.removeKey = function() {
  return this.screen.program.unkey.apply(this, arguments);
};

Element.prototype.clearPos = function() {
  if (this._lastPos && !this._lastPos.cleared) {
    // optimize by making sure we only clear once.
    this._lastPos.cleared = true;
    this.screen.clearRegion(
      this._lastPos.xi, this._lastPos.xl,
      this._lastPos.yi, this._lastPos.yl);
  }
};

/**
 * Positioning
 */

// NOTE: When coords are entered in the Element constructor, all of the coords
// are *relative* to their parent, when retrieving them from `.left`, `.right`,
// etc members, the coords are absolute. To see the *relative* coords again,
// use `.rleft`, `.rright`, etc.

Element.prototype.__defineGetter__('left', function() {
  var left = this.position.left;

  if (typeof left === 'string') {
    if (left === 'center') left = '50%';
    left = +left.slice(0, -1) / 100;
    left = this.parent.width * left | 0;
    if (this.position.left === 'center') {
      left -= this.width / 2 | 0;
    }
  }

  if (this.options.left == null && this.options.right != null) {
    return this.screen.cols - this.width - this.right;
  }

  return (this.parent.left || 0) + left;
});

Element.prototype.__defineGetter__('right', function() {
  if (this.options.right == null && this.options.left != null) {
    return this.screen.cols - (this.left + this.width);
  }
  return (this.parent.right || 0) + this.position.right;
});

Element.prototype.__defineGetter__('top', function() {
  var top = this.position.top;

  if (typeof top === 'string') {
    if (top === 'center') top = '50%';
    top = +top.slice(0, -1) / 100;
    top = this.parent.height * top | 0;
    if (this.position.top === 'center') {
      top -= this.height / 2 | 0;
    }
  }

  if (this.options.top == null && this.options.bottom != null) {
    return this.screen.rows - this.height - this.bottom;
  }

  return (this.parent.top || 0) + top;
});

Element.prototype.__defineGetter__('bottom', function() {
  if (this.options.bottom == null && this.options.top != null) {
    return this.screen.rows - (this.top + this.height);
  }
  return (this.parent.bottom || 0) + this.position.bottom;
});

// TODO: Move _getShrinkSize calculation here. This will in turn fix .left.
Element.prototype.__defineGetter__('width', function() {
  var width = this.position.width;
  if (typeof width === 'string') {
    if (width === 'half') width = '50%';
    width = +width.slice(0, -1) / 100;
    return this.parent.width * width | 0;
  }
  if (!width) {
    // Problem if .left is 'center', we can't calculate the width
    // NOTE: This assume `right` cannot be a string.
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

// TODO: Move _getShrinkSize calculation here. This will in turn fix .top.
Element.prototype.__defineGetter__('height', function() {
  var height = this.position.height;
  if (typeof height === 'string') {
    if (height === 'half') height = '50%';
    height = +height.slice(0, -1) / 100;
    return this.parent.height * height | 0;
  }
  if (!height) {
    // Problem if .top is 'center', we can't calculate the height
    // NOTE: This assume `bottom` cannot be a string.
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
    left = this.parent.width * left | 0;
    if (this.position.left === 'center') {
      left -= this.width / 2 | 0;
    }
  }

  if (this.options.left == null && this.options.right != null) {
    return this.parent.width - this.width - this.right;
  }

  return left;
});

Element.prototype.__defineGetter__('rright', function() {
  if (this.options.right == null && this.options.left != null) {
    return this.parent.width - (this.rleft + this.width);
  }
  return this.position.right;
});

Element.prototype.__defineGetter__('rtop', function() {
  var top = this.position.top;

  if (typeof top === 'string') {
    if (top === 'center') top = '50%';
    top = +top.slice(0, -1) / 100;
    top = this.parent.height * top | 0;
    if (this.position.top === 'center') {
      top -= this.height / 2 | 0;
    }
  }

  if (this.options.top == null && this.options.bottom != null) {
    return this.parent.height - this.height - this.bottom;
  }

  return top;
});

Element.prototype.__defineGetter__('rbottom', function() {
  if (this.options.bottom == null && this.options.top != null) {
    return this.parent.height - (this.rtop + this.height);
  }
  return this.position.bottom;
});

// TODO: Reconcile the fact the `position.left` is actually `.rleft`. etc.
// TODO: Allow string values for absolute coords below.
// TODO: Optimize clearing to only clear what is necessary.

Element.prototype.__defineSetter__('left', function(val) {
  if (typeof val === 'string') {
    if (val === 'center') val = '50%';
    val = +val.slice(0, -1) / 100;
    val = this.screen.width * val | 0;
  }
  val -= this.parent.left;
  if (this.position.left === val) return;
  this.emit('move');
  this.clearPos();
  return this.options.left = this.position.left = val;
});

Element.prototype.__defineSetter__('right', function(val) {
  if (typeof val === 'string') {
    if (val === 'center') val = '50%';
    val = +val.slice(0, -1) / 100;
    val = this.screen.width * val | 0;
  }
  val -= this.parent.right;
  if (this.position.right === val) return;
  this.emit('move');
  this.clearPos();
  //if (this.options.right == null) {
  //  return this.options.left = this.position.left = this.screen.width - 1 - val;
  //}
  return this.options.right = this.position.right = val;
});

Element.prototype.__defineSetter__('top', function(val) {
  if (typeof val === 'string') {
    if (val === 'center') val = '50%';
    val = +val.slice(0, -1) / 100;
    val = this.screen.height * val | 0;
  }
  val -= this.parent.top;
  if (this.position.top === val) return;
  this.emit('move');
  this.clearPos();
  return this.options.top = this.position.top = val;
});

Element.prototype.__defineSetter__('bottom', function(val) {
  if (typeof val === 'string') {
    if (val === 'center') val = '50%';
    val = +val.slice(0, -1) / 100;
    val = this.screen.height * val | 0;
  }
  val -= this.parent.bottom;
  if (this.position.bottom === val) return;
  this.emit('move');
  this.clearPos();
  //if (this.options.bottom == null) {
  //  return this.options.top = this.position.top = this.screen.height - 1 - val;
  //}
  return this.options.bottom = this.position.bottom = val;
});

Element.prototype.__defineSetter__('width', function(val) {
  if (this.position.width === val) return;
  this.emit('resize');
  this.clearPos();
  return this.options.width = this.position.width = val;
});

Element.prototype.__defineSetter__('height', function(val) {
  if (this.position.height === val) return;
  this.emit('resize');
  this.clearPos();
  return this.options.height = this.position.height = val;
});

Element.prototype.__defineSetter__('rleft', function(val) {
  if (this.position.left === val) return;
  this.emit('move');
  this.clearPos();
  return this.options.left = this.position.left = val;
});

Element.prototype.__defineSetter__('rright', function(val) {
  if (this.position.right === val) return;
  this.emit('move');
  this.clearPos();
  //if (this.options.right == null) {
  //  return this.options.left = this.position.left = this.parent.width - 1 - val;
  //}
  return this.options.right = this.position.right = val;
});

Element.prototype.__defineSetter__('rtop', function(val) {
  if (this.position.top === val) return;
  this.emit('move');
  this.clearPos();
  return this.options.top = this.position.top = val;
});

Element.prototype.__defineSetter__('rbottom', function(val) {
  if (this.position.bottom === val) return;
  this.emit('move');
  this.clearPos();
  //if (this.options.bottom == null) {
  //  return this.options.top = this.position.top = this.parent.height - 1 - val;
  //}
  return this.options.bottom = this.position.bottom = val;
});

/**
 * Box
 */

function Box(options) {
  if (!(this instanceof Box)) {
    return new Box(options);
  }
  Element.call(this, options);
}

Box.prototype.__proto__ = Element.prototype;

Box.prototype.type = 'box';

// TODO: Optimize. Move elsewhere.
Box.prototype._getShrinkSize = function(content) {
  return {
    height: this._clines.length,
    width: this._clines.reduce(function(current, line) {
      line = line.replace(/\x1b\[[\d;]*m/g, '');
      return line.length > current
        ? line.length
        : current;
    }, 0)
  };
};

// Here be dragons.
// TODO: Potentially move all calculations performed on
// xi/xl/yi/yl here to Element offset and size getters.
Box.prototype.render = function(stop) {
  // NOTE: Maybe move this `hidden` check down below `stop` check and return `ret`.
  if (this.hidden) return;

  this.parseContent();

  var lines = this.screen.lines
    , xi_ = this.left
    , xi
    , xl = this.screen.cols - this.right
    , yi_ = this.top
    , yi
    , yl = this.screen.rows - this.bottom
    , cell
    , attr
    , ch
    , content = this._pcontent
    , ci = this.contentIndex || 0
    , cl = content.length
    , battr
    , dattr
    , c
    , rtop
    , visible
    , hw
    , h
    , w
    , xll
    , yll
    , ret
    , cci;

  if (this.position.width) {
    xl = xi_ + this.width;
  }

  if (this.position.height) {
    yl = yi_ + this.height;
  }

  // Check to make sure we're visible and inside of the visible scroll area.
  if (this.parent.childBase != null && (!this.parent.items || ~this.parent.items.indexOf(this))) {
    rtop = this.rtop - (this.parent.border ? 1 : 0);
    visible = this.parent.height - (this.parent.border ? 2 : 0);

    yi_ -= this.parent.childBase;
    yl = Math.min(yl, this.screen.rows - this.parent.bottom - (this.parent.border ? 1 : 0));

    if (rtop - this.parent.childBase < 0) {
      return;
    }

    if (rtop - this.parent.childBase >= visible) {
      return;
    }
  }

  // TODO: Check for 'center', recalculate yi, and xi. Better
  // yet, simply move this check into this.left/width/etc.
  if (this.shrink) {
    hw = this._getShrinkSize(content);
    h = hw.height;
    w = hw.width;
    xll = xl;
    yll = yl;

    if (this.options.width == null
        && (this.options.left == null
        || this.options.right == null)) {
      if (this.options.left == null && this.options.right != null) {
        xi_ = xl - w - (this.border ? 2 : 0) - this.padding * 2;
      } else {
        xl = xi_ + w + (this.border ? 2 : 0) + this.padding * 2;
      }
    }

    if (this.options.height == null
        && (this.options.top == null
        || this.options.bottom == null)
        && this.childBase == null) {
      if (this.options.top == null && this.options.bottom != null) {
        yi_ = yl - h - (this.border ? 2 : 0) - this.padding * 2;
      } else {
        yl = yi_ + h + (this.border ? 2 : 0) + this.padding * 2;
      }
    }

    // Recenter shrunken elements.
    if (xl < xll && this.options.left === 'center') {
      xll = (xll - xl) / 2 | 0;
      xi_ += xll;
      xl += xll;
    }

    if (yl < yll && this.options.top === 'center') {
      yll = (yll - yl) / 2 | 0;
      yi_ += yll;
      yl += yll;
    }
  }

  // TODO:
  // Calculate whether we moved/resized by checking the previous _lastPos.
  // Maybe clear based on that. Possibly emit events here.
  ret = this._lastPos = {
    xi: xi_,
    xl: xl,
    yi: yi_,
    yl: yl
  };

  if (stop) return ret;

  battr = this.border
    ? sattr(this.border, this.border.fg, this.border.bg)
    : 0;

  dattr = sattr(this, this.fg, this.bg);
  attr = dattr;

  // Check previous line for escape codes.
  if (this.contentIndex != null && this.childBase > 0 && this._clines) {
    cci = ci - (this._clines[this.childBase - 1].length + 1);
    for (; cci < ci; cci++) {
      if (content[cci] === '\x1b') {
        if (c = /^\x1b\[[\d;]*m/.exec(content.substring(cci))) {
          attr = this.screen.attrCode(c[0], attr);
          cci += c[0].length - 1;
        }
      }
    }
  }

  if (this.border) yi_++, yl--, xi_++, xl--;

  if (this.padding) {
    yi_ += this.padding, yl -= this.padding;
    xi_ += this.padding, xl -= this.padding;
  }

outer:
  for (yi = yi_; yi < yl; yi++) {
    if (!lines[yi]) break;
    for (xi = xi_; xi < xl; xi++) {
      cell = lines[yi][xi];
      if (!cell) break;

      ch = content[ci++] || ' ';

      // Handle escape codes.
      while (ch === '\x1b') {
        if (c = /^\x1b\[[\d;]*m/.exec(content.substring(ci - 1))) {
          ci += c[0].length - 1;
          attr = this.screen.attrCode(c[0], attr);
          ch = content[ci] || ' ';
          ci++;
        } else {
          break;
        }
      }

      // Handle newlines.
      if (ch === '\t') ch = ' ';
      if (ch === '\n' || ch === '\r') {
        // If we're on the first cell and we find a newline and the last cell
        // of the last line was not a newline, let's just treat this like the
        // newline was already "counted".
        if (xi === xi_ && yi !== yi_ && content[ci-2] !== '\n') {
          xi--;
          continue;
        }
        // this.screen.fillRegion(attr, ' ', xi, xl, yi, yi + 1);
        // continue outer;
        ch = ' ';
        for (; xi < xl; xi++) {
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
      // if (ch < ' ') ch = ' ';

      if (attr !== cell[0] || ch !== cell[1]) {
        lines[yi][xi][0] = attr;
        lines[yi][xi][1] = ch;
        lines[yi].dirty = true;
      }
    }
  }

  h = this.items ? this.items.length : this._clines.length;
  if (this.scrollbar && (yl - yi_) < h) {
    xi = xl - 1;
    if (this.scrollbar.ignoreBorder && this.border) xi++;
    if (this.selected == null) {
      // TODO: Fix this - doesn't work with lists (and possibly scrollabletext).
      yi = h - (yl - yi_) - (this.border ? 2 : 0) - this.padding * 2;
      yi = yi_ + (((yl - yi_) * (this.childBase / yi)) | 0);
    } else {
      yi = this.selected / h;
      yi = yi_ + ((yl - yi_) * yi | 0);
    }
    cell = lines[yi] && lines[yi][xi];
    if (cell) {
      ch = this.scrollbar.ch || ' ';
      attr = sattr(this,
        this.scrollbar.fg || this.fg,
        this.scrollbar.bg || this.bg);
      if (attr !== cell[0] || ch !== cell[1]) {
        lines[yi][xi][0] = attr;
        lines[yi][xi][1] = ch;
        lines[yi].dirty = true;
      }
    }
  }

  // This seems redundant, but we need to draw the
  // border second because of the `shrink` option.
  if (this.border) yi_--, yl++, xi_--, xl++;

  if (this.padding) {
    yi_ -= this.padding, yl += this.padding;
    xi_ -= this.padding, xl += this.padding;
  }

  if (this.border) {
    yi = yi_;
    for (xi = xi_; xi < xl; xi++) {
      if (!lines[yi]) break;
      if (this.border.type === 'ascii') {
        if (xi === xi_) ch = '┌';
        else if (xi === xl - 1) ch = '┐';
        else ch = '─';
      } else if (this.border.type === 'bg') {
        ch = this.border.ch;
      }
      cell = lines[yi][xi];
      if (!cell) break;
      if (battr !== cell[0] || ch !== cell[1]) {
        lines[yi][xi][0] = battr;
        lines[yi][xi][1] = ch;
        lines[yi].dirty = true;
      }
    }
    yi = yi_ + 1;
    for (; yi < yl; yi++) {
      if (!lines[yi]) break;
      if (this.border.type === 'ascii') {
        ch = '│';
      } else if (this.border.type === 'bg') {
        ch = this.border.ch;
      }
      cell = lines[yi][xi_];
      if (!cell) break;
      if (battr !== cell[0] || ch !== cell[1]) {
        lines[yi][xi_][0] = battr;
        lines[yi][xi_][1] = ch;
        lines[yi].dirty = true;
      }
      cell = lines[yi][xl - 1];
      if (!cell) break;
      if (battr !== cell[0] || ch !== cell[1]) {
        lines[yi][xl - 1][0] = battr;
        lines[yi][xl - 1][1] = ch;
        lines[yi].dirty = true;
      }
    }
    yi = yl - 1;
    for (xi = xi_; xi < xl; xi++) {
      if (!lines[yi]) break;
      if (this.border.type === 'ascii') {
        if (xi === xi_) ch = '└';
        else if (xi === xl - 1) ch = '┘';
        else ch = '─';
      } else if (this.border.type === 'bg') {
        ch = this.border.ch;
      }
      cell = lines[yi][xi];
      if (!cell) break;
      if (battr !== cell[0] || ch !== cell[1]) {
        lines[yi][xi][0] = battr;
        lines[yi][xi][1] = ch;
        lines[yi].dirty = true;
      }
    }
  }

  this.children.forEach(function(el) {
    if (el.screen._ci !== -1) {
      el.index = el.screen._ci++;
    }
    el.render();
  });

  return ret;
};

// Create a much more efficient rendering by using insert-line,
// delete-line, and change screen region codes when possible.
// NOTE: If someone does:
//   box.left = box.right = 0;
//   screen.render();
//   box.left++;
//   box.insertTop('foobar');
// Things will break because we're using _lastPos instead of render(true).
// Maybe _lastPos could be updated on .left, .right, etc setters?

Box.prototype.insertLine = function(i, line) {
  var pos = this._lastPos || 0;

  if (typeof line === 'string') line = [line];

  if (i > this._clines.length) {
    for (var j = this._clines.length; j < i; j++) this._clines.push('');
  }

  i = Math.max(i, 0);
  //i = Math.min(i, this._clines.length);

  var height = pos.yl - pos.yi - (this.border ? 2 : 0) - this.padding * 2
    , base = this.childBase || 0
    , visible = i >= base && i - base < height;

  if (pos && visible && this.screen.cleanSides(this)) {
    this.screen.insertLine(line.length,
      pos.yi + (this.border ? 1 : 0) + this.padding + i - base,
      pos.yi,
      pos.yl - (this.border ? 1 : 0) - this.padding - 1);
  }

  line.forEach(function(line, j) {
    this._clines.splice(i + j, 0, line);
  }, this);

  this.setContent(this._clines.join('\n'), true);
};

Box.prototype.deleteLine = function(i, n) {
  var pos = this._lastPos || 0;

  var reset = true
    , n = n || 1;

  i = Math.max(i, 0);
  i = Math.min(i, this._clines.length - 1);

  var height = pos.yl - pos.yi - (this.border ? 2 : 0) - this.padding * 2
    , base = this.childBase || 0
    , visible = i >= base && i - base < height;

  if (pos && visible && this.screen.cleanSides(this)) {
    this.screen.deleteLine(n,
      pos.yi + (this.border ? 1 : 0) + this.padding + i - base,
      pos.yi,
      pos.yl - (this.border ? 1 : 0) - this.padding - 1);
    reset = false;
  }

  while (n--) {
    this._clines.splice(i, 1);
  }

  this.setContent(this._clines.join('\n'), reset);
};

Box.prototype.insertTop = function(line) {
  return this.insertLine((this.childBase || 0) + 0, line);
};

Box.prototype.insertBottom = function(line) {
  return this.insertLine((this.childBase || 0)
    + this.height - (this.border ? 2 : 0) - this.padding * 2, line);
};

Box.prototype.deleteTop = function() {
  return this.deleteLine((this.childBase || 0) + 0);
};

Box.prototype.deleteBottom = function() {
  return this.deleteLine((this.childBase || 0)
    + this.height - (this.border ? 2 : 0) - this.padding * 2);
};

Box.prototype.setLine = function(i, line) {
  if (i > this._clines.length) {
    for (var j = this._clines.length; j < i; j++) this._clines.push('');
  }
  i = Math.max(i, 0);
  //i = Math.min(i, this._clines.length);
  this._clines[(this.childBase || 0) + i] = line;
  return this.setContent(this._clines.join('\n'), true);
};

Box.prototype.getLine = function(i) {
  i = Math.max(i, 0);
  i = Math.min(i, this._clines.length);
  return this._clines[(this.childBase || 0) + i];
};

Box.prototype.clearLine = function(i) {
  i = Math.min(i, this._clines.length - 1);
  return this.setLine(i, '');
};

/**
 * Text
 */

function Text(options) {
  if (!(this instanceof Text)) {
    return new Text(options);
  }
  options.shrink = true;
  Box.call(this, options);
}

Text.prototype.__proto__ = Box.prototype;

/**
 * Line
 */

function Line(options) {
  var self = this;

  if (!(this instanceof Line)) {
    return new Line(options);
  }

  var orientation = options.orientation || 'vertical';
  delete options.orientation;

  if (orientation === 'vertical') {
    options.width = 1;
  } else {
    options.height = 1;
  }

  this.ch = !options.type || options.type === 'ascii'
    ? orientation === 'horizontal' ? '─' : '│'
    : options.ch || ' ';

  options.border = {
    type: 'bg',
    get fg() { return self.fg; },
    get bg() { return self.bg; },
    get ch() { return self.ch; },
    set fg(c) { self.fg = c; },
    set bg(c) { self.bg = c; },
    set ch(c) { self.ch = c; }
  };

  delete options.fg;
  delete options.bg;
  delete options.ch;

  Box.call(this, options);
}

Line.prototype.__proto__ = Box.prototype;

Line.prototype.type = 'line';

/**
 * ScrollableBox
 */

function ScrollableBox(options) {
  if (!(this instanceof ScrollableBox)) {
    return new ScrollableBox(options);
  }

  Box.call(this, options);

  this.scrollable = true;
  this.childOffset = 0;
  this.childBase = 0;
  this.baseLimit = options.baseLimit || Infinity;
  this.alwaysScroll = options.alwaysScroll;

  this.scrollbar = options.scrollbar;
  if (this.scrollbar) {
    this.scrollbar.fg = cens(this.scrollbar.fg);
    this.scrollbar.bg = cens(this.scrollbar.bg);
    this.scrollbar.ch = this.scrollbar.ch || ' ';
  }
}

ScrollableBox.prototype.__proto__ = Box.prototype;

ScrollableBox.prototype.type = 'scrollable-box';

ScrollableBox.prototype.scroll = function(offset) {
  var visible = this.height - (this.border ? 2 : 0) - this.padding * 2
    , base = this.childBase
    , d
    , p
    , t
    , b;

  // Maybe do for lists:
  // if (this.items) visible = Math.min(this.items.length, visible);
  if (this.alwaysScroll) {
    // Semi-workaround
    this.childOffset = offset > 0
      ? visible - 1 + offset
      : offset;
  } else {
    this.childOffset += offset;
  }

  if (this.childOffset > visible - 1) {
    d = this.childOffset - (visible - 1);
    this.childOffset -= d;
    this.childBase += d;
  } else if (this.childOffset < 0) {
    d = this.childOffset;
    this.childOffset += -d;
    this.childBase += d;
  }

  if (this.childBase < 0) {
    this.childBase = 0;
  } else if (this.childBase > this.baseLimit) {
    this.childBase = this.baseLimit;
  }

  // Optimize scrolling with CSR + IL/DL.
  p = this._lastPos;
  if (this.childBase !== base && this.screen.cleanSides(this)) {
    t = p.yi + (this.border ? 1 : 0) + this.padding;
    b = p.yl - (this.border ? 1 : 0) - this.padding - 1;
    d = this.childBase - base;

    // var attr = this.screen.olines[t][p.xi + (this.border ? 1 : 0) + this.padding][0];
    // this.screen.program.write(this.screen.codeAttr(attr, this.screen));

    if (d > 0 && d < visible) {
      // scrolled down
      this.screen.deleteLine(d, t, t, b);
    } else if (d < 0 && -d < visible) {
      // scrolled up
      d = -d;
      this.screen.insertLine(d, t, t, b);
    }

    // this.screen.program.sgr0();
  }

  this.emit('scroll');
};

ScrollableBox.prototype.resetScroll = function() {
  this.childOffset = 0;
  this.childBase = 0;
};

/**
 * List
 */

function List(options) {
  var self = this;

  if (!(this instanceof List)) {
    return new List(options);
  }

  ScrollableBox.call(this, options);

  this.items = [];
  this.ritems = [];
  this.selected = 0;

  this.selectedBg = cens(options.selectedBg);
  this.selectedFg = cens(options.selectedFg);
  this.selectedBold = options.selectedBold;
  this.selectedUnderline = options.selectedUnderline;
  this.selectedBlink = options.selectedBlink;
  this.selectedInverse = options.selectedInverse;
  this.selectedInvisible = options.selectedInvisible;

  this.mouse = options.mouse || false;

  if (options.items) {
    this.ritems = options.items;
    options.items.forEach(this.add.bind(this));
  }

  if (this.children.length) {
    // Will throw if this.parent is not set!
    // Probably not good to have in a constructor.
    // this.select(0);
  }

  if (this.mouse) {
    this.on('wheeldown', function(data) {
      self.select(self.selected + 2);
      self.screen.render();
    });

    this.on('wheelup', function(data) {
      self.select(self.selected - 2);
      self.screen.render();
    });
  }

  if (options.keys) {
    this.on('keypress', function(ch, key) {
      if (key.name === 'up' || (options.vi && key.name === 'k')) {
        self.up();
        self.screen.render();
        return;
      }
      if (key.name === 'down' || (options.vi && key.name === 'j')) {
        self.down();
        self.screen.render();
        return;
      }
      if (key.name === 'enter' || (options.vi && key.name === 'l' && !key.shift)) {
        self.emit('action', self.items[self.selected], self.selected);
        self.emit('select', self.items[self.selected], self.selected);
        return;
      }
      if (key.name === 'escape' || (options.vi && key.name === 'q')) {
        self.emit('action');
        self.emit('cancel');
        return;
      }
      if (options.vi && key.name === 'u' && key.ctrl) {
        self.move(-((self.height - (self.border ? 2 : 0)) / 2) | 0);
        self.screen.render();
        return;
      }
      if (options.vi && key.name === 'd' && key.ctrl) {
        self.move((self.height - (self.border ? 2 : 0)) / 2 | 0);
        self.screen.render();
        return;
      }
      if (options.vi && key.name === 'b' && key.ctrl) {
        self.move(-(self.height - (self.border ? 2 : 0)));
        self.screen.render();
        return;
      }
      if (options.vi && key.name === 'f' && key.ctrl) {
        self.move(self.height - (self.border ? 2 : 0));
        self.screen.render();
        return;
      }
      if (options.vi && key.name === 'h' && key.shift) {
        self.move(self.childBase - self.selected);
        self.screen.render();
        return;
      }
      if (options.vi && key.name === 'm' && key.shift) {
        // TODO: Maybe use Math.min(this.items.length, ... for calculating visible items elsewhere.
        self.move(self.childBase
          + (Math.min(self.height - (self.border ? 2 : 0), this.items.length) / 2 | 0)
          - self.selected);
        self.screen.render();
        return;
      }
      if (options.vi && key.name === 'l' && key.shift) {
        // XXX This goes one too far on lists with an odd number of items.
        self.down(self.childBase
          + Math.min(self.height - (self.border ? 2 : 0), this.items.length)
          - self.selected);
        self.screen.render();
        return;
      }
      if (options.vi && key.name === 'g' && !key.shift) {
        self.select(0);
        self.screen.render();
        return;
      }
      if (options.vi && key.name === 'g' && key.shift) {
        self.select(self.items.length - 1);
        self.screen.render();
        return;
      }
    });
  }

  this.on('resize', function() {
    var visible = self.height - (self.border ? 2 : 0);
    if (visible >= self.selected + 1) {
    //if (self.selected < visible - 1) {
      self.childBase = 0;
      self.childOffset = self.selected;
    } else {
      // Is this supposed to be: self.childBase = visible - self.selected + 1; ?
      self.childBase = self.selected - visible + 1;
      self.childOffset = visible - 1;
    }
  });
}

List.prototype.__proto__ = ScrollableBox.prototype;

List.prototype.type = 'list';

List.prototype.add = function(item) {
  var self = this;

  var options = {
    screen: this.screen,
    content: item,
    align: this.align || 'left',
    top: this.items.length + (this.border ? 1 : 0) + this.padding,
    left: (this.border ? 1 : 0) + this.padding + 1,
    right: (this.border ? 1 : 0) + this.padding + 1,
    tags: this.parseTags,
    height: 1,
    hoverBg: this.mouse ? this.options.itemHoverBg : null,
    hoverEffects: this.mouse ? this.options.itemHoverEffects : null
  };

  ['bg', 'fg', 'bold', 'underline',
   'blink', 'inverse', 'invisible'].forEach(function(name) {
    // TODO: Move all specific options to their own object namespaces.
    var sname = 'selected' + name[0].toUpperCase() + name.substring(1);
    options[name] = function() {
      return self.items[self.selected] === item
        ? self[sname]
        : self[name];
    };
  });

  var item = new Box(options);

  this.append(item);
  this.items.push(item);

  if (this.mouse) {
    item.on('click', function(data) {
      if (self.items[self.selected] === item) {
        self.emit('action', item, self.selected);
        self.emit('select', item, self.selected);
        return;
      }
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

List.prototype.setItems = function(items) {
  var i = 0
    , original = this.items.slice()
    //, selected = this.selected
    , sel = this.ritems[this.selected];

  this.ritems = items;

  this.select(0);

  for (; i < items.length; i++) {
    if (this.items[i]) {
      this.items[i].setContent(items[i]);
    } else {
      this.add(items[i]);
    }
  }

  for (; i < original.length; i++) {
    this.remove(original[i]);
  }

  // Try to find our old item if it still exists.
  sel = items.indexOf(sel);
  if (~sel) this.select(sel);
  //this.select(~sel ? sel : selected);
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
  var self = this;

  if (!(this instanceof ScrollableText)) {
    return new ScrollableText(options);
  }

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

  if (options.keys) {
    this.on('keypress', function(ch, key) {
      if (key.name === 'up' || (options.vi && key.name === 'k')) {
        self.scroll(-1);
        self.screen.render();
        return;
      }
      if (key.name === 'down' || (options.vi && key.name === 'j')) {
        self.scroll(1);
        self.screen.render();
        return;
      }
      if (options.vi && key.name === 'u' && key.ctrl) {
        self.scroll(-(self.height / 2 | 0) || -1);
        self.screen.render();
        return;
      }
      if (options.vi && key.name === 'd' && key.ctrl) {
        self.scroll(self.height / 2 | 0 || 1);
        self.screen.render();
        return;
      }
      if (options.vi && key.name === 'b' && key.ctrl) {
        self.scroll(-self.height || -1);
        self.screen.render();
        return;
      }
      if (options.vi && key.name === 'f' && key.ctrl) {
        self.scroll(self.height || 1);
        self.screen.render();
        return;
      }
      if (options.vi && key.name === 'g' && !key.shift) {
        self.scroll(-self._clines.length);
        self.screen.render();
        return;
      }
      if (options.vi && key.name === 'g' && key.shift) {
        self.scroll(self._clines.length);
        self.screen.render();
        return;
      }
    });
  }

  this.on('parsed content', function() {
    self._recalculateIndex();
  });

  self._recalculateIndex();
}

ScrollableText.prototype.__proto__ = ScrollableBox.prototype;

ScrollableText.prototype.type = 'scrollable-text';

ScrollableText.prototype._scroll = ScrollableText.prototype.scroll;
ScrollableText.prototype.scroll = function(offset) {
  var base = this.childBase
    , ret = this._scroll(offset)
    , cb = this.childBase
    , diff = cb - base
    , w
    , i
    , max
    , t;

  if (diff === 0) return ret;

  // When scrolling text, we want to be able to handle SGR codes as well as line
  // feeds. This allows us to take preformatted text output from other programs
  // and put it in a scrollable text box.
  if (this.content != null) {
    this.parseContent();

    max = this._clines.length - (this.height - (this.border ? 2 : 0) - this.padding * 2);
    if (max < 0) max = 0;

    if (cb > max) {
      this.childBase = cb = max;
      diff = cb - base;
    }

    if (diff > 0) {
      for (i = base; i < cb; i++) this.contentIndex += this._clines[i].length + 1;
    } else {
      for (i = base - 1; i >= cb; i--) this.contentIndex -= this._clines[i].length + 1;
    }
  }

  return ret;
};

ScrollableText.prototype._recalculateIndex = function() {
  if (this.detached) return;

  var max = this._clines.length - (this.height - (this.border ? 2 : 0) - this.padding * 2);
  if (max < 0) max = 0;

  if (this.childBase > max) {
    this.childBase = max;
  }

  for (var i = 0, t = 0; i < this.childBase; i++) {
    t += this._clines[i].length + 1;
  }

  this.contentIndex = t;
};

/**
 * Input
 */

function Input(options) {
  if (!(this instanceof Input)) {
    return new Input(options);
  }
  Box.call(this, options);
}

Input.prototype.__proto__ = Box.prototype;

Input.prototype.type = 'input';

/**
 * Textbox
 */

function Textbox(options) {
  if (!(this instanceof Textbox)) {
    return new Textbox(options);
  }

  Input.call(this, options);

  this.screen._listenKeys(this);

  this.value = options.value || '';
  this.secret = options.secret;
  this.censor = options.censor;

  var self = this;

  this.on('resize', updateCursor);
  this.on('move', updateCursor);

  function updateCursor() {
    if (self.screen.focused !== self) return;
    self.screen.program.cup(
      self.top + (self.border ? 1 : 0),
      self.left + (self.border ? 1 : 0)
      + self.value.length);
  }
}

Textbox.prototype.__proto__ = Input.prototype;

Textbox.prototype.type = 'textbox';

Textbox.prototype.input =
Textbox.prototype.readInput =
Textbox.prototype.setInput = function(callback) {
  var self = this
    , focused = this.screen.focused === this;

  if (!focused) {
    this.screen.saveFocus();
    this.focus();
  }

  this.screen.grabKeys = true;

  // Could possibly save and restore cursor.

  this.screen.program.cup(
    this.top + (this.border ? 1 : 0) + this.padding,
    this.left + (this.border ? 1 : 0) + this.padding
    + this.value.length);
  this.screen.program.showCursor();
  this.screen.program.sgr('normal');

  this._callback = function(err, value) {
    self.screen.program.hideCursor();
    self.screen.grabKeys = false;

    if (!focused) {
      self.screen.restoreFocus();
    }

    return err
      ? callback(err)
      : callback(null, value);
  };

  this.__listener = this._listener.bind(this);
  this.on('keypress', this.__listener);
};

Textbox.prototype._listener = function(ch, key) {
  var callback = this._callback
    , value = this.value;

  if (key.name === 'escape' || key.name === 'enter') {
    delete this._callback;
    this.value = '';
    this.removeListener('keypress', this.__listener);
    delete this.__listener;
    callback(null, key.name === 'enter' ? value : null);
  } else if (key.name === 'backspace') {
    if (this.value.length) {
      this.value = this.value.slice(0, -1);
      if (this.secret) return;
      if (this.value.length < this.width - (this.border ? 2 : 0) - this.padding * 2 - 1) {
        this.screen.program.cub();
      }
    }
  } else {
    if (ch) {
      // Tabs only work with textareas.
      if (ch === '\t') ch = ' ';
      this.value += ch;
      if (this.secret) return;
      if (this.value.length < this.width - (this.border ? 2 : 0) - this.padding * 2) {
        this.screen.program.cuf();
      }
    }
  }

  // Maybe just use this instead of render hook:
  // Problem - user can't set .value willy nilly.
  // if (this.value !== value) {
  //   this.setContent(this.value.slice(-(this.width - (this.border ? 2 : 0) - this.padding * 2 - 1)));
  // }

  this.screen.render();
};

Textbox.prototype.clearInput = function() {
  this.value = '';
  this.setContent('');
};

Textbox.prototype.submit = function() {
  return this._listener(null, { name: 'enter' });
};

Textbox.prototype.cancel = function() {
  return this._listener('\x1b', { name: 'escape' });
};

Textbox.prototype._render = Input.prototype.render;
Textbox.prototype.render = function(stop) {
  // setContent is necessary to clear the area in case
  // .shrink is being used and the new content is smaller.
  // Could technically optimize this.
  if (this.secret) {
    this.setContent('');
    return this._render(stop);
  }
  if (this.censor) {
    this.setContent(Array(this.value.length + 1).join('*'));
    return this._render(stop);
  }
  this.setContent(this.value.slice(-(this.width - (this.border ? 2 : 0) - this.padding * 2 - 1)));
  return this._render(stop);
};

Textbox.prototype.editor =
Textbox.prototype.readEditor =
Textbox.prototype.setEditor = function(callback) {
  var self = this;
  return this.screen.readEditor({ value: this.value }, function(err, value) {
    if (err) return callback(err);
    value = value.replace(/[\r\n]/g, '');
    self.value = value;
    return self.readInput(callback);
  });
};

/**
 * Textarea
 */

function Textarea(options) {
  if (!(this instanceof Textarea)) {
    return new Textarea(options);
  }

  ScrollableText.call(this, options);

  this.screen._listenKeys(this);

  this.value = options.value || '';

  this.__updateCursor = this.updateCursor.bind(this);
  this.on('resize', this.__updateCursor);
  this.on('move', this.__updateCursor);
}

Textarea.prototype.__proto__ = ScrollableText.prototype;

Textarea.prototype.type = 'textarea';

Textarea.prototype.updateCursor = function() {
  if (this.screen.focused !== this) {
    return;
  }

  var last = this._clines[this._clines.length-1]
    , program = this.screen.program
    , line
    , cx
    , cy;

  // Stop a situation where the textarea begins scrolling
  // and the last cline appears to always be empty from the
  // _typeScroll `+ '\n'` thing.
  // Maybe not necessary anymore?
  if (last === '' && this.value[this.value.length-1] !== '\n') {
    last = this._clines[this._clines.length-2] || '';
  }

  line = Math.min(
    this._clines.length - 1 - this.childBase,
    this.height - (this.border ? 2 : 0) - this.padding * 2 - 1);

  cy = this.top + (this.border ? 1 : 0) + this.padding + line;
  cx = this.left + (this.border ? 1 : 0) + this.padding + last.length;

  if (cy === program.y && cx === program.x) {
    return;
  }

  if (cy === program.y) {
    if (cx > program.x) {
      program.cuf(cx - program.x);
    } else if (cx < program.x) {
      program.cub(program.x - cx);
    }
  } else if (cx === program.x) {
    if (cy > program.y) {
      program.cud(cy - program.y);
    } else if (cy < program.y) {
      program.cuu(program.y - cy);
    }
  } else {
    program.cup(cy, cx);
  }
};

Textarea.prototype.input =
Textarea.prototype.readInput =
Textarea.prototype.setInput = function(callback) {
  var self = this
    , focused = this.screen.focused === this;

  if (!focused) {
    this.screen.saveFocus();
    this.focus();
  }

  this.screen.grabKeys = true;

  this.updateCursor();
  this.screen.program.showCursor();
  this.screen.program.sgr('normal');

  this._callback = function(err, value) {
    self.screen.program.hideCursor();
    self.screen.grabKeys = false;

    if (!focused) {
      self.screen.restoreFocus();
    }

    return err
      ? callback(err)
      : callback(null, value);
  };

  this.__listener = this._listener.bind(this);
  this.on('keypress', this.__listener);
};

Textarea.prototype._listener = function(ch, key) {
  var callback = this._callback
    , value = this.value;

  if (key.name === 'enter') {
    ch = '\n';
  }

  // TODO: Handle directional keys.
  if (key.name === 'left' || key.name === 'right'
      || key.name === 'up' || key.name === 'down') {
    ;
  }

  if (key.name === 'escape') {
    delete this._callback;
    this.removeListener('keypress', this.__listener);
    delete this.__listener;
    callback(null, key.name === 'enter' ? value : null);
  } else if (key.name === 'backspace') {
    if (this.value.length) {
      this.value = this.value.slice(0, -1);
    }
  } else {
    if (ch) {
      this.value += ch;
    }
  }

  if (this.value !== value) {
    this.setContent(this.value);
    this._typeScroll();
    this.updateCursor();
    this.screen.render();
  }
};

Textarea.prototype._typeScroll = function() {
  // XXX Workaround
  if (this._clines.length - this.childBase > this.height - (this.border ? 2 : 0) - this.padding * 2) {
    //this.setContent(this.value + '\n');
    this.scroll(this._clines.length);
  }
};

Textarea.prototype.clearInput = function() {
  this.value = '';
  this.setContent('');
};

Textarea.prototype.submit = function() {
  return this._listener('\x1b', { name: 'escape' });
};

Textarea.prototype.cancel = function() {
  return this._listener('\x1b', { name: 'escape' });
};

Textarea.prototype.editor =
Textarea.prototype.readEditor =
Textarea.prototype.setEditor = function(callback) {
  var self = this;
  return this.screen.readEditor({ value: this.value }, function(err, value) {
    if (err) return callback(err);
    self.value = value;
    self.setContent(self.value);
    self._typeScroll();
    self.updateCursor();
    self.screen.render();
    return self.readInput(callback);
  });
};

/**
 * Button
 */

function Button(options) {
  var self = this;

  if (!(this instanceof Button)) {
    return new Button(options);
  }

  Input.call(this, options);

  this.on('keypress', function(ch, key) {
    if (key.name === 'enter' || key.name === 'space') {
      self.press();
    }
  });

  if (this.options.defaultEffects) {
    this.on('mouseover', function() {
      self.inverse = !self.options.inverse;
      self.screen.render();
    });

    this.on('mouseout', function() {
      self.inverse = self.options.inverse;
      self.screen.render();
    });
  }

  if (this.options.mouse) {
    this.on('click', function() {
      self.press();
    });
  }
}

Button.prototype.__proto__ = Input.prototype;

Button.prototype.type = 'button';

Button.prototype.press = function() {
  var self = this;
  this.emit('press');
  if (this.border && this.options.defaultEffects) {
    var color = this.border.fg;
    this.border.fg = 'green';
    this.screen.render();
    setTimeout(function() {
      self.border.fg = color;
      self.screen.render();
    }, 300);
  }
};

/**
 * ProgressBar
 */

function ProgressBar(options) {
  if (!(this instanceof ProgressBar)) {
    return new ProgressBar(options);
  }
  Input.call(this, options);
  this.filled = options.filled || 0;
  if (typeof this.filled === 'string') {
    this.filled = +this.filled.slice(0, -1);
  }
  this.ch = options.ch || ' ';
  this.barFg = cens(options.barFg);
  this.barBg = cens(options.barBg);
  this.orientation = options.orientation || 'horizontal';
}

ProgressBar.prototype.__proto__ = Input.prototype;

ProgressBar.prototype.type = 'progress-bar';

ProgressBar.prototype._render = ProgressBar.prototype.render;
ProgressBar.prototype.render = function(stop) {
  // NOTE: Maybe move this `hidden` check down below `stop` check and return `ret`.
  if (this.hidden) return;

  var ret = this._render(stop);

  if (stop) return ret;

  var xi = ret.xi
    , xl = ret.xl
    , yi = ret.yi
    , yl = ret.yl
    , dattr;

  if (this.border) xi++, yi++, xl--, yl--;

  if (this.orientation === 'horizontal') {
    xl = xi + ((xl - xi) * (this.filled / 100)) | 0;
  } else if (this.orientation === 'vertical') {
    yi = yi + ((yl - yi) - (((yl - yi) * (this.filled / 100)) | 0));
  }

  dattr = sattr(this, this.barFg, this.barBg);

  this.screen.fillRegion(dattr, this.ch, xi, xl, yi, yl);

  return ret;
};

ProgressBar.prototype.progress = function(filled) {
  this.filled += filled;
  if (this.filled < 0) this.filled = 0;
  else if (this.filled > 100) this.filled = 100;
  if (this.filled === 100) {
    this.emit('complete');
  }
};

ProgressBar.prototype.reset = function() {
  this.emit('reset');
  this.filled = 0;
};

/**
 * FileManager
 */

function FileManager(options) {
  if (!(this instanceof FileManager)) {
    return new FileManager(options);
  }

  var self = this;

  options.parseTags = true;

  List.call(this, options);

  this.cwd = options.cwd || process.cwd();

  this.on('select', function(item) {
    var value = item.content.replace(/\{[^{}]+\}/g, '').replace(/@$/, '')
      , file = path.resolve(self.cwd, value);

    return fs.stat(file, function(err, stat) {
      if (err) {
        return self.emit('error', err, file);
      }
      if (stat.isDirectory()) {
        self.emit('cd', file, self.cwd);
        self.cwd = file;
        self.refresh();
      } else {
        self.emit('file', file);
      }
    });
  });
}

FileManager.prototype.__proto__ = List.prototype;

FileManager.prototype.type = 'file-manager';

FileManager.prototype.refresh = function(cwd, callback) {
  if (!callback) {
    callback = cwd;
    cwd = null;
  }

  var self = this
    , cwd = cwd || this.cwd;

  return fs.readdir(cwd, function(err, list) {
    if (err && err.code === 'ENOENT') {
      self.cwd = cwd !== process.env.HOME
        ? process.env.HOME
        : '/';
      return self.refresh(callback);
    }

    if (err) {
      if (callback) return callback(err);
      return self.emit('error', err, cwd);
    }

    var dirs = []
      , files = [];

    list.unshift('..');

    list.forEach(function(name) {
      var f = path.resolve(cwd, name)
        , stat;

      try {
        stat = fs.lstatSync(f);
      } catch (e) {
        ;
      }

      if ((stat && stat.isDirectory()) || name === '..') {
        dirs.push({
          name: name,
          text: '{light-blue-fg}' + name + '{/light-blue-fg}/',
          dir: true
        });
      } else if (stat && stat.isSymbolicLink()) {
        files.push({
          name: name,
          text: '{light-cyan-fg}' + name + '{/light-cyan-fg}@',
          dir: false
        });
      } else {
        files.push({
          name: name,
          text: name,
          dir: false
        });
      }
    });

    dirs = asort(dirs);
    files = asort(files);

    list = dirs.concat(files).map(function(data) {
      return data.text;
    });

    self.setItems(list);
    self.select(0);
    self.screen.render();

    if (callback) callback();
  });
};

FileManager.prototype.pick = function(cwd, callback) {
  if (!callback) {
    callback = cwd;
    cwd = null;
  }

  var self = this
    , focused = this.screen.focused === this
    , hidden = this.hidden
    , onfile
    , oncancel;

  function resume() {
    self.removeListener('file', onfile);
    self.removeListener('cancel', oncancel);
    if (hidden) {
      self.hide();
    }
    if (!focused) {
      self.screen.restoreFocus();
    }
    self.screen.render();
  }

  this.on('file', onfile = function(file) {
    resume();
    return callback(null, file);
  });

  this.on('cancel', oncancel = function() {
    resume();
    return callback();
  });

  this.refresh(cwd, function(err) {
    if (err) return callback(err);

    if (hidden) {
      self.show();
    }

    if (!focused) {
      self.screen.saveFocus();
      self.focus();
    }

    self.screen.render();
  });
};

FileManager.prototype.reset = function(cwd, callback) {
  if (!callback) {
    callback = cwd;
    cwd = null;
  }
  this.cwd = cwd || this.options.cwd;
  this.refresh(callback);
};

/**
 * Checkbox
 */

function Checkbox(options) {
  var self = this;

  if (!(this instanceof Checkbox)) {
    return new Checkbox(options);
  }

  Input.call(this, options);

  this.value = options.value || '';
  this.checked = options.checked || false;

  this.on('keypress', function(ch, key) {
    if (key.name === 'enter' || key.name === 'space') {
      self.check();
    }
  });

  if (this.options.mouse) {
    this.on('click', function() {
      self.check();
    });
  }

  this.on('focus', function() {
    self.program.saveCursor();
    self.program.cup(this.top, this.left + 1);
    self.program.showCursor();
  });

  this.on('blur', function() {
    self.program.hideCursor();
    self.program.restoreCursor();
  });
}

Checkbox.prototype.__proto__ = Input.prototype;

Checkbox.prototype.type = 'checkbox';

Checkbox.prototype._render = Checkbox.prototype.render;
Checkbox.prototype.render = function(stop) {
  this.setContent('[' + (this.checked ? 'x' : ' ') + '] ' + this.value);
  return this._render(stop);
};

Checkbox.prototype.check = function() {
  if (this.checked) return;
  this.checked = true;
  this.emit('check');
};

Checkbox.prototype.uncheck = function() {
  if (!this.checked) return;
  this.checked = false;
  this.emit('uncheck');
};

Checkbox.prototype.toggle = function() {
  return this.checked
    ? this.uncheck()
    : this.check();
};

Checkbox.prototype.setChecked = function(val) {
  val = !!val;
  if (this.checked === val) return;
  this.checked = val;
  this.emit('check', val);
};

/**
 * RadioButton
 */

function RadioButton(options) {
  var self = this;

  if (!(this instanceof RadioButton)) {
    return new RadioButton(options);
  }

  Checkbox.call(this, options);

  self.group = options.group || [];

  this.on('check', function() {
    self.group.forEach(function(el) {
      if (el === self) return;
      el.uncheck();
    });
  });
}

RadioButton.prototype.__proto__ = Checkbox.prototype;

RadioButton.prototype.type = 'radio-button';

/**
 * Prompt
 */

function Prompt(options) {
  var self = this;

  if (!(this instanceof Prompt)) {
    return new Prompt(options);
  }

  Box.call(this, options);

  this._.input = new Textbox({
    parent: this,
    top: 3,
    height: 1,
    left: 2,
    right: 2,
    bg: 'black'
  });

  this._.okay = new Button({
    parent: this,
    top: 5,
    height: 1,
    left: 2,
    width: 6,
    content: 'Okay',
    align: 'center',
    bg: 'black',
    hoverBg: 'blue',
    autoFocus: false,
    mouse: true
  });

  this._.cancel = new Button({
    parent: this,
    top: 5,
    height: 1,
    shrink: true,
    left: 10,
    width: 8,
    content: 'Cancel',
    align: 'center',
    bg: 'black',
    hoverBg: 'blue',
    autoFocus: false,
    mouse: true
  });
}

Prompt.prototype.__proto__ = Box.prototype;

Prompt.prototype.type = 'prompt';

Prompt.prototype.type = function(text, value, callback) {
  var self = this;
  var okay, cancel;

  if (!callback) {
    callback = value;
    value = '';
  }

  this.show();
  this.setContent(' ' + text);

  if (value) this._.input.value = value;

  this.screen.saveFocus();

  this._.okay.on('press', okay = function() {
    self._.input.submit();
  });

  this._.cancel.on('press', cancel = function() {
    self._.input.cancel();
  });

  this._.input.readInput(function(err, data) {
    self.hide();
    self.screen.restoreFocus();
    self._.okay.removeListener('press', okay);
    self._.cancel.removeListener('press', cancel);
    return callback(err, data);
  });

  this.screen.render();
};

/**
 * Question
 */

function Question(options) {
  var self = this;

  if (!(this instanceof Question)) {
    return new Question(options);
  }

  Box.call(this, options);

  this._.okay = new Button({
    parent: this,
    top: 3,
    height: 1,
    left: 2,
    width: 6,
    content: 'Okay',
    align: 'center',
    bg: 'black',
    hoverBg: 'blue',
    autoFocus: false,
    mouse: true
  });

  this._.cancel = new Button({
    parent: this,
    top: 3,
    height: 1,
    shrink: true,
    left: 10,
    width: 8,
    content: 'Cancel',
    align: 'center',
    bg: 'black',
    hoverBg: 'blue',
    autoFocus: false,
    mouse: true
  });
}

Question.prototype.__proto__ = Box.prototype;

Question.prototype.type = 'question';

Question.prototype.ask = function(text, callback) {
  var self = this;
  var press, okay, cancel;

  this.show();
  this.setContent(' ' + text);

  this.screen.on('keypress', press = function(ch, key) {
    if (key.name === 'mouse') return;
    if (key.name !== 'enter'
        && key.name !== 'escape'
        && key.name !== 'q'
        && key.name !== 'y'
        && key.name !== 'n') {
      return;
    }
    done(null, key.name === 'enter' || key.name === 'y');
  });

  this._.okay.on('press', okay = function() {
    done(null, true);
  });

  this._.cancel.on('press', cancel = function() {
    done(null, false);
  });

  this.screen.saveFocus();
  this.focus();

  function done(err, data) {
    self.hide();
    self.screen.restoreFocus();
    self.screen.removeListener('keypress', press);
    self._.okay.removeListener('press', okay);
    self._.cancel.removeListener('press', cancel);
    return callback(err, data);
  }

  this.screen.render();
};

/**
 * Message / Error
 */

function Message(options) {
  var self = this;

  if (!(this instanceof Message)) {
    return new Message(options);
  }

  options.tags = true;

  Box.call(this, options);
}

Message.prototype.__proto__ = Box.prototype;

Message.prototype.type = 'message';

Message.prototype.log =
Message.prototype.display = function(text, time, callback) {
  var self = this;
  if (typeof time === 'function') {
    callback = time;
    time = null;
  }
  time = time || 3;
  this.show();
  this.setContent(text);
  this.screen.render();
  setTimeout(function() {
    self.hide();
    self.screen.render();
    if (callback) callback();
  }, time * 1000);
};

Message.prototype.error = function(text, callback) {
  return this.display('{red-fg}Error: ' + text + '{/red-fg}', callback);
};

/**
 * Info - TODO: Merge display method into Message?
 */

function Info(options) {
  var self = this;

  if (!(this instanceof Info)) {
    return new Info(options);
  }

  Box.call(this, options);
}

Info.prototype.__proto__ = Box.prototype;

Info.prototype.type = 'info';

Info.prototype.display = function(text, callback) {
  this.show();

  this.setContent(text);

  this.screen.render();

  function end() {
    if (end.done) return;
    end.done = true;
    self.hide();
    self.screen.render();
    if (callback) callback();
  }

  return setTimeout(function() {
    self.screen.on('keypress', function fn(ch, key) {
      if (key.name === 'mouse') return;
      self.screen.removeListener('keypress', fn);
      end();
    });
    if (!self.options.mouse) return;
    self.screen.on('mouse', function fn(data) {
      if (data.action === 'mousemove') return;
      self.screen.removeListener('mouse', fn);
      end();
    });
  }, 10);
};

/**
 * Loading
 */

function Loading(options) {
  var self = this;

  if (!(this instanceof Loading)) {
    return new Loading(options);
  }

  Box.call(this, options);

  this._.icon = new Text({
    parent: this,
    align: 'center',
    top: 2,
    left: 1,
    right: 1,
    height: 1,
    content: '|'
  });
}

Loading.prototype.__proto__ = Box.prototype;

Loading.prototype.type = 'loading';

Loading.prototype.load = function(text) {
  var self = this;

  this.show();
  this.setContent(text);

  if (this._.timer) {
    this._.stop();
  }

  this.screen.lockKeys = true;

  this._.timer = setInterval(function() {
    if (self._.icon.content === '|') {
      self._.icon.setContent('/');
    } else if (self._.icon.content === '/') {
      self._.icon.setContent('-');
    } else if (self._.icon.content === '-') {
      self._.icon.setContent('\\');
    } else if (self._.icon.content === '\\') {
      self._.icon.setContent('|');
    }
    self.screen.render();
  }, 200);
};

Loading.prototype.stop = function() {
  this.screen.lockKeys = false;
  this.hide();
  if (this._.timer) {
    clearInterval(this._.timer);
    delete this._.timer;
  }
  this.screen.render();
};

/**
 * PickList - TODO Merge into List
 */

function PickList(options) {
  var self = this;

  if (!(this instanceof PickList)) {
    return new PickList(options);
  }

  List.call(this, options);
}

PickList.prototype.__proto__ = List.prototype;

PickList.prototype.type = 'popup-menu';

PickList.prototype.pick = function(callback) {
  this.screen.saveFocus();
  this.focus();
  this.show();
  this.screen.render();
  this.once('action', function(el, selected) {
    self.screen.restoreFocus();
    self.hide();
    self.screen.render();
    if (!el) return callback();
    return callback(null, selected);
  });
};

/**
 * Listbar / HorizontalList
 */

function Listbar(options) {
  var self = this;

  if (!(this instanceof Listbar)) {
    return new Listbar(options);
  }

  this.items = [];

  Box.call(this, options);
}

Listbar.prototype.__proto__ = Box.prototype;

Listbar.prototype.type = 'menubar';

Listbar.prototype.setOptions =
Listbar.prototype.setCommands =
Listbar.prototype.setItems = function(commands) {
  this.children.forEach(function(el) {
    el.detach();
  });

  var self = this
    , drawn = 0;

  this.commands = commands;

  Object.keys(commands).forEach(function(name) {
    var cmd = commands[name]
      , title
      , len
      , button;

    title = '{light-black-fg}'
      + cmd.prefix
      + '{/light-black-fg}'
      + ':'
      + name;

    len = (cmd.prefix + ':' + name).length;

    button = new Button({
      parent: self,
      top: 0,
      left: drawn + 1,
      height: 1,
      content: title,
      width: len + 2,
      align: 'center',
      tags: true,
      autoFocus: false,
      hoverEffects: {
        bg: 'blue'
      },
      focusEffects: {
        bg: 'blue'
      },
      mouse: true
    });

    self._[name] = button;
    cmd.element = button;
    self.items.push(button);

    if (cmd.callback) {
      button.on('press', cmd.callback);
      if (cmd.keys) {
        screen.key(cmd.keys[0], cmd.callback);
      }
    }

    drawn += len + 3;
  });
};

/**
 * DirManager - Merge into FileManager?
 */

function DirManager(options) {
  var self = this;

  if (!(this instanceof DirManager)) {
    return new DirManager(options);
  }

  FileManager.call(this, options);

  this.on('cd', function(dir) {
    if (dir === self.cwd) return;
    self.emit('file', dir);
  });
}

DirManager.prototype.__proto__ = FileManager.prototype;

DirManager.prototype.type = 'dir-manager';

/**
 * Passbox - Useless
 */

function Passbox(options) {
  var self = this;

  if (!(this instanceof Passbox)) {
    return new Passbox(options);
  }

  options.censor = true;

  Textbox.call(this, options);
}

Passbox.prototype.__proto__ = Textbox.prototype;

Passbox.prototype.type = 'passbox';

/**
 * Helpers
 */

function sp(line, width, align) {
  if (!align) return line;

  var len = line.replace(/\x1b\[[\d;]*m/g, '').length
    , s = width - len;

  if (len === 0) return line;
  if (s < 0) return line;

  if (align === 'center') {
    s = Array(((s / 2) | 0) + 1).join(' ');
    return s + line + s;
  } else if (align === 'right') {
    s = Array(s + 1).join(' ');
    return s + line;
  }

  return line;
}

// TODO: Add text padding.
// TODO: Fix a bug where, in a box with a width of 3, `jjj` is:
// |jjj|
// But `jjjj` is:
// |jj |
// |jj |
// A possibly related bug:
// For some reason (see jitsu-ui):
// {red-fg}my-app2{/red-fg} gets wrapped to:
// {red-fg}my-app\n2{/red-fg} when my-app2
// does not. Since escape codes are not printable
// characters, this means wrapContent is doing
// something wrong and determining length including
// at least 1 char from the escape code.
function wrapContent(content, width, tags, state, margin) {
  var lines = content.split('\n')
    , out = [];

  if (!content) {
    out.push(content || '');
    return out;
  }

  // Useful for textareas.
  if (margin && width > 1) width--;

  lines.forEach(function(line) {
    var align = state
      , cap;

    if (tags) {
      //if (cap = /^(\x1b\[[\d;]*m)*^{(left|center|right)}/.exec(line)) {
      //  line = (cap[1] || '') + line.substring(cap[0].length);
      //  align = state = cap[2] !== 'left'
      //    ? cap[2]
      //    : null;
      //}

      //if (cap = /{\/(left|center|right)}(\x1b\[[\d;]*m)*$/.exec(line)) {
      //  line = line.slice(0, -cap[0].length) + (cap[2] || '');
      //  state = null;
      //}

      if (cap = /^{(left|center|right)}/.exec(line)) {
        line = line.substring(cap[0].length);
        align = state = cap[1] !== 'left'
          ? cap[1]
          : null;
      }

      if (cap = /{\/(left|center|right)}$/.exec(line)) {
        line = line.slice(0, -cap[0].length);
        state = null;
      }
    }

    var total
      , i
      , part
      , esc;

    while (line.length > width) {
      for (i = 0, total = 0; i < line.length; i++) {
        while (line[i] === '\x1b') {
          while (line[i] && line[i++] !== 'm');
        }
        if (!line[i]) break;
        if (++total === width) {
          // Try to find a space to break on:
          if (line[i] !== ' ') {
            var j = i;
            while (j > i - 10 && j > 0 && line[j] !== ' ') j--;
            if (line[j] === ' ') i = j + 1;
            else i++;
          } else {
            i++;
          }
          break;
        }
      }

      // XXX This shouldn't be required, but is.
      i++;

      part = line.substring(0, i - 1);
      esc = /\x1b[\[\d;]*$/.exec(part);

      if (esc) {
        part = part.slice(0, -esc[0].length);
        line = line.substring(i - 1 - esc[0].length);
        out.push(sp(part, width, align));
      } else {
        line = line.substring(i - 1);
        out.push(sp(part, width, align));
      }

      // Make sure we didn't wrap the line to the very end, otherwise
      // we get a pointless empty line after a newline.
      if (line === '') return;
    }

    // If only an escape code got cut off, at it to `part`.
    if (/^(?:\x1b[\[\d;]*m)+$/.test(line)) {
      out[out.length-1] += line;
      return;
    }

    out.push(sp(line, width, align));
  });

  return out;
}

function asort(obj) {
  return obj.sort(function(a, b) {
    a = a.name.toLowerCase();
    b = b.name.toLowerCase();

    if (a[0] === '.' && b[0] === '.') {
      a = a[1];
      b = b[1];
    } else {
      a = a[0];
      b = b[0];
    }

    return a > b ? 1 : (a < b ? -1 : 0);
  });
}

function hsort(obj) {
  return obj.sort(function(a, b) {
    return b.index - a.index;
  });
}

function sattr(obj, fg, bg) {
  var bold = obj.bold
    , underline = obj.underline
    , blink = obj.blink
    , inverse = obj.inverse
    , invisible = obj.invisible;

  // This used to be a loop, but I decided
  // to unroll it for performance's sake.
  if (typeof bold === 'function') bold = bold();
  if (typeof underline === 'function') underline = underline();
  if (typeof blink === 'function') blink = blink();
  if (typeof inverse === 'function') inverse = inverse();
  if (typeof invisible === 'function') invisible = invisible();

  if (typeof fg === 'function') fg = fg();
  if (typeof bg === 'function') bg = bg();

  return ((((invisible ? 16 : 0) << 18)
    | ((inverse ? 8 : 0) << 18)
    | ((blink ? 4 : 0) << 18)
    | ((underline ? 2 : 0) << 18))
    | ((bold ? 1 : 0) << 18)
    | (colors.convert(fg) << 9))
    | colors.convert(bg);
}

function cens(color) {
  return color != null
    ? color
    : -1;
}

/**
 * Expose
 */

exports.colors = colors;

exports.Screen = exports.screen = Screen;
exports.Box = exports.box = Box;
exports.Text = exports.text = Text;
exports.Line = exports.line = Line;
exports.ScrollableBox = exports.scrollablebox = ScrollableBox;
exports.List = exports.list = List;
exports.ScrollableText = exports.scrollabletext = ScrollableText;
exports.Input = exports.input = Input;
exports.Textbox = exports.textbox = Textbox;
exports.Textarea = exports.textarea = Textarea;
exports.Button = exports.button = Button;
exports.ProgressBar = exports.progressbar = ProgressBar;
exports.FileManager = exports.filemanager = FileManager;

exports.Checkbox = exports.checkbox = Checkbox;
exports.RadioButton = exports.radiobutton = RadioButton;
exports.Prompt = exports.prompt = Prompt;
exports.Question = exports.question = Question;
exports.Message = exports.message = Message;
exports.Info = exports.info = Info;
exports.Loading = exports.loading = Loading;
exports.PickList = exports.picklist = PickList;
exports.Listbar = exports.listbar = Listbar;
exports.DirManager = exports.dirmanager = DirManager;
exports.Passbox = exports.passbox = Passbox;
