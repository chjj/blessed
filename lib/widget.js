/**
 * widget.js - high-level interface for blessed
 * Copyright (c) 2013, Christopher Jeffrey (MIT License)
 * https://github.com/chjj/blessed
 * Still under heavy development.
 */

/**
 * Modules
 */

var EventEmitter = require('events').EventEmitter
  , assert = require('assert')
  , path = require('path')
  , fs = require('fs')
  , colors = require('./colors')
  , widget = exports;

/**
 * Node
 */

function Node(options) {
  if (!(this instanceof Node)) {
    return new Node(options);
  }

  EventEmitter.call(this);

  options = options || {};
  this.options = options;
  this.screen = this.screen
    || options.screen
    || Screen.global
    || (function(){throw new Error('No active screen.')})();
  this.parent = options.parent || null;
  this.children = [];
  this.$ = this._ = this.data = {};
  this.uid = Node.uid++;
  this.index = -1;

  if (this.type !== 'screen') {
    this.detached = true;
  }

  if (this.parent) {
    this.parent.append(this);
  }

  (options.children || []).forEach(this.append.bind(this));
}

Node.uid = 0;

Node.prototype.__proto__ = EventEmitter.prototype;

Node.prototype.type = 'node';

Node.prototype.insert = function(element, i) {
  var self = this;

  element.detach();
  element.parent = this;

  if (i === 0) {
    this.children.unshift(element);
  } else if (i === this.children.length) {
    this.children.push(element);
  } else {
    this.children.splice(i, 0, element);
  }

  element.emit('reparent', this);
  this.emit('adopt', element);

  (function emit(el) {
    var n = el.detached !== self.detached;
    el.detached = self.detached;
    if (n) el.emit('attach');
    el.children.forEach(emit);
  })(element);

  if (!this.screen.focused) {
    this.screen.focused = element;
  }
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
  if (element.parent !== this) return;

  var i = this.children.indexOf(element);
  if (!~i) return;

  if (this.type !== 'screen') {
    this.clearPos();
  }

  element.parent = null;

  this.children.splice(i, 1);

  if (this.type !== 'screen') {
    i = this.screen.clickable.indexOf(element);
    if (~i) this.screen.clickable.splice(i, 1);
    i = this.screen.keyable.indexOf(element);
    if (~i) this.screen.keyable.splice(i, 1);
  }

  element.emit('reparent', null);
  this.emit('remove', element);

  (function emit(el) {
    var n = el.detached !== true;
    el.detached = true;
    if (n) el.emit('detach');
    el.children.forEach(emit);
  })(element);

  if (this.screen.focused === element) {
    this.screen.rewindFocus();
  }
};

Node.prototype.detach = function() {
  if (this.parent) this.parent.remove(this);
};

Node.prototype.forDescendants = function(iter, s) {
  if (s) iter(this);
  this.children.forEach(function emit(el) {
    iter(el);
    el.children.forEach(emit);
  });
};

Node.prototype.forAncestors = function(iter, s) {
  var el = this;
  if (s) iter(this);
  while (el = el.parent) {
    iter(el);
    el.emit.apply(el, args);
  }
};

Node.prototype.collectDescendants = function(s) {
  var out = [];
  this.forDescendants(function(el) {
    out.push(el);
  }, s);
  return out;
};

Node.prototype.collectAncestors = function(s) {
  var out = [];
  this.forAncestors(function(el) {
    out.push(el);
  }, s);
  return out;
};

Node.prototype.emitDescendants = function() {
  var args = Array.prototype.slice(arguments)
    , iter;

  if (typeof args[args.length-1] === 'function') {
    iter = args.pop();
  }

  return this.forDescendants(function(el) {
    if (iter) iter(el);
    el.emit.apply(el, args);
  }, true);
};

Node.prototype.emitAncestors = function() {
  var args = Array.prototype.slice(arguments)
    , iter;

  if (typeof args[args.length-1] === 'function') {
    iter = args.pop();
  }

  return this.forAncestors(function(el) {
    if (iter) iter(el);
    el.emit.apply(el, args);
  }, true);
};

Node.prototype.hasDescendant = function(target) {
  // return this.collectDescendants().indexOf(target) !== -1;
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
  // return this.collectAncestors().indexOf(target) !== -1;
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

  if (!(this instanceof Node)) {
    return new Screen(options);
  }

  options = options || {};
  if (options.rsety && options.listen) {
    options = { program: options };
  }

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
  this.output = this.program.output;

  this.tabc = Array((options.tabSize || 4) + 1).join(' ');
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
  this.keyable = [];
  this.grabKeys = false;
  this.lockKeys = false;
  this.focused;
  this._buf = '';

  this._ci = -1;

  function resize() {
    self.alloc();
    self.render();
    (function emit(el) {
      el.emit('resize');
      el.children.forEach(emit);
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
    if (err) console.error(err.stack ? err.stack + '' : err + '');
    return process.exit(1);
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
    el.clickable = true;
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

      // Need to use _getCoords() over lpos for when the
      // element is obfuscated by a scrollable parent.
      ret = el._getCoords();
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

  if (el && !~this.keyable.indexOf(el)) {
    el.keyable = true;
    // Listen for click, but do not enable
    // mouse if it's not enabled yet.
    if (el.options.autoFocus !== false) {
      var lm = this._listenedMouse;
      this._listenedMouse = true;
      el.on('click', el.focus.bind(el));
      this._listenedMouse = lm;
    }
    this.keyable.push(el);
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

    if (~self.keyable.indexOf(focused)) {
      focused.emit('keypress', ch, key);
      focused.emit('key ' + key.full, ch, key);
      self.emit('element keypress', focused, ch, key);
      self.emit('element key ' + key.full, focused, ch, key);
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
  // if (y === top) return this.insertLineNC(n, y, top, bottom);

  if (!this.tput
      || !this.tput.strings.change_scroll_region
      || !this.tput.strings.delete_line
      || !this.tput.strings.insert_line) return;

  this._buf += this.tput.csr(top, bottom);
  this._buf += this.tput.cup(y, 0);
  this._buf += this.tput.il(n);
  this._buf += this.tput.csr(0, this.height - 1);

  var j = bottom + 1;

  while (n--) {
    this.lines.splice(y, 0, this.blankLine());
    this.lines.splice(j, 1);
    this.olines.splice(y, 0, this.blankLine());
    this.olines.splice(j, 1);
  }
};

Screen.prototype.deleteLine = function(n, y, top, bottom) {
  // if (y === top) return this.deleteLineNC(n, y, top, bottom);

  if (!this.tput
      || !this.tput.strings.change_scroll_region
      || !this.tput.strings.delete_line
      || !this.tput.strings.insert_line) return;

  this._buf += this.tput.csr(top, bottom);
  this._buf += this.tput.cup(y, 0);
  this._buf += this.tput.dl(n);
  this._buf += this.tput.csr(0, this.height - 1);

  var j = bottom + 1;

  while (n--) {
    this.lines.splice(j, 0, this.blankLine());
    this.lines.splice(y, 1);
    this.olines.splice(j, 0, this.blankLine());
    this.olines.splice(y, 1);
  }
};

// This is how ncurses does it.
// Scroll down (up cursor-wise).
// This will only work for top line deletion as opposed to arbitrary lines.
Screen.prototype.insertLineNC = function(n, y, top, bottom) {
  if (!this.tput
      || !this.tput.strings.change_scroll_region
      || !this.tput.strings.delete_line
      || !this.tput.strings.insert_line) return;

  this._buf += this.tput.csr(top, bottom);
  this._buf += this.tput.cup(top, 0);
  this._buf += this.tput.dl(n);
  this._buf += this.tput.csr(0, this.height - 1);

  var j = bottom + 1;

  while (n--) {
    this.lines.splice(j, 0, this.blankLine());
    this.lines.splice(y, 1);
    this.olines.splice(j, 0, this.blankLine());
    this.olines.splice(y, 1);
  }
};

// This is how ncurses does it.
// Scroll up (down cursor-wise).
// This will only work for bottom line deletion as opposed to arbitrary lines.
Screen.prototype.deleteLineNC = function(n, y, top, bottom) {
  if (!this.tput
      || !this.tput.strings.change_scroll_region
      || !this.tput.strings.delete_line
      || !this.tput.strings.insert_line) return;

  this._buf += this.tput.csr(top, bottom);
  this._buf += this.tput.cup(bottom, 0);
  this._buf += Array(n + 1).join('\n');
  this._buf += this.tput.csr(0, this.height - 1);

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
  var pos = el.lpos;

  // If we don't have tput, we can't use CSR anyway.
  // if (!this.tput) {
  //   return false;
  // }

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

  // The scrollbar can't update properly, and there's also a
  // chance that the scrollbar may get moved around senselessly.
  // NOTE: In pratice, this doesn't seem to be the case.
  // if (this.scrollbar) {
  //   return false;
  // }

  // Doesn't matter if we're only a height of 1.
  // if ((pos.yl - el.ibottom) - (pos.yi + el.itop) <= 1) {
  //   return pos._cleanSides = false;
  // }

  var yi = pos.yi + el.itop
    , yl = pos.yl - el.ibottom
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

  var main = '';

  var clr
    , neq
    , xx;

  var lx = -1
    , ly = -1
    , o;

  var acs;

  if (this._buf) {
    main += this._buf;
    this._buf = '';
  }

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

      // Take advantage of xterm's back_color_erase feature by using a
      // lookahead. Stop spitting out so many damn spaces. NOTE: Is checking
      // the bg for non BCE terminals worth the overhead?
      if (this.options.useBCE
          && ch === ' '
          && ((this.tput && this.tput.bools.back_color_erase)
          || (data & 0x1ff) === (this.dattr & 0x1ff))
          && ((data >> 18) & 8) === ((this.dattr >> 18) & 8)) {
        clr = true;
        neq = false;

        for (xx = x; xx < this.cols; xx++) {
          if (line[xx][0] !== data || line[xx][1] !== ' ') {
            clr = false;
            break;
          }
          if (line[xx][0] !== o[xx][0] || line[xx][1] !== o[xx][1]) {
            neq = true;
          }
        }

        if (clr && neq) {
          lx = ly = -1;
          if (data !== attr) {
            out += this.codeAttr(data);
            attr = data;
          }
          out += this.tput
            ? this.tput.cup(y, x)
            : '\x1b[' + (y + 1) + ';' + (x + 1) + 'H';
          out += this.tput
            ? this.tput.el(0)
            : '\x1b[K';
          for (xx = x; xx < this.cols; xx++) {
            o[xx][0] = data;
            o[xx][1] = ' ';
          }
          break;
        }

        // If there's more than 10 spaces, use EL regardless
        // and start over drawing the rest of line. Might
        // not be worth it. Try to use ECH if the terminal
        // supports it. Maybe only try to use ECH here.
        // //if (this.tput && this.tput.strings.erase_chars)
        // if (!clr && neq && (xx - x) > 10) {
        //   lx = ly = -1;
        //   if (data !== attr) {
        //     out += this.codeAttr(data);
        //     attr = data;
        //   }
        //   out += this.tput
        //     ? this.tput.cup(y, x)
        //     : '\x1b[' + (y + 1) + ';' + (x + 1) + 'H';
        //   if (this.tput && this.tput.strings.erase_chars) {
        //     // Use erase_chars to avoid erasing the whole line.
        //     out += this.tput
        //       ? this.tput.ech(xx - x)
        //       : '\x1b[' + (xx - x) + 'X';
        //   } else {
        //     out += this.tput
        //       ? this.tput.el(0)
        //       : '\x1b[K';
        //   }
        //   out += this.tput
        //     ? this.tput.cuf(xx - x)
        //     : '\x1b[' + (xx - x) + 'C';
        //   this.fillRegion(data, ' ',
        //     x, this.tput && this.tput.strings.erase_chars ? xx : this.cols,
        //     y, y + 1);
        //   x = xx - 1;
        //   continue;
        // }

        // Skip to the next line if the
        // rest of the line is already drawn.
        // if (!neq) {
        //   for (; xx < this.cols; xx++) {
        //     if (line[xx][0] !== o[xx][0] || line[xx][1] !== o[xx][1]) {
        //       neq = true;
        //       break;
        //     }
        //   }
        //   if (!neq) {
        //     attr = data;
        //     break;
        //   }
        // }
      }

      // Optimize by comparing the real output
      // buffer to the pending output buffer.
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
      // This is not ideal, but it's how ncurses works.
      // There are a lot of terminals that support ACS
      // *and UTF8, but do not declare U8. So ACS ends
      // up being used (slower than utf8). Terminals
      // that do not support ACS and do not explicitly
      // support UTF8 get ugly their unicode characters
      // replaced with really ugly ascii characters.
      // It is possible there is a terminal out there
      // somewhere that does not support ACS, but
      // supports UTF8, but I imagine it's unlikely.
      // Maybe remove !this.tput.unicode check, however,
      // this seems to be the way ncurses does it.
      if (this.tput) {
        if (this.tput.strings.enter_alt_charset_mode) {
          if (!this.tput.brokenACS || !this.tput.unicode) {
            if (this.tput.acscr[ch]) {
              if (acs) {
                ch = this.tput.acscr[ch];
              } else {
                ch = this.tput.smacs()
                  + this.tput.acscr[ch]
                acs = true;
              }
            } else if (acs) {
              ch = this.tput.rmacs() + ch;
              acs = false;
            }
          }
        } else {
          // U8 is not consistently correct. Some terminfo's
          // terminals that do not declare it may actually
          // support utf8 (e.g. urxvt), but if the terminal
          // does not declare support for ACS (and U8), chances
          // are it does not support UTF8. This is probably
          // the "safest" way to do this. Should fix things
          // like sun-color.
          // if (this.program.term('sun') && ch > '~') {
          // if (this.tput.numbers.U8 !== 1 && ch > '~') {
          if (this.tput.numbers.U8 !== 1 && this.tput.utoa[ch]) {
            ch = this.tput.utoa[ch] || '?';
          }
        }
      }

      out += ch;
      attr = data;
    }

    if (attr !== this.dattr) {
      out += '\x1b[m';
    }

    if (out) {
      main += this.tput
        ? this.tput.cup(y, 0) + out
        : '\x1b[' + (y + 1) + ';1H' + out;
    }
  }

  if (main) {
    var pre = ''
      , post = '';

    pre += this.tput
      ? this.tput.sc()
      : '\x1b7';
    post += this.tput
      ? this.tput.rc()
      : '\x1b8';

    if (!this.program.cursorHidden) {
      pre += this.tput
        ? this.tput.civis()
        : '\x1b[?25l';
      post += this.tput
        ? this.tput.cnorm()
        : '\x1b[?25h';
    }

    this.output.write(pre + main + post);
  }
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
Screen.prototype.attrCode = function(code, cur, def) {
  var flags = (cur >> 18) & 0x1ff
    , fg = (cur >> 9) & 0x1ff
    , bg = cur & 0x1ff
    , c
    , i;

  code = code.slice(2, -1).split(';');
  if (!code[0]) code[0] = '0';

  for (i = 0; i < code.length; i++) {
    c = +code[i] || 0;
    switch (c) {
      case 0: // normal
        //bg = 0x1ff;
        //fg = 0x1ff;
        //flags = 0;
        bg = def & 0x1ff;
        fg = (def >> 9) & 0x1ff;
        flags = (def >> 18) & 0x1ff;
        break;
      case 1: // bold
        flags |= 1;
        break;
      case 22:
        //flags &= ~1;
        flags = (def >> 18) & 0x1ff;
        break;
      case 4: // underline
        flags |= 2;
        break;
      case 24:
        //flags &= ~2;
        flags = (def >> 18) & 0x1ff;
        break;
      case 5: // blink
        flags |= 4;
        break;
      case 25:
        //flags &= ~4;
        flags = (def >> 18) & 0x1ff;
        break;
      case 7: // inverse
        flags |= 8;
        break;
      case 27:
        //flags &= ~8;
        flags = (def >> 18) & 0x1ff;
        break;
      case 8: // invisible
        flags |= 16;
        break;
      case 28:
        //flags &= ~16;
        flags = (def >> 18) & 0x1ff;
        break;
      case 39: // default fg
        //fg = 0x1ff;
        fg = (def >> 9) & 0x1ff;
        break;
      case 49: // default bg
        //bg = 0x1ff;
        bg = def & 0x1ff;
        break;
      case 100: // default fg/bg
        //fg = 0x1ff;
        //bg = 0x1ff;
        fg = (def >> 9) & 0x1ff;
        bg = def & 0x1ff;
        break;
      default: // color
        if (c === 48 && +code[i+1] === 5) {
          i += 2;
          bg = +code[i];
          break;
        } else if (c === 48 && +code[i+1] === 2) {
          i += 2;
          bg = colors.match(+code[i], +code[i+1], +code[i+2]);
          //if (bg === -1) bg = 0x1ff;
          if (bg === -1) bg = def & 0x1ff;
          i += 2;
          break;
        } else if (c === 38 && +code[i+1] === 5) {
          i += 2;
          fg = +code[i];
          break;
        } else if (c === 38 && +code[i+1] === 2) {
          i += 2;
          fg = colors.match(+code[i], +code[i+1], +code[i+2]);
          //if (fg === -1) fg = 0x1ff;
          if (fg === -1) fg = (def >> 9) & 0x1ff;
          i += 2;
          break;
        }
        if (c >= 40 && c <= 47) {
          bg = c - 40;
        } else if (c >= 100 && c <= 107) {
          bg = c - 100;
          bg += 8;
        } else if (c === 49) {
          //bg = 0x1ff;
          bg = def & 0x1ff;
        } else if (c >= 30 && c <= 37) {
          fg = c - 30;
        } else if (c >= 90 && c <= 97) {
          fg = c - 90;
          fg += 8;
        } else if (c === 39) {
          //fg = 0x1ff;
          fg = (def >> 9) & 0x1ff;
        } else if (c === 100) {
          //fg = 0x1ff;
          //bg = 0x1ff;
          fg = (def >> 9) & 0x1ff;
          bg = def & 0x1ff;
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

Screen.prototype.focusOffset = function(offset) {
  var shown = this.keyable.filter(function(el) {
    return el.visible;
  }).length;

  if (!shown || !offset) {
    return;
  }

  var i = this.keyable.indexOf(this.focused);
  if (!~i) return;

  if (offset > 0) {
    while (offset--) {
      if (++i > this.keyable.length - 1) i = 0;
      if (!this.keyable[i].visible) offset++;
    }
  } else {
    offset = -offset;
    while (offset--) {
      if (--i < 0) i = this.keyable.length - 1;
      if (!this.keyable[i].visible) offset++;
    }
  }

  return this.keyable[i].focus();
};

Screen.prototype.focusPrev =
Screen.prototype.focusPrevious = function() {
  return this.focusOffset(-1);
};

Screen.prototype.focusNext = function() {
  return this.focusOffset(1);
};

Screen.prototype.focusPush = function(el) {
  if (!el) return;
  var old = this.history[this.history.length-1];
  if (this.history.length === 10) {
    this.history.shift();
  }
  this.history.push(el);
  el._focus(old);
};

Screen.prototype.focusPop = function() {
  var old = this.history.pop();
  this.history[this.history.length-1]._focus(old);
  return old;
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

Screen.prototype.rewindFocus = function() {
  var old = this.history[this.history.length-1]
    , el;

  while (this.history.length) {
    el = this.history.pop();
    if (!el.detached && !el.visible) {
      this.history.push(el);
      el._focus(old);
      return el;
    }
  }

  if (old) {
    old.emit('blur');
    this.screen.emit('element blur', old);
  }
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

  var screen = this
    , program = screen.program
    , options = options || {}
    , spawn = require('child_process').spawn
    , mouse = program.mouseEnabled
    , ps;

  options.stdio = 'inherit';

  program.lsaveCursor('spawn');
  //program.csr(0, program.rows - 1);
  program.normalBuffer();
  program.showCursor();
  if (mouse) program.disableMouse();

  var write = program.output.write;
  program.output.write = function() {};
  program.input.pause();
  program.input.setRawMode(false);

  var resume = function() {
    if (resume.done) return;
    resume.done = true;

    program.input.setRawMode(true);
    program.input.resume();
    program.output.write = write;

    program.alternateBuffer();
    //program.csr(0, program.rows - 1);
    if (mouse) program.enableMouse();

    screen.alloc();
    screen.render();

    screen.program.lrestoreCursor('spawn', true);
  };

  ps = spawn(file, args, options);

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
    var element = el();
    Object.keys(effects).forEach(function(key) {
      var val = effects[key];
      if (val !== null && typeof val === 'object') {
        tmp[key] = tmp[key] || {};
        Object.keys(val).forEach(function(k) {
          var v = val[k];
          tmp[key][k] = element.style[key][k];
          element.style[key][k] = v;
        });
        return;
      }
      tmp[key] = element.style[key];
      element.style[key] = val;
    });
    element.screen.render();
  });

  fel.on(out, function() {
    var element = el();
    Object.keys(effects).forEach(function(key) {
      var val = effects[key];
      if (val !== null && typeof val === 'object') {
        tmp[key] = tmp[key] || {};
        Object.keys(val).forEach(function(k) {
          if (tmp[key].hasOwnProperty(k)) {
            element.style[key][k] = tmp[key][k];
          }
        });
        return;
      }
      if (tmp.hasOwnProperty(key)) {
        element.style[key] = tmp[key];
      }
    });
    element.screen.render();
  });
};

Screen.prototype.sigtstp = function(callback) {
  var self = this;
  this.program.sigtstp(function() {
    self.alloc();
    self.render();
    self.program.lrestoreCursor('pause', true);
    if (callback) callback();
  });
};

/**
 * Element
 */

function Element(options) {
  var self = this;

  if (!(this instanceof Node)) {
    return new Element(options);
  }

  options = options || {};

  // Workaround to get a `scrollable` option.
  if (options.scrollable && !this._ignore && this.type !== 'scrollable-box') {
    Object.getOwnPropertyNames(ScrollableBox.prototype).forEach(function(key) {
      if (key === 'type') return;
      Object.defineProperty(this, key,
        Object.getOwnPropertyDescriptor(ScrollableBox.prototype, key));
    }, this);
    this._ignore = true;
    ScrollableBox.call(this, options);
    delete this._ignore;
    return this;
  }

  Node.call(this, options);

  this.name = options.name;

  options.position = options.position || {
    left: options.left,
    right: options.right,
    top: options.top,
    bottom: options.bottom,
    width: options.width,
    height: options.height
  };

  if (options.position.width === 'shrink'
      || options.position.height === 'shrink') {
    if (options.position.width === 'shrink') {
      delete options.position.width;
    }
    if (options.position.height === 'shrink') {
      delete options.position.height;
    }
    options.shrink = true;
  }

  this.position = options.position;

  this.style = options.style;

  if (!this.style) {
    this.style = {};
    this.style.fg = options.fg;
    this.style.bg = options.bg;
    this.style.bold = options.bold;
    this.style.underline = options.underline;
    this.style.blink = options.blink;
    this.style.inverse = options.inverse;
    this.style.invisible = options.invisible;
  }

  this.hidden = options.hidden || false;
  this.fixed = options.fixed || false;
  this.align = options.align || 'left';
  this.valign = options.valign || 'top';
  this.wrap = options.wrap !== false;
  this.shrink = options.shrink;
  this.fixed = options.fixed;

  if (typeof options.padding === 'number' || !options.padding) {
    options.padding = {
      left: options.padding,
      top: options.padding,
      right: options.padding,
      bottom: options.padding
    };
  }

  this.padding = {
    left: options.padding.left || 0,
    top: options.padding.top || 0,
    right: options.padding.right || 0,
    bottom: options.padding.bottom || 0
  };

  this.border = options.border;
  if (this.border) {
    this.border.type = this.border.type || 'bg';
    if (this.border.type === 'ascii') this.border.type = 'line';
    this.border.ch = this.border.ch || ' ';
    if (!this.border.style) {
      this.border.style = this.style.border || {};
      this.border.style.fg = this.border.fg;
      this.border.style.bg = this.border.bg;
    }
    this.style.border = this.border.style;
  }

  if (options.clickable) {
    this.screen._listenMouse(this);
  }

  if (options.input || options.keyable) {
    this.screen._listenKeys(this);
  }

  this.parseTags = options.parseTags || options.tags;

  this.setContent(options.content || '', true);

  if (options.label) {
    this.append(new Box({
      screen: this.screen,
      content: options.label,
      left: 2,
      top: this.border ? 0 : -1,
      tags: this.parseTags,
      shrink: true,
      style: this.style.label,
      fixed: true
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

  if (options.hoverBg != null) {
    options.hoverEffects = options.hoverEffects || {};
    options.hoverEffects.bg = options.hoverBg;
  }

  if (this.style.hover) {
    options.hoverEffects = this.style.hover;
    //delete this.style.hover;
  }

  if (this.style.focus) {
    options.focusEffects = this.style.focus;
    //delete this.style.focus;
  }

  // if (options.effects) {
  //   if (options.effects.hover) options.hoverEffects = options.effects.hover;
  //   if (options.effects.focus) options.focusEffects = options.effects.focus;
  // }

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

Element.prototype.sattr = function(obj, fg, bg) {
  var bold = obj.bold
    , underline = obj.underline
    , blink = obj.blink
    , inverse = obj.inverse
    , invisible = obj.invisible;

  // This used to be a loop, but I decided
  // to unroll it for performance's sake.
  if (typeof bold === 'function') bold = bold(this);
  if (typeof underline === 'function') underline = underline(this);
  if (typeof blink === 'function') blink = blink(this);
  if (typeof inverse === 'function') inverse = inverse(this);
  if (typeof invisible === 'function') invisible = invisible(this);

  if (typeof fg === 'function') fg = fg(this);
  if (typeof bg === 'function') bg = bg(this);

  return ((((invisible ? 16 : 0) << 18)
    | ((inverse ? 8 : 0) << 18)
    | ((blink ? 4 : 0) << 18)
    | ((underline ? 2 : 0) << 18))
    | ((bold ? 1 : 0) << 18)
    | (colors.convert(fg) << 9))
    | colors.convert(bg);
};

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
  this.clearPos();
  this.hidden = true;
  this.emit('hide');
  if (this.screen.focused === this) {
    this.screen.rewindFocus();
  }
};

Element.prototype.show = function() {
  if (!this.hidden) return;
  this.hidden = false;
  this.emit('show');
};

Element.prototype.toggle = function() {
  return this.hidden ? this.show() : this.hide();
};

Element.prototype.focus = function() {
  return this.screen.focused = this;
};

Element.prototype._focus = function(old) {
  // Find a scrollable ancestor if we have one.
  var el = this;
  while (el = el.parent) {
    if (el.scrollable) break;
  }

  // If we're in a scrollable element,
  // automatically scroll to the focused element.
  if (el) {
    var ryi = this.top - el.top - el.itop
      , ryl = this.top + this.height - el.top - el.ibottom
      , visible = el.height - el.iheight;

    if (ryi < el.childBase) {
      el.scrollTo(ryi);
      this.screen.render();
    } else if (ryi >= el.childBase + visible) {
      el.scrollTo(ryi + this.height);
      this.screen.render();
    } else if (ryl >= el.childBase + visible) {
      el.scrollTo(ryi + this.height);
      this.screen.render();
    }
  }

  if (old) {
    old.emit('blur', this);
    this.screen.emit('element blur', old, this);
  }

  this.emit('focus', old);
  this.screen.emit('element focus', old, this);
};

Element.prototype.setContent = function(content, noClear) {
  if (!noClear) this.clearPos();
  this.content = content || '';
  this.parseContent();
};

Element.prototype.setContent_ = function(content, noClear) {
  var old, pos;

  if (!noClear) {
    old = this._pcontent;
    pos = this._getCoords();
  }

  this.content = content || '';
  this.parseContent();

  if (!noClear && pos && this._pcontent !== old) {
    // this.clearPos(pos);
    this.screen.clearRegion(
      pos.xi, pos.xl,
      pos.yi, pos.yl);
  }
};

Element.prototype.getContent = function() {
  return this._clines.fake.join('\n');
};

Element.prototype.parseContent = function() {
  if (this.detached) return false;

  var width = this.width - this.iwidth;
  if (this._clines == null
      || this._clines.width !== width
      || this._clines.content !== this.content) {
    var content = this.content;
    content = content
      .replace(/[\x00-\x08\x0b-\x0c\x0e-\x1a\x1c-\x1f\x7f]/g, '')
      .replace(/\x1b(?!\[[\d;]*m)/g, '')
      .replace(/\r\n|\r/g, '\n')
      .replace(/\t/g, this.screen.tabc)
      .replace(dwidthChars, '?');
    content = this._parseTags(content);
    this._clines = this._wrapContent(content, width);
    this._clines.width = width;
    this._clines.content = this.content;
    this._clines.attr = this._parseAttr(this._clines);
    this._clines.ci = [];
    this._clines.reduce(function(total, line) {
      this._clines.ci.push(total);
      return total + line.length + 1;
    }.bind(this), 0);
    this._pcontent = this._clines.join('\n');
    this.emit('parsed content');
    return true;
  }

  // Need to calculate this every time because the default fg/bg may change.
  this._clines.attr = this._parseAttr(this._clines) || this._clines.attr;

  return false;
};

// Convert `{red-fg}foo{/red-fg}` to `\x1b[31mfoo\x1b[39m`.
Element.prototype._parseTags = function(text) {
  if (!this.parseTags) return text;
  if (!/{\/?[\w\-,;!#]*}/.test(text)) return text;

  var program = this.screen.program
    , out = ''
    , state
    , bg = []
    , fg = []
    , flag = []
    , cap
    , slash
    , param
    , attr;

  for (;;) {
    if (cap = /^{(\/?)([\w\-,;!#]*)}/.exec(text)) {
      text = text.substring(cap[0].length);
      slash = cap[1] === '/';
      param = cap[2].replace(/-/g, ' ');

      if (param.slice(-3) === ' bg') state = bg;
      else if (param.slice(-3) === ' fg') state = fg;
      else state = flag;

      if (slash) {
        if (!param) {
          out += program._attr('normal');
          bg.length = 0;
          fg.length = 0;
          flag.length = 0;
        } else {
          attr = program._attr(param, false);
          if (attr == null) {
            out += cap[0];
          } else {
            // if (param !== state[state.length-1]) {
            //   throw new Error('Misnested tags.');
            // }
            state.pop();
            if (state.length) {
              out += program._attr(state[state.length-1]);
            } else {
              out += attr;
            }
          }
        }
      } else {
        if (!param) {
          out += cap[0];
        } else {
          attr = program._attr(param);
          if (attr == null) {
            out += cap[0];
          } else {
            state.push(param);
            out += attr;
          }
        }
      }

      continue;
    }

    if (cap = /^[\s\S]+?(?={\/?[\w\-,;!#]*})/.exec(text)) {
      text = text.substring(cap[0].length);
      out += cap[0];
      continue;
    }

    out += text;
    break;
  }

  return out;
};

Element.prototype._parseAttr = function(lines) {
  var dattr = this.sattr(this.style, this.style.fg, this.style.bg)
    , attr = dattr
    , attrs = []
    , line
    , i
    , j
    , c;

  if (lines[0].attr === attr) {
    return;
  }

  for (j = 0; j < lines.length; j++) {
    line = lines[j];
    attrs[j] = attr;
    for (i = 0; i < line.length; i++) {
      if (line[i] === '\x1b') {
        if (c = /^\x1b\[[\d;]*m/.exec(line.substring(i))) {
          attr = this.screen.attrCode(c[0], attr, dattr);
          i += c[0].length - 1;
        }
      }
    }
  }

  return attrs;
};

Element.prototype._align = function(line, width, align) {
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
};

Element.prototype._wrapContent = function(content, width) {
  var tags = this.parseTags
    , state = this.align
    , wrap = this.wrap
    , margin = 0
    , rtof = []
    , ftor = []
    , fake = []
    , out = []
    , no = 0
    , line
    , align
    , cap
    , total
    , i
    , part
    , j
    , lines;

  lines = content.split('\n');

  if (!content) {
    out.push(content);
    out.rtof = [0];
    out.ftor = [[0]];
    out.fake = lines;
    out.real = out;
    return out;
  }

  if (this.scrollbar) margin++;
  if (this.type === 'textarea') margin++;
  if (width > margin) width -= margin;

main:
  for (; no < lines.length; no++) {
    line = lines[no];
    align = state;

    ftor.push([]);

    // Handle alignment tags.
    if (tags) {
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

    // If we're not wrapping, just chop
    // the string off at the width.
    if (!wrap && line.length > width) {
      line = line.slice(0, width);
    }

    // If the string is apparently too long, wrap it.
    while (line.length > width) {
      // Measure the real width of the string.
      for (i = 0, total = 0; i < line.length; i++) {
        while (line[i] === '\x1b') {
          while (line[i] && line[i++] !== 'm');
        }
        if (!line[i]) break;
        if (++total === width) {
          // Try to find a space to break on.
          if (line[i] !== ' ') {
            j = i;
            while (j > i - 10 && j > 0 && line[j] !== ' ') j--;
            if (line[j] === ' ') i = j + 1;
          } else {
            i++;
          }
          break;
        }
      }

      part = line.substring(0, i);
      line = line.substring(i);

      out.push(this._align(part, width, align));
      ftor[no].push(out.length - 1);
      rtof.push(no);

      // Make sure we didn't wrap the line to the very end, otherwise
      // we get a pointless empty line after a newline.
      if (line === '') continue main;

      // If only an escape code got cut off, at it to `part`.
      if (/^(?:\x1b[\[\d;]*m)+$/.test(line)) {
        out[out.length-1] += line;
        continue main;
      }
    }

    out.push(this._align(line, width, align));
    ftor[no].push(out.length - 1);
    rtof.push(no);
  }

  out.rtof = rtof;
  out.ftor = ftor;
  out.fake = lines;
  out.real = out;

  out.mwidth = out.reduce(function(current, line) {
    line = line.replace(/\x1b\[[\d;]*m/g, '');
    return line.length > current
      ? line.length
      : current;
  }, 0);

  return out;
};

Element.prototype.__defineGetter__('visible', function() {
  var el = this;
  do {
    if (el.hidden) return false;
  } while (el = el.parent);
  return true;
});

Element.prototype.__defineGetter__('_detached', function() {
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
  if (this.detached) return;
  // Need to use _getCoords() over lpos here to avoid clearing
  // elements which are obfuscated by a scrollable parent.

  // NOTE: COULD USE THIS MULTIPLE PLACES - explanation:
  // We could use this.lpos because we don't want
  // to clear coordinates that may have changed and may
  // not be what/where is actually rendered.
  // var lpos = this._getCoords() && this.lpos;

  var lpos = this._getCoords();
  if (!lpos) return;
  this.screen.clearRegion(
    lpos.xi, lpos.xl,
    lpos.yi, lpos.yl);
};

/**
 * Positioning
 */

// The below methods are a bit confusing: basically
// whenever Box.render is called `lpos` gets set on
// the element, an object containing the rendered
// coordinates. Since these don't update if the
// element is moved somehow, they're unreliable in
// that situation. However, if we can guarantee that
// lpos is good and up to date, it can be more
// accurate than the calculated positions below.
// In this case, if the element is being rendered,
// it's guaranteed that the parent will have been
// rendered first, in which case we can use the
// parant's lpos instead of recalculating it's
// position (since that might be wrong because
// it doesn't handle content shrinkage).

Screen.prototype._getPos = function() {
  return this;
};

Element.prototype._getPos = function() {
  var pos = this.lpos;

  assert.ok(pos && !pos.changed);

  if (pos.left != null) return pos;

  pos.left = pos.xi;
  pos.top = pos.yi;
  pos.right = this.screen.cols - pos.xl;
  pos.bottom = this.screen.rows - pos.yl;
  pos.width = pos.xl - pos.xi;
  pos.height = pos.yl - pos.yi;

  return pos;
};

Element.prototype._bindPosChanged = function() {
  function changed() {
    self.forDescendants(function(el) {
      if (el.lpos) el.lpos.changed = true;
    }, true);
  }

  this.on('move', changed);
  // Resize might be tricky because it's
  // emitted recursively for a screen resize.
  this.on('resize', changed);
  this.on('reparent', changed);
};

/**
 * Position Getters
 */

Element.prototype._getWidth = function(get) {
  var parent = get ? this.parent._getPos() : this.parent;
  var width = this.position.width || 0;

  if (typeof width === 'string') {
    if (width === 'half') width = '50%';
    width = +width.slice(0, -1) / 100;
    return parent.width * width | 0;
  }

  // This is for if the element is being streched or shrunken.
  // Although the width for shrunken elements is calculated
  // in the render function, it may be calculated based on
  // the content width, and the content width is initially
  // decided by the width the element, so it needs to be
  // calculated here.
  if (!width) {
    var left = this.position.left || 0;
    if (typeof left === 'string') {
      if (left === 'center') left = '50%';
      left = +left.slice(0, -1) / 100;
      left = parent.width * left | 0;
    }
    width = parent.width - (this.position.right || 0) - left;
  }

  return width;
};

Element.prototype.__defineGetter__('width', function() {
  return this._getWidth(false);
});

Element.prototype._getHeight = function(get) {
  var parent = get ? this.parent._getPos() : this.parent;
  var height = this.position.height || 0;

  if (typeof height === 'string') {
    if (height === 'half') height = '50%';
    height = +height.slice(0, -1) / 100;
    return parent.height * height | 0;
  }

  // This is for if the element is being streched or shrunken.
  // Although the width for shrunken elements is calculated
  // in the render function, it may be calculated based on
  // the content width, and the content width is initially
  // decided by the width the element, so it needs to be
  // calculated here.
  if (!height) {
    var top = this.position.top || 0;
    if (typeof top === 'string') {
      if (top === 'center') top = '50%';
      top = +top.slice(0, -1) / 100;
      top = parent.height * top | 0;
    }
    height = parent.height - (this.position.bottom || 0) - top;
  }

  return height;
};

Element.prototype.__defineGetter__('height', function() {
  return this._getHeight(false);
});

Element.prototype._getLeft = function(get) {
  var parent = get ? this.parent._getPos() : this.parent;
  var left = this.position.left || 0;

  if (typeof left === 'string') {
    if (left === 'center') left = '50%';
    left = +left.slice(0, -1) / 100;
    left = parent.width * left | 0;
    if (this.position.left === 'center') {
      left -= this._getWidth(get) / 2 | 0;
    }
  }

  if (this.position.left == null && this.position.right != null) {
    return this.screen.cols - this._getWidth(get) - this._getRight(get);
  }

  return (parent.left || 0) + left;
};

Element.prototype.__defineGetter__('left', function() {
  return this._getLeft(false);
});

Element.prototype._getRight = function(get) {
  var parent = get ? this.parent._getPos() : this.parent;
  if (this.position.right == null && this.position.left != null) {
    return this.screen.cols - (this._getLeft(get) + this._getWidth(get));
  }
  return (parent.right || 0) + (this.position.right || 0);
};

Element.prototype.__defineGetter__('right', function() {
  return this._getRight(false);
});

Element.prototype._getTop = function(get) {
  var parent = get ? this.parent._getPos() : this.parent;
  var top = this.position.top || 0;

  if (typeof top === 'string') {
    if (top === 'center') top = '50%';
    top = +top.slice(0, -1) / 100;
    top = parent.height * top | 0;
    if (this.position.top === 'center') {
      top -= this._getHeight(get) / 2 | 0;
    }
  }

  if (this.position.top == null && this.position.bottom != null) {
    return this.screen.rows - this._getHeight(get) - this._getBottom(get);
  }

  return (parent.top || 0) + top;
};

Element.prototype.__defineGetter__('top', function() {
  return this._getTop(false);
});

Element.prototype._getBottom = function(get) {
  var parent = get ? this.parent._getPos() : this.parent;
  if (this.position.bottom == null && this.position.top != null) {
    return this.screen.rows - (this._getTop(get) + this._getHeight(get));
  }
  return (parent.bottom || 0) + (this.position.bottom || 0);
};

Element.prototype.__defineGetter__('bottom', function() {
  return this._getBottom(false);
});

Element.prototype.__defineGetter__('rleft', function() {
  return this.left - this.parent.left;
});

Element.prototype.__defineGetter__('rright', function() {
  return this.right - this.parent.right;
});

Element.prototype.__defineGetter__('rtop', function() {
  return this.top - this.parent.top;
});

Element.prototype.__defineGetter__('rbottom', function() {
  return this.bottom - this.parent.bottom;
});

/**
 * Position Setters
 */

// NOTE:
// For right, bottom, rright, and rbottom:
// If position.bottom is null, we could simply set top instead.
// But it wouldn't replicate bottom behavior appropriately if
// the parent was resized, etc.
Element.prototype.__defineSetter__('width', function(val) {
  if (this.position.width === val) return;
  this.emit('resize');
  this.clearPos();
  return this.position.width = val;
});

Element.prototype.__defineSetter__('height', function(val) {
  if (this.position.height === val) return;
  this.emit('resize');
  this.clearPos();
  return this.position.height = val;
});

Element.prototype.__defineSetter__('left', function(val) {
  if (typeof val === 'string') {
    if (val === 'center') {
      val = this.screen.width / 2 | 0;
      val -= this.width / 2 | 0;
    } else {
      val = +val.slice(0, -1) / 100;
      val = this.screen.width * val | 0;
    }
  }
  val -= this.parent.left;
  if (this.position.left === val) return;
  this.emit('move');
  this.clearPos();
  return this.position.left = val;
});

Element.prototype.__defineSetter__('right', function(val) {
  val -= this.parent.right;
  if (this.position.right === val) return;
  this.emit('move');
  this.clearPos();
  return this.position.right = val;
});

Element.prototype.__defineSetter__('top', function(val) {
  if (typeof val === 'string') {
    if (val === 'center') {
      val = this.screen.height / 2 | 0;
      val -= this.height / 2 | 0;
    } else {
      val = +val.slice(0, -1) / 100;
      val = this.screen.height * val | 0;
    }
  }
  val -= this.parent.top;
  if (this.position.top === val) return;
  this.emit('move');
  this.clearPos();
  return this.position.top = val;
});

Element.prototype.__defineSetter__('bottom', function(val) {
  val -= this.parent.bottom;
  if (this.position.bottom === val) return;
  this.emit('move');
  this.clearPos();
  return this.position.bottom = val;
});

Element.prototype.__defineSetter__('rleft', function(val) {
  if (this.position.left === val) return;
  this.emit('move');
  this.clearPos();
  return this.position.left = val;
});

Element.prototype.__defineSetter__('rright', function(val) {
  if (this.position.right === val) return;
  this.emit('move');
  this.clearPos();
  return this.position.right = val;
});

Element.prototype.__defineSetter__('rtop', function(val) {
  if (this.position.top === val) return;
  this.emit('move');
  this.clearPos();
  return this.position.top = val;
});

Element.prototype.__defineSetter__('rbottom', function(val) {
  if (this.position.bottom === val) return;
  this.emit('move');
  this.clearPos();
  return this.position.bottom = val;
});

Element.prototype.__defineGetter__('ileft', function() {
  return (this.border ? 1 : 0) + this.padding.left;
});

Element.prototype.__defineGetter__('itop', function() {
  return (this.border ? 1 : 0) + this.padding.top;
});

Element.prototype.__defineGetter__('iright', function() {
  return (this.border ? 1 : 0) + this.padding.right;
});

Element.prototype.__defineGetter__('ibottom', function() {
  return (this.border ? 1 : 0) + this.padding.bottom;
});

Element.prototype.__defineGetter__('iwidth', function() {
  return (this.border ? 2 : 0) + this.padding.left + this.padding.right;
});

Element.prototype.__defineGetter__('iheight', function() {
  return (this.border ? 2 : 0) + this.padding.top + this.padding.bottom;
});

Element.prototype.__defineGetter__('tpadding', function() {
  return this.padding.left + this.padding.top
    + this.padding.right + this.padding.bottom;
});

/**
 * Rendering - here be dragons
 */

Element.prototype._getShrinkBox = function(xi, xl, yi, yl) {
  if (!this.children.length) {
    return { xi: xi, xl: xi, yi: yi, yl: yi };
  }

  var i, el, ret, mxi = 0, mxl = 0, myi = 0, myl = 0;

  for (i = 0; i < this.children.length; i++) {
    el = this.children[i];

    ret = el._getCoords();
    if (!ret) continue;

    if (ret.xi < mxi) mxi = ret.xi;
    if (ret.xl > mxl) mxl = ret.xl;
    if (ret.yi < myi) myi = ret.yi;
    if (ret.yl > myl) myl = ret.yl;
  }

  if (this.position.width == null
      && (this.position.left == null
      || this.position.right == null)) {
    if (this.position.left == null && this.position.right != null) {
      xi = xl - (mxl - mxi);
      xi -= this.padding.left + this.padding.right;
    } else {
      xl = mxl;
      xl += this.padding.left + this.padding.right;
    }
  }

  if (this.position.height == null
      && (this.position.top == null
      || this.position.bottom == null)
      && !this.scrollable) {
    if (this.position.top == null && this.position.bottom != null) {
      yi = yl - (myl - myi);
      yi -= this.padding.top + this.padding.bottom;
    } else {
      yl = myl;
      yl += this.padding.top + this.padding.bottom;
    }
  }

  return { xi: xi, xl: xl, yi: yi, yl: yl };
};

Element.prototype._getShrinkContent = function(xi, xl, yi, yl) {
  var h = this._clines.length
    , w = this._clines.mwidth;

  if (this.position.width == null
      && (this.position.left == null
      || this.position.right == null)) {
    if (this.position.left == null && this.position.right != null) {
      xi = xl - w - this.iwidth;
    } else {
      xl = xi + w + this.iwidth;
    }
  }

  if (this.position.height == null
      && (this.position.top == null
      || this.position.bottom == null)
      && !this.scrollable) {
    if (this.position.top == null && this.position.bottom != null) {
      yi = yl - h - this.iheight;
    } else {
      yl = yi + h + this.iheight;
    }
  }

  return { xi: xi, xl: xl, yi: yi, yl: yl };
};

Element.prototype._getShrink = function(xi, xl, yi, yl) {
  var shrinkBox = this._getShrinkBox(xi, xl, yi, yl)
    , shrinkContent = this._getShrinkContent(xi, xl, yi, yl)
    , xll = xl
    , yll = yl;

  // Figure out which one is bigger and use it.
  if (shrinkBox.xl - shrinkBox.xi > shrinkContent.xl - shrinkContent.xi) {
    xi = shrinkBox.xi;
    xl = shrinkBox.xl;
  } else {
    xi = shrinkContent.xi;
    xl = shrinkContent.xl;
  }

  if (shrinkBox.yl - shrinkBox.yi > shrinkContent.yl - shrinkContent.yi) {
    yi = shrinkBox.yi;
    yl = shrinkBox.yl;
  } else {
    yi = shrinkContent.yi;
    yl = shrinkContent.yl;
  }

  // Recenter shrunken elements.
  if (xl < xll && this.position.left === 'center') {
    xll = (xll - xl) / 2 | 0;
    xi += xll;
    xl += xll;
  }

  if (yl < yll && this.position.top === 'center') {
    yll = (yll - yl) / 2 | 0;
    yi += yll;
    yl += yll;
  }

  return { xi: xi, xl: xl, yi: yi, yl: yl };
};

Element.prototype._getCoords = function(get) {
  if (this.hidden) return;

  var xi = this._getLeft(get)
    , xl = xi + this._getWidth(get)
    , yi = this._getTop(get)
    , yl = yi + this._getHeight(get)
    , base = this.childBase || 0
    , el = this
    , fixed = this.fixed
    , coords
    , v
    , notop
    , nobot
    , ppos;

  // Attempt to shrink the element base on the
  // size of the content and child elements.
  if (this.shrink) {
    coords = this._getShrink(xi, xl, yi, yl);
    xi = coords.xi, xl = coords.xl;
    yi = coords.yi, yl = coords.yl;
  }

  // Find a scrollable ancestor if we have one.
  while (el = el.parent) {
    if (el.scrollable) {
      if (fixed) {
        fixed = false;
        continue;
      }
      break;
    }
  }

  // Check to make sure we're visible and
  // inside of the visible scroll area.
  // NOTE: Lists have a property where only
  // the list items are obfuscated.
  if (el) {
    ppos = this.parent.lpos;

    // The shrink option can cause a stack overflow
    // by calling _getCoords on the child again.
    // if (!get && !this.parent.shrink) {
    //   ppos = this.parent._getCoords();
    // }

    if (!ppos) return;

    yi -= ppos.base;
    yl -= ppos.base;

    if (yi < ppos.yi + this.parent.itop) {
      if (yl - 1 < ppos.yi + this.parent.itop) {
        // Is above.
        return;
      } else {
        // Is partially covered above.
        notop = true;
        v = ppos.yi - yi;
        v += this.parent.itop - this.itop;
        base += v;
        yi += v;
      }
    } else if (yl > ppos.yl - this.parent.ibottom) {
      if (yi > ppos.yl - 1 - this.parent.ibottom) {
        // Is below.
        return;
      } else {
        // Is partially covered below.
        nobot = true;
        v = yl - ppos.yl;
        v += this.parent.ibottom - this.ibottom;
        yl -= v;
      }
    }

    // Shouldn't be necessary.
    // assert.ok(yi < yl);
    if (yi >= yl) return;
  }

  return {
    xi: xi,
    xl: xl,
    yi: yi,
    yl: yl,
    base: base,
    notop: notop,
    nobot: nobot
  };
};

Element.prototype.render = function() {
  this.emit('prerender');

  this.parseContent();

  var coords = this._getCoords(true);
  if (!coords) {
    delete this.lpos;
    return;
  }

  var lines = this.screen.lines
    , xi = coords.xi
    , xl = coords.xl
    , yi = coords.yi
    , yl = coords.yl
    , x
    , y
    , cell
    , attr
    , ch
    , content = this._pcontent
    , ci = this._clines.ci[coords.base]
    , battr
    , dattr
    , c
    , rtop
    , visible
    , i;

  if (coords.base >= this._clines.ci.length) {
    ci = this._pcontent.length;
  }

  this.lpos = coords;

  dattr = this.sattr(this.style, this.style.fg, this.style.bg);
  attr = dattr;

  // If we're in a scrollable text box, check to
  // see which attributes this line starts with.
  if (ci > 0) {
    attr = this._clines.attr[Math.min(coords.base, this._clines.length - 1)];
  }

  if (this.border) xi++, xl--, yi++, yl--;

  // If we have padding/valign, that means the
  // content-drawing loop will skip a few cells/lines.
  // To deal with this, we can just fill the whole thing
  // ahead of time. This could be optimized.
  if (this.tpadding || (this.valign && this.valign !== 'top')) {
    this.screen.fillRegion(dattr, ' ', xi, xl, yi, yl);
  }

  if (this.tpadding) {
    xi += this.padding.left, xl -= this.padding.right;
    yi += this.padding.top, yl -= this.padding.bottom;
  }

  // Determine where to place the text if it's vertically aligned.
  if (this.valign === 'middle' || this.valign === 'bottom') {
    visible = yl - yi;
    if (this._clines.length < visible) {
      if (this.valign === 'middle') {
        visible = visible / 2 | 0;
        visible -= this._clines.length / 2 | 0;
      } else if (this.valign === 'bottom') {
        visible -= this._clines.length;
      }
      yi += visible;
    }
  }

  // Draw the content and background.
  for (y = yi; y < yl; y++) {
    if (!lines[y]) break;
    for (x = xi; x < xl; x++) {
      cell = lines[y][x];
      if (!cell) break;

      ch = content[ci++] || ' ';

      // Handle escape codes.
      while (ch === '\x1b') {
        if (c = /^\x1b\[[\d;]*m/.exec(content.substring(ci - 1))) {
          ci += c[0].length - 1;
          attr = this.screen.attrCode(c[0], attr, dattr);
          ch = content[ci] || ' ';
          ci++;
        } else {
          break;
        }
      }

      // Handle newlines.
      if (ch === '\t') ch = ' ';
      if (ch === '\n') {
        // If we're on the first cell and we find a newline and the last cell
        // of the last line was not a newline, let's just treat this like the
        // newline was already "counted".
        if (x === xi && y !== yi && content[ci-2] !== '\n') {
          x--;
          continue;
        }
        // We could use fillRegion here, name the
        // outer loop, and continue to it instead.
        ch = ' ';
        for (; x < xl; x++) {
          cell = lines[y][x];
          if (!cell) break;
          if (attr !== cell[0] || ch !== cell[1]) {
            lines[y][x][0] = attr;
            lines[y][x][1] = ch;
            lines[y].dirty = true;
          }
        }
        continue;
      }

      if (attr !== cell[0] || ch !== cell[1]) {
        lines[y][x][0] = attr;
        lines[y][x][1] = ch;
        lines[y].dirty = true;
      }
    }
  }

  // Draw the scrollbar.
  // Could possibly draw this after all child elements.
  if (this.scrollbar) {
    i = Math.max(this._clines.length, this._scrollBottom());
  }
  if (coords.notop || coords.nobot) i = -Infinity;
  if (this.scrollbar && (yl - yi) < i) {
    x = xl - 1;
    if (this.scrollbar.ignoreBorder && this.border) x++;
    if (this.alwaysScroll) {
      y = this.childBase / (i - (yl - yi));
    } else {
      y = (this.childBase + this.childOffset) / i;
    }
    y = yi + ((yl - yi) * y | 0);
    if (y >= yl) y = yl - 1;
    cell = lines[y] && lines[y][x];
    if (cell) {
      if (this.track) {
        ch = this.track.ch || ' ';
        attr = this.sattr(this.style.track,
          this.style.track.fg || this.style.fg,
          this.style.track.bg || this.style.bg);
        this.screen.fillRegion(attr, ch, x, x + 1, yi, yl);
      }
      ch = this.scrollbar.ch || ' ';
      attr = this.sattr(this.style.scrollbar,
        this.style.scrollbar.fg || this.style.fg,
        this.style.scrollbar.bg || this.style.bg);
      if (attr !== cell[0] || ch !== cell[1]) {
        lines[y][x][0] = attr;
        lines[y][x][1] = ch;
        lines[y].dirty = true;
      }
    }
  }

  if (this.border) xi--, xl++, yi--, yl++;

  if (this.tpadding) {
    xi -= this.padding.left, xl += this.padding.right;
    yi -= this.padding.top, yl += this.padding.bottom;
  }

  // Draw the border.
  if (this.border) {
    battr = this.sattr(this.style.border,
      this.style.border.fg, this.style.border.bg);
    y = yi;
    if (coords.notop) y = -1;
    for (x = xi; x < xl; x++) {
      if (!lines[y]) break;
      if (this.border.type === 'line') {
        if (x === xi) ch = '┌';
        else if (x === xl - 1) ch = '┐';
        else ch = '─';
      } else if (this.border.type === 'bg') {
        ch = this.border.ch;
      }
      cell = lines[y][x];
      if (!cell) break;
      if (battr !== cell[0] || ch !== cell[1]) {
        lines[y][x][0] = battr;
        lines[y][x][1] = ch;
        lines[y].dirty = true;
      }
    }
    y = yi + 1;
    for (; y < yl - 1; y++) {
      if (!lines[y]) break;
      if (this.border.type === 'line') {
        ch = '│';
      } else if (this.border.type === 'bg') {
        ch = this.border.ch;
      }
      cell = lines[y][xi];
      if (!cell) break;
      if (battr !== cell[0] || ch !== cell[1]) {
        lines[y][xi][0] = battr;
        lines[y][xi][1] = ch;
        lines[y].dirty = true;
      }
      cell = lines[y][xl - 1];
      if (!cell) break;
      if (battr !== cell[0] || ch !== cell[1]) {
        lines[y][xl - 1][0] = battr;
        lines[y][xl - 1][1] = ch;
        lines[y].dirty = true;
      }
    }
    y = yl - 1;
    if (coords.nobot) y = -1;
    for (x = xi; x < xl; x++) {
      if (!lines[y]) break;
      if (this.border.type === 'line') {
        if (x === xi) ch = '└';
        else if (x === xl - 1) ch = '┘';
        else ch = '─';
      } else if (this.border.type === 'bg') {
        ch = this.border.ch;
      }
      cell = lines[y][x];
      if (!cell) break;
      if (battr !== cell[0] || ch !== cell[1]) {
        lines[y][x][0] = battr;
        lines[y][x][1] = ch;
        lines[y].dirty = true;
      }
    }
  }

  this.children.forEach(function(el) {
    if (el.screen._ci !== -1) {
      el.index = el.screen._ci++;
    }
    el.render();
  });

  this.emit('render', coords);

  return coords;
};

Element.prototype.insertLine = function(i, line) {
  if (typeof line === 'string') line = line.split('\n');

  if (i !== i || i == null) {
    i = this._clines.ftor.length;
  }

  i = Math.max(i, 0);

  while (this._clines.fake.length < i) {
    this._clines.fake.push('');
    this._clines.ftor.push([this._clines.push('') - 1]);
    this._clines.rtof(this._clines.fake.length - 1);
  }

  // NOTE: Could possibly compare the first and last ftor line numbers to see
  // if they're the same, or if they fit in the visible region entirely.
  var start = this._clines.length
    , diff
    , real;

  if (i >= this._clines.ftor.length) {
    real = this._clines.ftor[this._clines.ftor.length - 1];
    real = real[real.length-1] + 1;
  } else {
    real = this._clines.ftor[i][0];
  }

  for (var j = 0; j < line.length; j++) {
    this._clines.fake.splice(i + j, 0, line[j]);
  }

  this.setContent(this._clines.fake.join('\n'), true);

  diff = this._clines.length - start;

  if (diff > 0) {
    var pos = this._getCoords();
    if (!pos) return;

    var height = pos.yl - pos.yi - this.iheight
      , base = this.childBase || 0
      , visible = real >= base && real - base < height;

    if (pos && visible && this.screen.cleanSides(this)) {
      this.screen.insertLine(diff,
        pos.yi + this.itop + real - base,
        pos.yi,
        pos.yl - this.ibottom - 1);
    }
  }
};

Element.prototype.deleteLine = function(i, n) {
  n = n || 1;

  if (i !== i || i == null) {
    i = this._clines.ftor.length - 1;
  }

  i = Math.max(i, 0);
  i = Math.min(i, this._clines.ftor.length - 1);

  // NOTE: Could possibly compare the first and last ftor line numbers to see
  // if they're the same, or if they fit in the visible region entirely.
  var start = this._clines.length
    , diff
    , real = this._clines.ftor[i][0];

  while (n--) {
    this._clines.fake.splice(i, 1);
  }

  this.setContent(this._clines.fake.join('\n'), true);

  diff = start - this._clines.length;

  if (diff > 0) {
    var pos = this._getCoords();
    if (!pos) return;

    var height = pos.yl - pos.yi - this.iheight
      , base = this.childBase || 0
      , visible = real >= base && real - base < height;

    if (pos && visible && this.screen.cleanSides(this)) {
      this.screen.deleteLine(diff,
        pos.yi + this.itop + real - base,
        pos.yi,
        pos.yl - this.ibottom - 1);
    }
  }

  if (this._clines.length < height) {
    this.clearPos();
  }
};

Element.prototype.insertTop = function(line) {
  var fake = this._clines.rtof[this.childBase || 0];
  return this.insertLine(fake, line);
};

Element.prototype.insertBottom = function(line) {
  var h = (this.childBase || 0) + this.height - this.iheight
    , i = Math.min(h, this._clines.length)
    , fake = this._clines.rtof[i - 1] + 1;

  return this.insertLine(fake, line);
};

Element.prototype.deleteTop = function(n) {
  var fake = this._clines.rtof[this.childBase || 0];
  return this.deleteLine(fake, n);
};

Element.prototype.deleteBottom = function(n) {
  var h = (this.childBase || 0) + this.height - 1 - this.iheight
    , i = Math.min(h, this._clines.length - 1)
    , n = n || 1
    , fake = this._clines.rtof[i];

  return this.deleteLine(fake - (n - 1), n);
};

Element.prototype.setLine = function(i, line) {
  i = Math.max(i, 0);
  while (this._clines.fake.length < i) {
    this._clines.fake.push('');
  }
  this._clines.fake[i] = line;
  return this.setContent(this._clines.fake.join('\n'), true);
};

Element.prototype.setBaseLine = function(i, line) {
  var fake = this._clines.rtof[this.childBase || 0];
  return this.setLine(fake + i, line);
};

Element.prototype.getLine = function(i) {
  i = Math.max(i, 0);
  i = Math.min(i, this._clines.fake.length - 1);
  return this._clines.fake[i];
};

Element.prototype.getBaseLine = function(i) {
  var fake = this._clines.rtof[this.childBase || 0];
  return this.getLine(fake + i);
};

Element.prototype.clearLine = function(i) {
  i = Math.min(i, this._clines.fake.length - 1);
  return this.setLine(i, '');
};

Element.prototype.clearBaseLine = function(i) {
  var fake = this._clines.rtof[this.childBase || 0];
  return this.clearLine(fake + i);
};

Element.prototype.unshiftLine = function(line) {
  return this.insertLine(0, line);
};

Element.prototype.shiftLine = function(n) {
  return this.deleteLine(0, n);
};

Element.prototype.pushLine = function(line) {
  return this.insertLine(this._clines.fake.length, line);
};

Element.prototype.popLine = function(n) {
  return this.deleteLine(this._clines.fake.length - 1, n);
};

/**
 * Box
 */

function Box(options) {
  if (!(this instanceof Node)) {
    return new Box(options);
  }
  options = options || {};
  Element.call(this, options);
}

Box.prototype.__proto__ = Element.prototype;

Box.prototype.type = 'box';

/**
 * Text
 */

function Text(options) {
  if (!(this instanceof Node)) {
    return new Text(options);
  }
  options = options || {};
  options.shrink = true;
  Element.call(this, options);
}

Text.prototype.__proto__ = Element.prototype;

Text.prototype.type = 'text';

/**
 * Line
 */

function Line(options) {
  var self = this;

  if (!(this instanceof Node)) {
    return new Line(options);
  }

  options = options || {};

  var orientation = options.orientation || 'vertical';
  delete options.orientation;

  if (orientation === 'vertical') {
    options.width = 1;
  } else {
    options.height = 1;
  }

  Box.call(this, options);

  this.ch = !options.type || options.type === 'line'
    ? orientation === 'horizontal' ? '─' : '│'
    : options.ch || ' ';

  this.border = {
    type: 'bg',
    __proto__: this
    // get ch() { return self.ch; },
    // set ch(c) { return self.ch = c; }
  };

  this.style.border = this.style;

  // Maybe instead of the above:
  // this.on('prerender', function() {
  //   self._style = self.style;
  //   self.border = { type: 'bg', ch: self.ch };
  //   self.style = { border: self.style };
  // });
  //
  // this.on('render', function(coords) {
  //   self.style = self._style;
  // });
}

Line.prototype.__proto__ = Box.prototype;

Line.prototype.type = 'line';

/**
 * ScrollableBox
 */

function ScrollableBox(options) {
  var self = this;

  if (!(this instanceof Node)) {
    return new ScrollableBox(options);
  }

  options = options || {};

  Box.call(this, options);

  if (options.scrollable === false) {
    return this;
  }

  this.scrollable = true;
  this.childOffset = 0;
  this.childBase = 0;
  this.baseLimit = options.baseLimit || Infinity;
  this.alwaysScroll = options.alwaysScroll;

  this.scrollbar = options.scrollbar;
  if (this.scrollbar) {
    this.scrollbar.ch = this.scrollbar.ch || ' ';
    this.style.scrollbar = this.style.scrollbar || this.scrollbar.style;
    if (!this.style.scrollbar) {
      this.style.scrollbar = {};
      this.style.scrollbar.fg = this.scrollbar.fg;
      this.style.scrollbar.bg = this.scrollbar.bg;
      this.style.scrollbar.bold = this.scrollbar.bold;
      this.style.scrollbar.underline = this.scrollbar.underline;
      this.style.scrollbar.inverse = this.scrollbar.inverse;
      this.style.scrollbar.invisible = this.scrollbar.invisible;
    }
    this.scrollbar.style = this.style.scrollbar;
    if (this.track || this.scrollbar.track) {
      this.track = this.scrollbar.track || this.track;
      this.style.track = this.style.scrollbar.track || this.style.track;
      this.track.ch = this.track.ch || ' ';
      this.style.track = this.style.track || this.track.style;
      if (!this.style.track) {
        this.style.track = {};
        this.style.track.fg = this.track.fg;
        this.style.track.bg = this.track.bg;
        this.style.track.bold = this.track.bold;
        this.style.track.underline = this.track.underline;
        this.style.track.inverse = this.track.inverse;
        this.style.track.invisible = this.track.invisible;
      }
      this.track.style = this.style.track;
    }
  }

  if (options.mouse) {
    this.on('wheeldown', function(data) {
      self.scroll(self.height / 2 | 0 || 1);
      self.screen.render();
    });
    this.on('wheelup', function(data) {
      self.scroll(-(self.height / 2 | 0) || -1);
      self.screen.render();
    });
  }

  if (options.keys && !options.ignoreKeys) {
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

ScrollableBox.prototype.__proto__ = Box.prototype;

ScrollableBox.prototype.type = 'scrollable-box';

ScrollableBox.prototype._scrollBottom = function() {
  if (!this.scrollable) return 0;

  // We could just calculate the children, but we can
  // optimize for lists by just returning the items.length.
  if (this.type === 'list') {
    return this.items ? this.items.length : 0;
  }

  if (this.lpos && this.lpos._scrollBottom) {
    return this.lpos._scrollBottom;
  }

  var bottom = this.children.reduce(function(current, el) {
    return Math.max(current, el.rtop + el.height);
  }, 0);

  if (this.lpos) this.lpos._scrollBottom = bottom;

  return bottom;
};

ScrollableBox.prototype.scrollTo = function(offset) {
  return this.scroll(offset - (this.childBase + this.childOffset));
};

ScrollableBox.prototype.scroll = function(offset, always) {
  if (!this.scrollable) return;

  // Handle scrolling.
  var visible = this.height - this.iheight
    , base = this.childBase
    , d
    , p
    , t
    , b
    , max
    , emax;

  if (this.alwaysScroll || always) {
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

  // Find max "bottom" value for
  // content and descendant elements.
  // Scroll the content if necessary.
  if (this.childBase === base) {
    return this.emit('scroll');
  }

  // When scrolling text, we want to be able to handle SGR codes as well as line
  // feeds. This allows us to take preformatted text output from other programs
  // and put it in a scrollable text box.
  this.parseContent();

  max = this._clines.length - (this.height - this.iheight);
  if (max < 0) max = 0;
  emax = this._scrollBottom() - (this.height - this.iheight);
  if (emax < 0) emax = 0;

  this.childBase = Math.min(this.childBase, Math.max(emax, max));

  if (this.childBase < 0) {
    this.childBase = 0;
  } else if (this.childBase > this.baseLimit) {
    this.childBase = this.baseLimit;
  }

  // Optimize scrolling with CSR + IL/DL.
  p = this.lpos;
  // Only really need _getCoords() if we want
  // to allow nestable scrolling elements...
  // or if we **really** want shrinkable
  // scrolling elements.
  // p = this._getCoords();
  if (this.childBase !== base && this.screen.cleanSides(this)) {
    t = p.yi + this.itop;
    b = p.yl - this.ibottom - 1;
    d = this.childBase - base;

    if (d > 0 && d < visible) {
      // scrolled down
      this.screen.deleteLine(d, t, t, b);
    } else if (d < 0 && -d < visible) {
      // scrolled up
      d = -d;
      this.screen.insertLine(d, t, t, b);
    }
  }

  return this.emit('scroll');
};

ScrollableBox.prototype._recalculateIndex = function() {
  var max, emax;

  if (this.detached || !this.scrollable) {
    return 0;
  }

  max = this._clines.length - (this.height - this.iheight);
  if (max < 0) max = 0;
  emax = this._scrollBottom() - (this.height - this.iheight);
  if (emax < 0) emax = 0;

  this.childBase = Math.min(this.childBase, Math.max(emax, max));

  if (this.childBase < 0) {
    this.childBase = 0;
  } else if (this.childBase > this.baseLimit) {
    this.childBase = this.baseLimit;
  }
};

ScrollableBox.prototype.resetScroll = function() {
  if (!this.scrollable) return;
  this.childOffset = 0;
  this.childBase = 0;
  return this.emit('scroll');
};

/**
 * ScrollableText
 */

function ScrollableText(options) {
  if (!(this instanceof Node)) {
    return new ScrollableText(options);
  }
  options = options || {};
  options.scrollable = true;
  options.alwaysScroll = true;
  Box.call(this, options);
}

ScrollableText.prototype.__proto__ = Box.prototype;

ScrollableText.prototype.type = 'scrollable-text';

/**
 * List
 */

function List(options) {
  var self = this;

  if (!(this instanceof Node)) {
    return new List(options);
  }

  options = options || {};

  options.ignoreKeys = true;
  // Possibly put this here: this.items = [];
  options.scrollable = true;
  Box.call(this, options);

  this.value = '';
  this.items = [];
  this.ritems = [];
  this.selected = 0;

  if (!this.style.selected) {
    this.style.selected = {};
    this.style.selected.bg = options.selectedBg;
    this.style.selected.fg = options.selectedFg;
    this.style.selected.bold = options.selectedBold;
    this.style.selected.underline = options.selectedUnderline;
    this.style.selected.blink = options.selectedBlink;
    this.style.selected.inverse = options.selectedInverse;
    this.style.selected.invisible = options.selectedInvisible;
  }

  if (!this.style.item) {
    this.style.item = {};
    this.style.item.bg = options.itemBg;
    this.style.item.fg = options.itemFg;
    this.style.item.bold = options.itemBold;
    this.style.item.underline = options.itemUnderline;
    this.style.item.blink = options.itemBlink;
    this.style.item.inverse = options.itemInverse;
    this.style.item.invisible = options.itemInvisible;
  }

  // Legacy: for apps written before the addition of item attributes.
  ['bg', 'fg', 'bold', 'underline',
   'blink', 'inverse', 'invisible'].forEach(function(name) {
    if (self.style[name] != null && self.style.item[name] == null) {
      self.style.item[name] = self.style[name];
    }
  });

  if (this.options.itemHoverBg) {
    this.options.itemHoverEffects = { bg: this.options.itemHoverBg };
  }

  if (this.options.itemHoverEffects) {
    this.style.item.hover = this.options.itemHoverEffects;
  }

  if (this.options.itemFocusEffects) {
    this.style.item.focus = this.options.itemFocusEffects;
  }

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

  if (options.mouse) {
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
      if (key.name === 'enter'
          || (options.vi && key.name === 'l' && !key.shift)) {
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
        self.move(-((self.height - self.iheight) / 2) | 0);
        self.screen.render();
        return;
      }
      if (options.vi && key.name === 'd' && key.ctrl) {
        self.move((self.height - self.iheight) / 2 | 0);
        self.screen.render();
        return;
      }
      if (options.vi && key.name === 'b' && key.ctrl) {
        self.move(-(self.height - self.iheight));
        self.screen.render();
        return;
      }
      if (options.vi && key.name === 'f' && key.ctrl) {
        self.move(self.height - self.iheight);
        self.screen.render();
        return;
      }
      if (options.vi && key.name === 'h' && key.shift) {
        self.move(self.childBase - self.selected);
        self.screen.render();
        return;
      }
      if (options.vi && key.name === 'm' && key.shift) {
        // TODO: Maybe use Math.min(this.items.length,
        // ... for calculating visible items elsewhere.
        var visible = Math.min(
          self.height - self.iheight,
          self.items.length) / 2 | 0;
        self.move(self.childBase + visible - self.selected);
        self.screen.render();
        return;
      }
      if (options.vi && key.name === 'l' && key.shift) {
        // XXX This goes one too far on lists with an odd number of items.
        self.down(self.childBase
          + Math.min(self.height - self.iheight, self.items.length)
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
    var visible = self.height - self.iheight;
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

  this.on('adopt', function(el) {
    if (!~self.items.indexOf(el)) {
      el.fixed = true;
    }
  });
}

List.prototype.__proto__ = Box.prototype;

List.prototype.type = 'list';

List.prototype.add = function(item) {
  var self = this;

  var options = {
    screen: this.screen,
    content: item,
    align: this.align || 'left',
    top: this.itop + this.items.length,
    left: this.ileft + 1,
    right: this.iright + 1,
    tags: this.parseTags,
    height: 1,
    hoverEffects: this.mouse ? this.style.item.hover : null,
    focusEffects: this.mouse ? this.style.item.focus : null
  };

  ['bg', 'fg', 'bold', 'underline',
   'blink', 'inverse', 'invisible'].forEach(function(name) {
    options[name] = function() {
      var attr = self.items[self.selected] === item
        ? self.style.selected[name]
        : self.style.item[name];
      if (typeof attr === 'function') attr = attr(item);
      return attr;
    };
  });

  var item = new Box(options);

  this.items.push(item);
  this.append(item);

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

List.prototype.addItem = List.prototype.add;
List.prototype.appendItem = List.prototype.add;
List.prototype.removeItem = List.prototype.remove;

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

  this.selected = index;
  this.value = this.ritems[this.selected];
  this.scrollTo(this.selected);
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
 * Form
 */

function Form(options) {
  var self = this;

  if (!(this instanceof Node)) {
    return new Form(options);
  }

  options = options || {};

  options.ignoreKeys = true;
  Box.call(this, options);

  if (options.keys) {
    this.screen._listenKeys(this);
    this.screen.on('element keypress', function(el, ch, key) {
      // Make sure we're not entering input into a textbox.
      // if (self.screen.grabKeys || self.screen.lockKeys) {
      //   return;
      // }

      // Make sure we're a form or input element.
      if (el !== self && !el.hasAncestor(self)) {
        return;
      }

      if ((key.name === 'tab' && !key.shift)
          || key.name === 'down'
          || (options.vi && key.name === 'j')) {
        if (el.type === 'textbox' || el.type === 'textarea') {
          if (key.name === 'j') return;
          if (key.name === 'tab') {
            // Workaround, since we can't stop the tab from being added.
            el.emit('keypress', null, { name: 'backspace' });
          }
          el.emit('keypress', '\x1b', { name: 'escape' });
        }
        self.focusNext();
        return;
      }

      if ((key.name === 'tab' && key.shift)
          || key.name === 'up'
          || (options.vi && key.name === 'k')) {
        if (el.type === 'textbox' || el.type === 'textarea') {
          if (key.name === 'k') return;
          el.emit('keypress', '\x1b', { name: 'escape' });
        }
        self.focusPrevious();
        return;
      }

      if (key.name === 'escape') {
        self.focus();
        return;
      }
    });
  }
}

Form.prototype.__proto__ = Box.prototype;

Form.prototype.type = 'form';

Form.prototype._refresh = function() {
  if (!this._children) {
    var out = [];

    this.children.forEach(function fn(el) {
      if (el.keyable) out.push(el);
      el.children.forEach(fn);
    });

    this._children = out;
  }
};

Form.prototype.next = function() {
  this._refresh();

  if (!this._selected) {
    return this._selected = this._children[0];
  }

  var i = this._children.indexOf(this._selected);
  if (!~i || !this._children[i + 1]) {
    return this._selected = this._children[0];
  }

  return this._selected = this._children[i + 1];
};

Form.prototype.previous = function() {
  this._refresh();

  if (!this._selected) {
    return this._selected = this._children[this._children.length - 1];
  }

  var i = this._children.indexOf(this._selected);
  if (!~i || !this._children[i - 1]) {
    return this._selected = this._children[this._children.length - 1];
  }

  return this._selected = this._children[i - 1];
};

Form.prototype.focusNext = function() {
  this.next().focus();
};

Form.prototype.focusPrevious = function() {
  this.previous().focus();
};

Form.prototype.submit = function() {
  var self = this
    , out = {};

  this.children.forEach(function fn(el) {
    if (el.value != null) {
      var name = el.name || el.type;
      if (Array.isArray(out[name])) {
        out[name].push(el.value);
      } else if (out[name]) {
        out[name] = [out[name], el.value];
      } else {
        out[name] = el.value;
      }
    }
    el.children.forEach(fn);
  });

  this.emit('submit', out);

  return this.submission = out;
};

Form.prototype.cancel = function() {
  this.emit('cancel');
};

Form.prototype.reset = function() {
  this.children.forEach(function fn(el) {
    switch (el.type) {
      case 'screen':
        break;
      case 'box':
        break;
      case 'text':
        break;
      case 'line':
        break;
      case 'scrollable-box':
        break;
      case 'list':
        el.select(0);
        return;
      case 'form':
        break;
      case 'input':
        break;
      case 'textbox':
        el.clearInput();
        return;
      case 'textarea':
        el.clearInput();
        return;
      case 'button':
        break;
      case 'progress-bar':
        el.setProgress(0);
        break;
      case 'file-manager':
        el.refresh(el.options.cwd);
        return;
      case 'checkbox':
        el.uncheck();
        return;
      case 'radio-set':
        break;
      case 'radio-button':
        el.uncheck();
        return;
      case 'prompt':
        break;
      case 'question':
        break;
      case 'message':
        break;
      case 'info':
        break;
      case 'loading':
        break;
      case 'pick-list':
        el.select(0);
        break;
      case 'list-bar':
        //el.select(0);
        break;
      case 'dir-manager':
        el.refresh(el.options.cwd);
        return;
      case 'passbox':
        el.clearInput();
        return;
    }
    el.children.forEach(fn);
  });

  this.emit('reset');
};

/**
 * Input
 */

function Input(options) {
  if (!(this instanceof Node)) {
    return new Input(options);
  }
  options = options || {};
  Box.call(this, options);
}

Input.prototype.__proto__ = Box.prototype;

Input.prototype.type = 'input';

/**
 * Textarea
 */

function Textarea(options) {
  if (!(this instanceof Node)) {
    return new Textarea(options);
  }

  options = options || {};

  options.scrollable = options.scrollable !== false;

  Input.call(this, options);

  this.screen._listenKeys(this);

  this.value = options.value || '';

  this.__updateCursor = this._updateCursor.bind(this);
  this.on('resize', this.__updateCursor);
  this.on('move', this.__updateCursor);
  this.on('focus', this.readInput.bind(this, null));
  //this.on('prerender', this._render.bind(this));
}

Textarea.prototype.__proto__ = Input.prototype;

Textarea.prototype.type = 'textarea';

Textarea.prototype._updateCursor = function() {
  if (this.screen.focused !== this) {
    return;
  }

  var lpos = this._getCoords();
  if (!lpos) return;

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
    this._clines.length - 1 - (this.childBase || 0),
    (lpos.yl - lpos.yi) - this.iheight - 1);

  cy = lpos.yi + this.itop + line;
  cx = lpos.xi + this.ileft + last.length;

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
Textarea.prototype.setInput =
Textarea.prototype.readInput = function(callback) {
  var self = this
    , focused = this.screen.focused === this;

  // We need to maintain an array of
  // callbacks for legacy reasons.
  if (this._callback) {
    return callback ? this._callbacks.push(callback) : null;
  }

  this._callbacks = callback ? [callback] : [];

  if (!focused) {
    this.screen.saveFocus();
    this.focus();
  }

  this.screen.grabKeys = true;

  this._updateCursor();
  this.screen.program.showCursor();
  this.screen.program.sgr('normal');

  this._callback = function fn(err, value) {
    if (fn.done) return;
    fn.done = true;

    delete self._callback;

    self.removeListener('keypress', self.__listener);
    delete self.__listener;

    self.removeListener('blur', self.__callback);
    delete self.__callback;

    self.screen.program.hideCursor();
    self.screen.grabKeys = false;

    if (!focused) {
      self.screen.restoreFocus();
    }

    if (err) {
      self.emit('error', err);
    } else if (value != null) {
      self.emit('submit', value);
    } else {
      self.emit('cancel', value);
    }
    self.emit('action', value);

    self._callbacks.forEach(function(callback) {
      return err
        ? callback(err)
        : callback(null, value);
    });

    delete self._callbacks;
  };

  this.__listener = this._listener.bind(this);
  this.on('keypress', this.__listener);

  this.__callback = this._callback.bind(this, null, null);
  this.on('blur', this.__callback);
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
    callback(null, key.name === 'enter' ? value : null);
  } else if (key.name === 'backspace') {
    if (this.value.length) {
      this.value = this.value.slice(0, -1);
    }
  } else if (ch) {
    this.value += ch;
  }

  if (this.value !== value) {
    //this.setValue();
    this.screen.render();
  }
};

Textarea.prototype._typeScroll = function() {
  // XXX Workaround
  var height = this.height - this.iheight;
  if (this._clines.length - this.childBase > height) {
    //this.setContent(this.value + '\n');
    this.scroll(this._clines.length);
  }
};

Textarea.prototype.getValue = function() {
  return this.value;
};

Textarea.prototype.setValue = function(value) {
  if (value == null) {
    value = this.value;
  }
  if (this._value !== value) {
    this.value = value;
    this._value = value;
    this.setContent(this.value);
    this._typeScroll();
    this._updateCursor();
  }
};

Textarea.prototype.clearInput =
Textarea.prototype.clearValue = function() {
  return this.setValue('');
};

Textarea.prototype.submit = function() {
  return this._listener('\x1b', { name: 'escape' });
};

Textarea.prototype.cancel = function() {
  return this._listener('\x1b', { name: 'escape' });
};

Textarea.prototype._render = Box.prototype.render;
Textarea.prototype.render = function() {
  this.setValue();
  return this._render();
};

Textarea.prototype.editor =
Textarea.prototype.setEditor =
Textarea.prototype.readEditor = function(callback) {
  var self = this;
  return this.screen.readEditor({ value: this.value }, function(err, value) {
    if (err) return callback && callback(err);
    self.setValue(value);
    self.screen.render();
    return self.readInput(callback);
  });
};

/**
 * Textbox
 */

function Textbox(options) {
  var self = this;

  if (!(this instanceof Node)) {
    return new Textbox(options);
  }

  options = options || {};

  options.scrollable = false;

  Textarea.call(this, options);

  this.secret = options.secret;
  this.censor = options.censor;
}

Textbox.prototype.__proto__ = Textarea.prototype;

Textbox.prototype.type = 'textbox';

Textbox.prototype.__olistener = Textbox.prototype._listener;
Textbox.prototype._listener = function(ch, key) {
  if (key.name === 'enter') {
    this._callback(null, key.name === 'enter' ? this.value : null);
    return;
  }
  return this.__olistener(ch, key);
};

Textbox.prototype.setValue = function(value) {
  var visible, val;
  if (value == null) {
    value = this.value;
  }
  if (this._value !== value) {
    value = value.replace(/\n/g, '');
    this.value = value;
    this._value = value;
    if (this.secret) {
      this.setContent('');
    } else if (this.censor) {
      this.setContent(Array(this.value.length + 1).join('*'));
    } else {
      visible = -(this.width - this.iwidth - 1);
      val = this.value.replace(/\t/g, this.screen.tabc);
      this.setContent(val.slice(visible));
    }
    this._updateCursor();
  }
};

/**
 * Button
 */

function Button(options) {
  var self = this;

  if (!(this instanceof Node)) {
    return new Button(options);
  }

  options = options || {};

  if (options.autoFocus == null) {
    options.autoFocus = false;
  }

  Input.call(this, options);

  this.on('keypress', function(ch, key) {
    if (key.name === 'enter' || key.name === 'space') {
      self.press();
    }
  });

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
};

/**
 * ProgressBar
 */

function ProgressBar(options) {
  if (!(this instanceof Node)) {
    return new ProgressBar(options);
  }

  options = options || {};

  Input.call(this, options);

  this.filled = options.filled || 0;
  if (typeof this.filled === 'string') {
    this.filled = +this.filled.slice(0, -1);
  }
  this.value = this.filled;

  this.ch = options.ch || ' ';

  if (!this.style.bar) {
    this.style.bar = {};
    this.style.bar.fg = options.barFg;
    this.style.bar.bg = options.barBg;
  }

  this.orientation = options.orientation || 'horizontal';

  if (options.keys) {
    this.on('keypress', function(ch, key) {
      var back, forward;
      if (self.orientation === 'horizontal') {
        back = ['left', 'h'];
        forward = ['right', 'l'];
      } else if (self.orientation === 'vertical') {
        back = ['down', 'j'];
        forward = ['up', 'k'];
      }
      if (key.name === back[0] || (options.vi && key.name === back[1])) {
        self.progress(-5);
        self.screen.render();
        return;
      }
      if (key.name === forward[0] || (options.vi && key.name === forward[1])) {
        self.progress(5);
        self.screen.render();
        return;
      }
    });
  }

  if (options.mouse) {
    this.on('click', function(data) {
      var x, y, m, p;
      if (!self.lpos) return;
      if (self.orientation === 'horizontal') {
        x = data.x - self.lpos.xi;
        m = (self.lpos.xl - self.lpos.xi) - self.iwidth;
        p = x / m * 100 | 0;
      } else if (self.orientation === 'vertical') {
        y = data.y - self.lpos.yi;
        m = (self.lpos.yl - self.lpos.yi) - self.iheight;
        p = y / m * 100 | 0;
      }
      self.setProgress(p);
    });
  }

  //this.on('render', this._render.bind(this));
}

ProgressBar.prototype.__proto__ = Input.prototype;

ProgressBar.prototype.type = 'progress-bar';

ProgressBar.prototype._render = ProgressBar.prototype.render;
ProgressBar.prototype.render = function() {
  var ret = this._render();
  if (!ret) return;

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

  dattr = this.sattr(this, this.style.bar.fg, this.style.bar.bg);

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
  this.value = this.filled;
};

ProgressBar.prototype.setProgress = function(filled) {
  this.filled = 0;
  this.progress(filled);
};

ProgressBar.prototype.reset = function() {
  this.emit('reset');
  this.filled = 0;
  this.value = this.filled;
};

/**
 * FileManager
 */

function FileManager(options) {
  var self = this;

  if (!(this instanceof Node)) {
    return new FileManager(options);
  }

  options = options || {};
  options.parseTags = true;

  List.call(this, options);

  this.cwd = options.cwd || process.cwd();
  this.file = this.cwd;
  this.value = this.cwd;

  this.on('select', function(item) {
    var value = item.content.replace(/\{[^{}]+\}/g, '').replace(/@$/, '')
      , file = path.resolve(self.cwd, value);

    return fs.stat(file, function(err, stat) {
      if (err) {
        return self.emit('error', err, file);
      }
      self.file = file;
      self.value = file;
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

  var self = this;

  if (cwd) this.cwd = cwd;
  else cwd = this.cwd;

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

  if (!(this instanceof Node)) {
    return new Checkbox(options);
  }

  options = options || {};

  Input.call(this, options);

  this.text = options.content || options.text || '';
  this.checked = this.value = options.checked || false;

  this.on('keypress', function(ch, key) {
    if (key.name === 'enter' || key.name === 'space') {
      self.toggle();
      self.screen.render();
    }
  });

  if (options.mouse) {
    this.on('click', function() {
      self.toggle();
      self.screen.render();
    });
  }

  this.on('focus', function(old) {
    var lpos = self.lpos;
    if (!lpos) return;
    //self.screen.program.saveCursor();
    self.screen.program.lsaveCursor('checkbox');
    self.screen.program.cup(lpos.yi, lpos.xi + 1);
    self.screen.program.showCursor();
  });

  this.on('blur', function() {
    //self.screen.program.hideCursor();
    //self.screen.program.restoreCursor();
    self.screen.program.lrestoreCursor('checkbox', true);
  });
}

Checkbox.prototype.__proto__ = Input.prototype;

Checkbox.prototype.type = 'checkbox';

Checkbox.prototype._render = Checkbox.prototype.render;
Checkbox.prototype.render = function() {
  if (this.type === 'radio-button') {
    this.setContent('(' + (this.checked ? '*' : ' ') + ') ' + this.text);
  } else {
    this.setContent('[' + (this.checked ? 'x' : ' ') + '] ' + this.text);
  }
  return this._render();
};

Checkbox.prototype.check = function() {
  if (this.checked) return;
  this.checked = this.value = true;
  this.emit('check');
};

Checkbox.prototype.uncheck = function() {
  if (!this.checked) return;
  this.checked = this.value = false;
  this.emit('uncheck');
};

Checkbox.prototype.toggle = function() {
  return this.checked
    ? this.uncheck()
    : this.check();
};

/**
 * RadioSet
 */

function RadioSet(options) {
  if (!(this instanceof Node)) {
    return new RadioSet(options);
  }
  options = options || {};
  // Possibly inherit parent's style.
  // options.style = this.parent.style;
  Box.call(this, options);
}

RadioSet.prototype.__proto__ = Box.prototype;

RadioSet.prototype.type = 'radio-set';


/**
 * RadioButton
 */

function RadioButton(options) {
  var self = this;

  if (!(this instanceof Node)) {
    return new RadioButton(options);
  }

  options = options || {};

  Checkbox.call(this, options);

  this.on('check', function() {
    var el = self;
    while (el = el.parent) {
      if (el.type === 'radio-set'
          || el.type === 'form') break;
    }
    el = el || self.parent;
    el.forDescendants(function(el) {
      if (el.type !== 'radio-button' || el === self) {
        return;
      }
      el.uncheck();
    });
  });
}

RadioButton.prototype.__proto__ = Checkbox.prototype;

RadioButton.prototype.type = 'radio-button';

RadioButton.prototype.toggle = RadioButton.prototype.check;

/**
 * Prompt
 */

function Prompt(options) {
  var self = this;

  if (!(this instanceof Node)) {
    return new Prompt(options);
  }

  options = options || {};

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

  if (!(this instanceof Node)) {
    return new Question(options);
  }

  options = options || {};

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

  if (!(this instanceof Node)) {
    return new Message(options);
  }

  options = options || {};
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

  if (!(this instanceof Node)) {
    return new Info(options);
  }

  options = options || {};

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

  if (!(this instanceof Node)) {
    return new Loading(options);
  }

  options = options || {};

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

  if (!(this instanceof Node)) {
    return new PickList(options);
  }

  options = options || {};

  List.call(this, options);
}

PickList.prototype.__proto__ = List.prototype;

PickList.prototype.type = 'pick-list';

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

  if (!(this instanceof Node)) {
    return new Listbar(options);
  }

  options = options || {};

  this.items = [];
  this.commands = options.commands;
  this.leftBase = 0;
  this.leftOffset = 0;

  Box.call(this, options);

  if (options.commands || options.items) {
    this.setItems(options.commands || options.items);
  }

  if (options.keys) {
    this.on('keypress', function(ch, key) {
      if (key.name === 'left') {
        self.sel(-1);
        self.screen.render();
        return;
      }
      if (key.name === 'right') {
        self.sel(1);
        self.screen.render();
        return;
      }
    });
  }

  this.on('focus', function() {
    if (self.items[self.leftBase + self.leftOffset]) {
      self.items[self.leftBase + self.leftOffset].focus();
    }
  });
}

Listbar.prototype.__proto__ = Box.prototype;

Listbar.prototype.type = 'listbar';

Listbar.prototype.setOptions =
Listbar.prototype.setCommands =
Listbar.prototype.setItems = function(commands) {
  if (Array.isArray(commands)) {
    var obj = {};
    commands.forEach(function(text, i) {
      obj[text] = { prefix: i };
    });
    commands = obj;
  }

  this.items.forEach(function(el) {
    el.detach();
  });
  this.items = [];

  var self = this
    , drawn = 0;

  this.commands = commands;

  Object.keys(commands).forEach(function(name) {
    var cmd = commands[name]
      , title
      , len
      , button;

    title = (cmd.prefix ? '{light-black-fg}'
      + cmd.prefix
      + '{/light-black-fg}'
      + ':' : '')
      + name;

    len = ((cmd.prefix ? cmd.prefix + ':' : '') + name).length;

    button = new Button({
      parent: self,
      top: 0,
      left: drawn + 1,
      height: 1,
      content: title,
      width: len + 2,
      align: 'center',
      tags: true,
      mouse: true,
      style: self.style.item
    });

    self._[name] = button;
    cmd.element = button;
    self.items.push(button);

    if (cmd.callback) {
      button.on('press', cmd.callback);
      if (cmd.keys) {
        screen.key(cmd.keys, cmd.callback);
      }
    }

    drawn += len + 3;
  });

  this.select(0);
};

Listbar.prototype._render = Listbar.prototype.render;
Listbar.prototype.render = function() {
  var self = this
    , drawn = 0;

  this.items.forEach(function(el, i) {
    if (i < self.leftBase) {
      el.hide();
    } else {
      el.left = drawn + 1;
      drawn += el.width + 3;
      el.show();
    }
  });

  return this._render();
};

Listbar.prototype.select = function(offset) {
  var lpos = this._getCoords();
  if (!lpos) return;

  var self = this
    , width = lpos.xl - lpos.xi
    , drawn = 0
    , visible = 0
    , el;

  width = width - this.iwidth;

  if (offset < 0) offset = 0;
  else if (offset >= this.items.length) offset = this.items.length - 1;

  el = this.items[offset];
  if (!el) return;

  this.items.forEach(function(el, i) {
    if (i < self.leftBase) return;
    var lpos = el._getCoords();
    if (!lpos) return;
    drawn += (lpos.xl - lpos.xi) + 3;
    if (drawn <= width) visible++;
  });

  this.leftOffset = offset;

  if (this.leftOffset > visible - 1) {
    d = this.leftOffset - (visible - 1);
    this.leftOffset -= d;
    this.leftBase += d;
  } else if (this.leftOffset < 0) {
    d = this.leftOffset;
    this.leftOffset += -d;
    this.leftBase += d;
  }

  el.focus();
};

Listbar.prototype.sel = function(i) {
  this.select(this.leftBase + this.leftOffset + i);
};

/**
 * DirManager - Merge into FileManager?
 */

function DirManager(options) {
  var self = this;

  if (!(this instanceof Node)) {
    return new DirManager(options);
  }

  options = options || {};

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

  if (!(this instanceof Node)) {
    return new Passbox(options);
  }

  options = options || {};
  options.censor = true;

  Textbox.call(this, options);
}

Passbox.prototype.__proto__ = Textbox.prototype;

Passbox.prototype.type = 'passbox';

/**
 * Helpers
 */

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

var dwidthChars = new RegExp('(['
  + '\\uff01-\\uffbe'
  + '\\uffc2-\\uffc7'
  + '\\uffca-\\uffcf'
  + '\\uffd2-\\uffd7'
  + '\\uffda-\\uffdc'
  + '\\uffe0-\\uffe6'
  + '\\uffe8-\\uffee'
  + '])', 'g');

/**
 * Expose
 */

exports.Screen = exports.screen = Screen;
exports.Box = exports.box = Box;
exports.Text = exports.text = Text;
exports.Line = exports.line = Line;
exports.ScrollableBox = exports.scrollablebox = ScrollableBox;
exports.List = exports.list = List;
exports.ScrollableText = exports.scrollabletext = ScrollableText;
exports.Form = exports.form = Form;
exports.Input = exports.input = Input;
exports.Textbox = exports.textbox = Textbox;
exports.Textarea = exports.textarea = Textarea;
exports.Button = exports.button = Button;
exports.ProgressBar = exports.progressbar = ProgressBar;
exports.FileManager = exports.filemanager = FileManager;

exports.Checkbox = exports.checkbox = Checkbox;
exports.RadioSet = exports.radioset = RadioSet;
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
