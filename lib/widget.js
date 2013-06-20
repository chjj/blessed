/**
 * Blessed high-level interface
 * Copyright (c) 2013, Christopher Jeffrey (MIT License)
 * Still under heavy development.
 */

/**
 * Modules
 */

var EventEmitter = require('events').EventEmitter;

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
  this.parent = options.parent || null; // this.screen;
  this.children = [];
  this.$ = this._ = this.data = {};

  if (this.parent) {
    this.parent.append(this);
  }

  if (!this.parent) {
    this._detached = true;
  }

  (options.children || []).forEach(this.append.bind(this));

  if (this._isScreen && !this.focused) {
    this.focused = this.children[0];
  }
}

Node.prototype.__proto__ = EventEmitter.prototype;

Node.prototype.prepend = function(element) {
  var old = element.parent;

  element.parent = this;

  if (this._isScreen && !this.focused) {
    this.focused = element;
  }

  if (!~this.children.indexOf(element)) {
    this.children.unshift(element);
  }

  element.emit('reparent', this);
  this.emit('adopt', element);

  //if (!old) {
  (function emit(el) {
    el._detached = false;
    el.emit('attach');
    if (el.children) el.children.forEach(emit);
  })(element);

  //element.emitDescendants('attach', function(el) {
  //  el._detached = false;
  //});
};

Node.prototype.append = function(element) {
  var old = element.parent;

  element.parent = this;

  if (this._isScreen && !this.focused) {
    this.focused = element;
  }

  if (!~this.children.indexOf(element)) {
    this.children.push(element);
  }

  element.emit('reparent', this);
  this.emit('adopt', element);

  //if (!old) {
  (function emit(el) {
    el._detached = false;
    el.emit('attach');
    if (el.children) el.children.forEach(emit);
  })(element);

  //element.emitDescendants('attach', function(el) {
  //  el._detached = false;
  //});
};

Node.prototype.remove = function(element) {
  element.parent = null; // this.screen;

  var i = this.children.indexOf(element);
  if (~i) {
    this.children.splice(i, 1);
  }

  if (!this._isScreen) {
    i = this.screen.clickable.indexOf(element);
    if (~i) this.screen.clickable.splice(i, 1);
    i = this.screen.input.indexOf(element);
    if (~i) this.screen.input.splice(i, 1);
  }

  if (this._isScreen && this.focused === element) {
    this.focused = this.children[0];
  }

  element.emit('reparent', null);
  this.emit('remove', element);

  (function emit(el) {
    el._detached = true;
    el.emit('detach');
    if (el.children) el.children.forEach(emit);
  })(element);

  //element.emitDescendants('detach', function(el) {
  //  el._detached = true;
  //});
};

Node.prototype.detach = function(element) {
  this.parent.remove(element);
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

  this._isScreen = true;
  this.program = options.program;
  this.tput = this.program.tput;
  this.dattr = ((0 << 18) | (0x1ff << 9)) | 0x1ff;
  this.position = {
    left: this.left = this.rleft = 0,
    right: this.right = this.rright = 0,
    top: this.top = this.rtop = 0,
    bottom: this.bottom = this.rbottom = 0
  };

  //this.focused = null;
  this.hover = null;
  this.history = [];
  this.clickable = [];
  this.input = [];
  this.grabKeys = false;
  this.lockKeys = false;

  this.alloc();

  this.program.on('resize', function() {
    self.alloc();
    self.render();
    self.emit('resize');
  });

  this.program.alternateBuffer();
  this.program.hideCursor();

  function reset() {
    if (reset.done) return;
    reset.done = true;
    self.program.clear();
    self.program.showCursor();
    self.program.normalBuffer();
    if (self._listenedMouse) {
      self.program.disableMouse();
    }
  }

  process.on('uncaughtException', function(err) {
    reset();
    if (err) console.error(err.stack + '');
    return process.exit(0);
  });

  process.on('exit', function() {
    reset();
  });

  this.on('newListener', function fn(type) {
    if (type === 'keypress' || type === 'mouse') {
      self.removeListener('newListener', fn);
      if (type === 'keypress') self._listenKeys();
      if (type === 'mouse') self._listenMouse();
    }
  });
}

Screen.global = null;

Screen.prototype.__proto__ = Node.prototype;

// TODO: Bubble events.
Screen.prototype._listenMouse = function(el) {
  var self = this;

  if (el && !~this.clickable.indexOf(el)) {
    this.clickable.push(el);
  }

  if (this._listenedMouse) return;
  this._listenedMouse = true;

  this.program.enableMouse();

  //this.on('element click', function(el) {
  //  el.focus();
  //});

  this.program.on('mouse', function(data) {
    if (self.lockKeys) return;

    var i = 0
      , left
      , top
      , width
      , height
      , el
      , set
      , ret;

    for (; i < self.clickable.length; i++) {
      el = self.clickable[i];
      if (!el.visible) continue;

      // Get the true coordinates.
      //ret = el.render(true);
      ret = el._lastPos;
      if (!ret) continue;
      left = ret.xi;
      top = ret.yi;
      width = ret.xl - ret.xi;
      height = ret.yl - ret.yi;

      // left = el.left + (el.border ? 1 : 0);
      // top = el.top + (el.border ? 1 : 0);
      // if (el.parent.childBase != null) top -= el.parent.childBase;
      // width = el.width;
      // height = el.height;

      if (data.x > left && data.x <= left + width
          && data.y > top && data.y <= top + height) {
        el.emit('mouse', data);
        self.emit('element mouse', el, data);
        if (data.action === 'mouseup') {
          el.emit('click', data);
          self.emit('element click', el, data);
        } else if (data.action === 'mousemove') {
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
        self.emit('element ' + data.action, data);
      }
    }

    if (data.action === 'mousemove' && self.hover && !set) {
      self.hover.emit('mouseout', data);
      self.emit('element mouseout', self.hover, data);
      self.hover = null;
    }

    self.emit('mouse', data);
  });
};

// TODO: Bubble events.
Screen.prototype._listenKeys = function(el) {
  var self = this;

  if (el) {
    if (!~this.input.indexOf(el)) {
      // Listen for click, but do not enable
      // mouse if it's not enabled yet.
      var lm = this._listenedMouse;
      this._listenedMouse = true;
      //this._listenMouse(el);
      el.on('click', el.focus.bind(el));
      this._listenedMouse = lm;

      this.input.push(el);
    }
  }

  if (this._listenedKeys) return;
  this._listenedKeys = true;

  this.program.on('keypress', function(ch, key) {
    if (self.lockKeys) return;
    if (~self.input.indexOf(self.focused)) {
      self.focused.emit('keypress', ch, key);
    }
    if (!self.grabKeys) {
      self.emit('keypress', ch, key);
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
  // TODO: Could possibly drop .dirty and just clear the `lines` buffer every
  // time before a screen.render. This way clearRegion doesn't have to be
  // called in arbitrary places for the sake of clearing a spot where an
  // element used to be (e.g. when an element moves or is hidden). There could
  // be some overhead though.
  // this.screen.clearRegion(0, this.cols, 0, this.rows);
  this.children.forEach(function(el) {
    el.render();
  });
  this.draw(0, this.rows - 1);
  this.emit('draw');
};

Screen.prototype.blankLine = function(ch, dirty) {
  var out = [];
  for (var y = 0; y < this.rows; y++) {
    out[y] = [];
    for (var x = 0; x < this.cols; x++) {
      out[y][x] = [this.dattr, ch || ' '];
    }
    out[y].dirty = dirty;
  }
  return out;
};

Screen.prototype.insertLine = function(n, y, top, bottom) {
  this.program.csr(top + 1, bottom + 1);
  this.program.cup(y + 1, 1);
  this.program.il(1);
  this.program.csr(1, this.height - 1 + 1);
  this.program.cup(y + 1, 1);

  if (n < 1) n = 1;

  var j = this.rows - 1 - bottom;
  j = this.rows - 1 - j + 1;

  while (n--) {
    this.lines.splice(y, 0, this.blankLine());
    this.lines.splice(j, 1);
    this.olines.splice(y, 0, this.blankLine());
    this.olines.splice(j, 1);
  }
};

Screen.prototype.deleteLine = function(n, y, top, bottom) {
  this.program.csr(top + 1, bottom + 1);
  this.program.cup(y + 1, 1);
  this.program.dl(1);
  this.program.csr(1, this.height - 1 + 1);
  this.program.cup(y + 1, 1);

  if (n < 1) n = 1;

  var j = this.rows - 1 - bottom;
  j = this.rows - 1 - j + 1;

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
            if (this.tput) {
              bgColor = this._reduceColor(bgColor);
            }
            if (bgColor < 16) {
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
            if (this.tput) {
              fgColor = this._reduceColor(fgColor);
            }
            if (fgColor < 16) {
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

    if (this.tput) {
      if (out) this.program.write(this.tput.cup(y, 0) + out);
    } else {
      if (out) this.program.write('\x1b[' + (y + 1) + ';1H' + out);
    }
  }

  this.program.restoreCursor();
};

Screen.prototype._reduceColor = function(col) {
  if (this.tput) {
    if (col >= 16 && this.tput.colors <= 16) {
      //col = Screen.ccolors[col];
      if (col >= 244) col = colors.white;
      else if (col >= 232) col = colors.black;
      else col = colors.blue;
    } else if (col >= 8 && this.tput.colors <= 8) {
      col -= 8;
    } else if (col >= 2 && this.tput.colors <= 2) {
      col %= 2;
    }
  }
  return col;
};

Screen.prototype.focus = function(offset) {
  var shown = this.input.filter(function(el) {
    return el.visible;
  });
  if (!shown || !offset) return;
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

  this.fg = convert(options.fg);
  this.bg = convert(options.bg);
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
    this.border.fg = convert(this.border.fg);
    this.border.bg = convert(this.border.bg);
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
      shrink: true
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
    } else if (type === 'keypress') {
      self.screen._listenKeys(self);
    }
  });

  this.screen.on('resize', function() {
    self.parseContent();
  });

  this.on('resize', function() {
    self.parseContent();
  });

  this.on('attach', function() {
    self.parseContent();
  });
}

Element.prototype.__proto__ = Node.prototype;

/*
Element._emit = Element.prototype.emit;
Element.prototype.emit = function(type) {
  var args = Array.prototype.slice.call(arguments)
    , ret = Element._emit.apply(this, args);

  if (this.screen) {
    args.shift();
    args.unshift(this);
    args.unshift('element ' + type);
    this.screen.emit.apply(this.screen, args);
  }

  return ret;
};
*/

Element.prototype.parseContent = function() {
  if (this.detached) return false;

  var w = this.width - (this.border ? 2 : 0);
  if (this._clines == null
      || this._clines.width !== w
      || this._clines.content !== this.content) {
    this._clines = wrapContent(this.content, w, this.parseTags, this.align);
    this._pcontent = this._clines.join('\n');
    this.emit('parsed content');
    return true;
  }

  return false;
};

Element.prototype.hide = function() {
  if (this.hidden) return;
  this.hidden = true;
  //var ret = this.render(true);
  var ret = this._lastPos;
  if (ret) {
    this.screen.clearRegion(ret.xi, ret.xl, ret.yi, ret.yl);
  }
  this.emit('hide');
  //if (this.screen.focused === this) {
  //  this.screen.focusPop();
  //  var el = this.screen.focusPop();
  //  if (el) el.focus();
  //}
};

Element.prototype.show = function() {
  if (!this.hidden) return;
  this.hidden = false;
  //this.render();
  this.emit('show');
};

Element.prototype.toggle = function() {
  return this.hidden ? this.show() : this.hide();
};

Element.prototype.focus = function() {
  //if (this.screen.grabKeys || this.screen.lockKeys) return;
  var old = this.screen.focused;
  this.screen.focused = this;
  old.emit('blur', this);
  this.emit('focus', old);
  this.screen.emit('element blur', old, this);
  this.screen.emit('element focus', old, this);
};

Element.prototype.setContent = function(content, noClear) {
  //var ret = this.render(true);
  var ret = this._lastPos;
  // TODO: Maybe simply set _pcontent with _parseTags result.
  // text = text.replace(/\x1b(?!\[[\d;]*m)/g, '');
  this.content = this._parseTags(content || '');
  this.parseContent();
  if (ret && !noClear) {
  //if (ret && !this.hidden) {
    this.screen.clearRegion(ret.xi, ret.xl, ret.yi, ret.yl);
  }
};

// Convert `{red-fg}foo{/red-fg}` to `\x1b[31mfoo\x1b[39m`.
Element.prototype._parseTags = function(text) {
  if (!this.parseTags) return text;
  var program = this.screen.program;
  return text.replace(/{(\/?)([\w\-,;!]*)}/g, function(tag, slash, color) {
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
    if (el._isScreen) return false;
    if (!el.parent) return true;
  } while (el = el.parent);
  return false;
});

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
  this.screen.clearRegion(
    this.left, this.left + this.width,
    this.top, this.top + this.height);
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
  this.screen.clearRegion(
    this.left, this.left + this.width,
    this.top, this.top + this.height);
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
  this.screen.clearRegion(
    this.left, this.left + this.width,
    this.top, this.top + this.height);
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
  this.screen.clearRegion(
    this.left, this.left + this.width,
    this.top, this.top + this.height);
  //if (this.options.bottom == null) {
  //  return this.options.top = this.position.top = this.screen.height - 1 - val;
  //}
  return this.options.bottom = this.position.bottom = val;
});

Element.prototype.__defineSetter__('width', function(val) {
  if (this.position.width === val) return;
  this.emit('resize');
  this.screen.clearRegion(
    this.left, this.left + this.width,
    this.top, this.top + this.height);
  return this.options.width = this.position.width = val;
});

Element.prototype.__defineSetter__('height', function(val) {
  if (this.position.height === val) return;
  this.emit('resize');
  this.screen.clearRegion(
    this.left, this.left + this.width,
    this.top, this.top + this.height);
  return this.options.height = this.position.height = val;
});

Element.prototype.__defineSetter__('rleft', function(val) {
  if (this.position.left === val) return;
  this.emit('move');
  this.screen.clearRegion(
    this.left, this.left + this.width,
    this.top, this.top + this.height);
  return this.options.left = this.position.left = val;
});

Element.prototype.__defineSetter__('rright', function(val) {
  if (this.position.right === val) return;
  this.emit('move');
  this.screen.clearRegion(
    this.left, this.left + this.width,
    this.top, this.top + this.height);
  //if (this.options.right == null) {
  //  return this.options.left = this.position.left = this.parent.width - 1 - val;
  //}
  return this.options.right = this.position.right = val;
});

Element.prototype.__defineSetter__('rtop', function(val) {
  if (this.position.top === val) return;
  this.emit('move');
  this.screen.clearRegion(
    this.left, this.left + this.width,
    this.top, this.top + this.height);
  return this.options.top = this.position.top = val;
});

Element.prototype.__defineSetter__('rbottom', function(val) {
  if (this.position.bottom === val) return;
  this.emit('move');
  this.screen.clearRegion(
    this.left, this.left + this.width,
    this.top, this.top + this.height);
  //if (this.options.bottom == null) {
  //  return this.options.top = this.position.top = this.parent.height - 1 - val;
  //}
  return this.options.bottom = this.position.bottom = val;
});

Element.prototype.calcShrink = function(xi_, xl, yi_, yl) {
  return [xi_, xl, yi_, yl];
};

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
    , c;

  if (this.position.width) {
    xl = xi_ + this.width;
  }

  if (this.position.height) {
    yl = yi_ + this.height;
  }

  if (this.parent.childBase != null && ~this.parent.items.indexOf(this)) {
    var rtop = this.rtop - (this.parent.border ? 1 : 0)
      , visible = this.parent.height - (this.parent.border ? 2 : 0);

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
    var hw = this._getShrinkSize(content)
      , h = hw.height
      , w = hw.width
      , xll = xl
      , yll = yl;
    if (this.options.width == null
        && (this.options.left == null
        || this.options.right == null)) {
      if (this.options.left == null && this.options.right != null) {
        xi_ = xl - w - (this.border ? 2 : 0) - this.padding;
        //xi_--; // make it one cell wider for newlines
      } else {
        xl = xi_ + w + (this.border ? 2 : 0) + this.padding;
        //xl++; // make it one cell wider for newlines
      }
    }
    if (this.options.height == null
        && (this.options.top == null
        || this.options.bottom == null)
        && this.childBase == null) {
      if (this.options.top == null && this.options.bottom != null) {
        yi_ = yl - h - (this.border ? 2 : 0) - this.padding;
      } else {
        yl = yi_ + h + (this.border ? 2 : 0) + this.padding;
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

  var ret = this._lastPos = {
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
  if (this.childBase > 0 && this._clines) {
    var cci = ci - (this._clines[this.childBase - 1].length + 1);
    for (; cci < ci; cci++) {
      if (content[cci] === '\x1b') {
        if (c = /^\x1b\[[\d;]*m/.exec(content.substring(cci))) {
          attr = attrCode(c[0], attr);
          cci += c[0].length - 1;
        }
      }
    }
  }

  if (this.border) yi_++, yl--, xi_++, xl--;

  // TODO: Fix padding.
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
          attr = attrCode(c[0], attr);
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
    el.render();
  });

  return ret;
};

/**
 * Text
 */

function Text(options) {
  options.shrink = true;
  Box.call(this, options);
}

Text.prototype.__proto__ = Box.prototype;

/**
 * Line
 */

function Line(options) {
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

  options.border = {
    type: 'bg',
    bg: convert(options.bg),
    fg: convert(options.fg),
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
  if (!(this instanceof ScrollableBox)) {
    return new ScrollableBox(options);
  }
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
  // Maybe do for lists:
  //if (this.items) visible = Math.min(this.items.length, visible);
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
  this.emit('scroll');
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
  this.selected = 0;

  this.selectedBg = convert(options.selectedBg);
  this.selectedFg = convert(options.selectedFg);
  this.selectedBold = options.selectedBold;
  this.selectedUnderline = options.selectedUnderline;
  this.selectedBlink = options.selectedBlink;
  this.selectedInverse = options.selectedInverse;
  this.selectedInvisible = options.selectedInvisible;

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
      if (key.name === 'enter' || (options.vi && key.name === 'j')) {
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
        self.down(self.childBase
          + Math.min(self.height - (self.border ? 2 : 0), this.items.length)
          - self.selected);
        self.screen.render();
        return;
      }
    });
  }

  function resize() {
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
  }

  this.screen.on('resize', resize);
  this.on('resize', resize);
}

List.prototype.__proto__ = ScrollableBox.prototype;

List.prototype.add = function(item) {
  var self = this;

  var item = new Box({
    screen: this.screen,
    fg: this.fg,
    bg: this.bg,
    content: item.content || item,
    align: this.align || 'left',
    top: this.items.length + (this.border ? 1 : 0),
    left: (this.border ? 1 : 0) + 1,
    right: (this.border ? 1 : 0) + 1,
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

List.prototype.setItems = function(items) {
  var i = 0
    , original = this.items.slice();

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

  ['bg', 'fg', 'bold', 'underline',
   'blink', 'inverse', 'invisible'].forEach(function(name) {
    if (this.items[this.selected]) {
      this.items[this.selected][name] = this[name];
    }
    this.items[index][name] = this['selected'
      + name.substring(0, 1).toUpperCase()
      + name.substring(1)];
  }, this);

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
    });
  }

  this.on('parsed content', function() {
    self._recalculateIndex();
  });
}

ScrollableText.prototype.__proto__ = ScrollableBox.prototype;

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

    max = this._clines.length - 1 - (this.height - (this.border ? 2 : 0));
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

  var max = this._clines.length - 1 - (this.height - (this.border ? 2 : 0));
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
}

Textbox.prototype.__proto__ = Input.prototype;

Textbox.prototype.setInput = function(callback) {
  var self = this;

  if (this._timeout != null) {
    clearTimeout(this._timeout);
    delete this._timeout;
  }

  this.focus();

  this.screen.grabKeys = true;

  // this.screen.program.saveCursor();
  this.screen.program.cup(
    this.top + 1 + (this.border ? 1 : 0),
    this.left + 1 + (this.border ? 1 : 0)
    + this.value.length);
  this.screen.program.showCursor();
  this.screen.program.sgr('normal');

  this._callback = function(err, value) {
    // self.screen.program.restoreCursor();
    self.screen.program.hideCursor();
    // Wait for global keypress event to fire.
    self._timeout = setTimeout(function() {
      self.screen.grabKeys = false;
    }, 1);

    //self.screen.focusPop();
    //var el = self.screen.focusPop();
    //if (el) el.focus();

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
      if (this.value.length < this.width - (this.border ? 2 : 0) - 1) {
        this.screen.program.cub();
      }
    }
  } else {
    if (ch) {
      this.value += ch;
      if (this.value.length < this.width - (this.border ? 2 : 0)) {
        this.screen.program.cuf();
      }
    }
  }

  // Maybe just use this instead of render hook:
  // Problem - user can't set .value willy nilly.
  // if (this.value !== value) {
  //   this.setContent(this.value.slice(-(this.width - (this.border ? 2 : 0) - 1)));
  // }

  this.screen.render();
};

Textbox.prototype._render = Input.prototype.render;
Textbox.prototype.render = function(stop) {
  // setContent is necessary to clear the area in case
  // .shrink is being used and the new content is smaller.
  // Could technically optimize this.
  this.setContent(this.value.slice(-(this.width - (this.border ? 2 : 0) - 1)));
  return this._render(stop);
};

Textbox.prototype.setEditor = function(callback) {
  var self = this;

  this.focus();

  self.screen.program.normalBuffer();
  self.screen.program.showCursor();

  return readEditor(function(err, value) {
    self.screen.program.alternateBuffer();
    self.screen.program.hideCursor();
    self.screen.alloc();
    self.screen.render();
    if (err) return callback(err);
    value = value.replace(/[\r\n]/g, '');
    self.value = value;
    self.setContent(value);
    //return callback(null, value);
    return self.setInput(callback);
  });
};

/**
 * Textarea
 */

function Textarea(options) {
  if (!(this instanceof Textarea)) {
    return new Textarea(options);
  }
  Input.call(this, options);
}

Textarea.prototype.__proto__ = Input.prototype;

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

  this.on('click', function() {
    self.press();
  });

  this.on('mouseover', function() {
    self.inverse = !self.options.inverse;
    self.screen.render();
  });

  this.on('mouseout', function() {
    self.inverse = self.options.inverse;
    self.screen.render();
  });
}

Button.prototype.__proto__ = Input.prototype;

Button.prototype.press = function() {
  var self = this;
  this.emit('press');
  if (this.border) {
    var color = this.border.color;
    this.border.color = 2;
    this.screen.render();
    setTimeout(function() {
      self.border.color = color;
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
  this.barFg = convert(options.barFg);
  this.barBg = convert(options.barBg);
  this.orientation = options.orientation || 'horizontal';
}

ProgressBar.prototype.__proto__ = Input.prototype;

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
 * Helpers
 */

// Convert an SGR string to our own attribute format.
function attrCode(code, cur) {
  var flags = (cur >> 18) & 0x1ff;
  var fg = (cur >> 9) & 0x1ff;
  var bg = cur & 0x1ff;
  var c, i;

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
}

function readEditor(callback) {
  var spawn = require('child_process').spawn
    , fs = require('fs')
    , editor = process.env.EDITOR || 'vi'
    , file = '/tmp/blessed.' + Math.random().toString(36);

  var write = process.stdout.write;
  process.stdout.write = function() {};

  try {
    process.stdin.pause();
  } catch (e) {
    ;
  }

  var resume = function() {
    try {
      process.stdin.resume();
    } catch (e) {
      ;
    }
    process.stdout.write = write;
  };

  var ps = spawn(editor, [file], {
    stdio: 'inherit',
    env: process.env,
    cwd: process.env.HOME
  });

  ps.on('error', function(err) {
    resume();
    return callback(err);
  });

  ps.on('exit', function(code) {
    resume();
    return fs.readFile(file, 'utf8', function(err, data) {
      return fs.unlink(file, function() {
        if (err) return callback(err);
        return callback(null, data);
      });
    });
  });
}

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

function wrapContent(content, width, tags, state) {
  var lines = content.split('\n')
    , out = [];

  if (!content) {
    out.width = width;
    out.content = content || '';
    out.push(content || '');
    return out;
  }

  lines.forEach(function(line) {
    var align = state
      , cap;

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

    var total
      , i
      , part
      , esc;

    while (line.length > width) {
      for (i = 0, total = 0; i < line.length; i++) {
        while (line[i] === '\x1b') {
          //var c = /^\x1b\[[\d;]*m/.exec(line.substring(i));
          //if (!c) { i++; break; }
          //i += c[0].length;
          while (line[i] && line[i++] !== 'm');
        }
        if (!line[i]) break;
        if (++total === width) {
          // Try to find a space to break on:
          if (line[i] !== ' ') {
            var j = i;
            while (j > i - 10 && j > 0 && line[j] !== ' ') j--;
            if (line[j] === ' ') i = j + 1;
          } else {
            i++;
          }
          break;
        }
      }

      part = line.substring(0, i - 1);
      esc = /\x1b[\[\d;]*$/.exec(part);

      if (esc) {
        part = part.slice(0, -esc[0].length);
        line = line.substring(i - 1 - esc[0].length);
        //out.push(part);
        out.push(sp(part, width, align));
      } else {
        line = line.substring(i - 1);
        //out.push(part);
        out.push(sp(part, width, align));
      }
    }

    // If only an escape code got cut off, at it to `part`.
    if (/^(?:\x1b[\[\d;]*m)+$/.test(line)) {
      out[out.length-1] += line;
      return;
    }
    //out.push(line);
    out.push(sp(line, width, align));
  });

  out.width = width;
  out.content = content;

  return out;
}

var colors = {
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

function convert(color) {
  var val = colors[color];
  if (val == null) val = color;
  if (val == null) val = -1;
  //if (typeof val === 'string') val = Screen._findColor(val);
  if (val === -1) return 0x1ff;
  return val;
}

function sattr(obj, fg, bg) {
  return ((((obj.invisible ? 16 : 0) << 18)
    | ((obj.inverse ? 8 : 0) << 18)
    | ((obj.blink ? 4 : 0) << 18)
    | ((obj.underline ? 2 : 0) << 18))
    | ((obj.bold ? 1 : 0) << 18)
    | (fg << 9))
    | bg;
}

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
exports.Textarea = Textarea;
exports.Button = Button;
exports.ProgressBar = ProgressBar;
