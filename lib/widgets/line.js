/**
 * line.js - line element for blessed
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
  };

  this.style.border = this.style;
}

Line.prototype.__proto__ = Box.prototype;

Line.prototype.type = 'line';

/**
 * Expose
 */

module.exports = Line;
