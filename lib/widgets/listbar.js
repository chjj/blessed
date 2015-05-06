/**
 * listbar.js - listbar element for blessed
 * Copyright (c) 2013-2015, Christopher Jeffrey and contributors (MIT License).
 * https://github.com/chjj/blessed
 */

/**
 * Modules
 */

var helpers = require('../helpers');

var Node = require('./node');
var Box = require('./box');

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
  this.ritems = [];
  this.commands = [];

  this.leftBase = 0;
  this.leftOffset = 0;

  this.mouse = options.mouse || false;

  Box.call(this, options);

  if (!this.style.selected) {
    this.style.selected = {};
  }

  if (!this.style.item) {
    this.style.item = {};
  }

  if (options.commands || options.items) {
    this.setItems(options.commands || options.items);
  }

  if (options.keys) {
    this.on('keypress', function(ch, key) {
      if (key.name === 'left'
          || (options.vi && key.name === 'h')
          || (key.shift && key.name === 'tab')) {
        self.moveLeft();
        self.screen.render();
        // Stop propagation if we're in a form.
        if (key.name === 'tab') return false;
        return;
      }
      if (key.name === 'right'
          || (options.vi && key.name === 'l')
          || key.name === 'tab') {
        self.moveRight();
        self.screen.render();
        // Stop propagation if we're in a form.
        if (key.name === 'tab') return false;
        return;
      }
      if (key.name === 'enter'
          || (options.vi && key.name === 'k' && !key.shift)) {
        self.emit('action', self.items[self.selected], self.selected);
        self.emit('select', self.items[self.selected], self.selected);
        var item = self.items[self.selected];
        if (item._.cmd.callback) {
          item._.cmd.callback();
        }
        self.screen.render();
        return;
      }
      if (key.name === 'escape' || (options.vi && key.name === 'q')) {
        self.emit('action');
        self.emit('cancel');
        return;
      }
    });
  }

  if (options.autoCommandKeys) {
    this.onScreenEvent('keypress', function(ch, key) {
      if (/^[0-9]$/.test(ch)) {
        var i = +ch - 1;
        if (!~i) i = 9;
        return self.selectTab(i);
      }
    });
  }

  this.on('focus', function() {
    self.select(self.selected);
  });
}

Listbar.prototype.__proto__ = Box.prototype;

Listbar.prototype.type = 'listbar';

Listbar.prototype.__defineGetter__('selected', function() {
  return this.leftBase + this.leftOffset;
});

Listbar.prototype.setItems = function(commands) {
  var self = this;

  if (!Array.isArray(commands)) {
    commands = Object.keys(commands).reduce(function(obj, key, i) {
      var cmd = commands[key]
        , cb;

      if (typeof cmd === 'function') {
        cb = cmd;
        cmd = { callback: cb };
      }

      if (cmd.text == null) cmd.text = key;
      if (cmd.prefix == null) cmd.prefix = ++i + '';

      if (cmd.text == null && cmd.callback) {
        cmd.text = cmd.callback.name;
      }

      obj.push(cmd);

      return obj;
    }, []);
  }

  this.items.forEach(function(el) {
    el.detach();
  });

  this.items = [];
  this.ritems = [];
  this.commands = [];

  commands.forEach(function(cmd) {
    self.add(cmd);
  });

  this.emit('set items');
};

Listbar.prototype.add =
Listbar.prototype.addItem =
Listbar.prototype.appendItem = function(item, callback) {
  var self = this
    , prev = this.items[this.items.length - 1]
    , drawn = prev ? prev.aleft + prev.width : 0
    , cmd
    , title
    , len;

  if (!this.screen.autoPadding) {
    drawn += this.ileft;
  }

  if (typeof item === 'object') {
    cmd = item;
    if (cmd.prefix == null) cmd.prefix = (this.items.length + 1) + '';
  }

  if (typeof item === 'string') {
    cmd = {
      prefix: (this.items.length + 1) + '',
      text: item,
      callback: callback
    };
  }

  if (typeof item === 'function') {
    cmd = {
      prefix: (this.items.length + 1) + '',
      text: item.name,
      callback: item
    };
  }

  if (cmd.keys && cmd.keys[0]) {
    cmd.prefix = cmd.keys[0];
  }

  var t = helpers.generateTags(this.style.prefix || { fg: 'lightblack' });

  title = (cmd.prefix != null ? t.open + cmd.prefix + t.close + ':' : '') + cmd.text;

  len = ((cmd.prefix != null ? cmd.prefix + ':' : '') + cmd.text).length;

  var options = {
    screen: this.screen,
    top: 0,
    left: drawn + 1,
    height: 1,
    content: title,
    width: len + 2,
    align: 'center',
    autoFocus: false,
    tags: true,
    mouse: true,
    style: helpers.merge({}, this.style.item),
    noOverflow: true
  };

  if (!this.screen.autoPadding) {
    options.top += this.itop;
    options.left += this.ileft;
  }

  ['bg', 'fg', 'bold', 'underline',
   'blink', 'inverse', 'invisible'].forEach(function(name) {
    options.style[name] = function() {
      var attr = self.items[self.selected] === el
        ? self.style.selected[name]
        : self.style.item[name];
      if (typeof attr === 'function') attr = attr(el);
      return attr;
    };
  });

  var el = new Box(options);

  this._[cmd.text] = el;
  cmd.element = el;
  el._.cmd = cmd;

  this.ritems.push(cmd.text);
  this.items.push(el);
  this.commands.push(cmd);
  this.append(el);

  if (cmd.callback) {
    if (cmd.keys) {
      this.screen.key(cmd.keys, function(ch, key) {
        self.emit('action', el, self.selected);
        self.emit('select', el, self.selected);
        if (el._.cmd.callback) {
          el._.cmd.callback();
        }
        self.select(el);
        self.screen.render();
      });
    }
  }

  if (this.items.length === 1) {
    this.select(0);
  }

  if (this.mouse) {
    el.on('click', function(data) {
      self.emit('action', el, self.selected);
      self.emit('select', el, self.selected);
      if (el._.cmd.callback) {
        el._.cmd.callback();
      }
      self.select(el);
      self.screen.render();
    });
  }

  this.emit('add item');
};

Listbar.prototype.render = function() {
  var self = this
    , drawn = 0;

  if (!this.screen.autoPadding) {
    drawn += this.ileft;
  }

  this.items.forEach(function(el, i) {
    if (i < self.leftBase) {
      el.hide();
    } else {
      el.rleft = drawn + 1;
      drawn += el.width + 2;
      el.show();
    }
  });

  return this._render();
};

Listbar.prototype.select = function(offset) {
  if (typeof offset !== 'number') {
    offset = this.items.indexOf(offset);
  }

  var lpos = this._getCoords();
  if (!lpos) return;

  var self = this
    , width = (lpos.xl - lpos.xi) - this.iwidth
    , drawn = 0
    , visible = 0
    , el;

  if (offset < 0) {
    offset = 0;
  } else if (offset >= this.items.length) {
    offset = this.items.length - 1;
  }

  el = this.items[offset];
  if (!el) return;

  this.items.forEach(function(el, i) {
    if (i < self.leftBase) return;

    var lpos = el._getCoords();
    if (!lpos) return;

    if (lpos.xl - lpos.xi <= 0) return;

    drawn += (lpos.xl - lpos.xi) + 2;

    if (drawn <= width) visible++;
  });

  var diff = offset - (this.leftBase + this.leftOffset);
  if (offset > this.leftBase + this.leftOffset) {
    if (offset > this.leftBase + visible - 1) {
      this.leftOffset = 0;
      this.leftBase = offset;
    } else {
      this.leftOffset += diff;
    }
  } else if (offset < this.leftBase + this.leftOffset) {
    diff = -diff;
    if (offset < this.leftBase) {
      this.leftOffset = 0;
      this.leftBase = offset;
    } else {
      this.leftOffset -= diff;
    }
  }

  // XXX Move `action` and `select` events here.
  this.emit('select item', el, offset);
};

Listbar.prototype.removeItem = function(child) {
  var i = typeof child !== 'number'
    ? this.items.indexOf(child)
    : child;

  if (~i && this.items[i]) {
    child = this.items.splice(i, 1)[0];
    this.ritems.splice(i, 1);
    this.commands.splice(i, 1);
    this.remove(child);
    if (i === this.selected) {
      this.select(i - 1);
    }
  }

  this.emit('remove item');
};

Listbar.prototype.move = function(offset) {
  this.select(this.selected + offset);
};

Listbar.prototype.moveLeft = function(offset) {
  this.move(-(offset || 1));
};

Listbar.prototype.moveRight = function(offset) {
  this.move(offset || 1);
};

Listbar.prototype.selectTab = function(index) {
  var item = this.items[index];
  if (item) {
    if (item._.cmd.callback) {
      item._.cmd.callback();
    }
    this.select(index);
    this.screen.render();
  }
  this.emit('select tab', item, index);
};

/**
 * Expose
 */

module.exports = Listbar;
