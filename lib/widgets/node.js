/**
 * node.js - base abstract node for blessed
 * Copyright (c) 2013-2015, Christopher Jeffrey and contributors (MIT License).
 * https://github.com/chjj/blessed
 */

/**
 * Modules
 */

var EventEmitter = require('../events').EventEmitter;

var helpers = require('../helpers');

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
    || require('./screen').global
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

  element.clearPos();

  element.parent = null;

  this.children.splice(i, 1);

  i = this.screen.clickable.indexOf(element);
  if (~i) this.screen.clickable.splice(i, 1);
  i = this.screen.keyable.indexOf(element);
  if (~i) this.screen.keyable.splice(i, 1);

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

  if (typeof args[args.length - 1] === 'function') {
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

  if (typeof args[args.length - 1] === 'function') {
    iter = args.pop();
  }

  return this.forAncestors(function(el) {
    if (iter) iter(el);
    el.emit.apply(el, args);
  }, true);
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
 * Expose
 */

module.exports = Node;
