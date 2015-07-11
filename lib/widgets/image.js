/**
 * image.js - image element for blessed
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
 * Image
 */

function Image(options) {
  var self = this;

  if (!(this instanceof Node)) {
    return new Image(options);
  }

  options = options || {};
  options.itype = options.itype || 'ansi';

  Box.call(this, options);

  if (options.itype === 'ansi' && this.type !== 'png') {
    var PNG = require('./png');
    Object.getOwnPropertyNames(PNG.prototype).forEach(function(key) {
      if (key === 'type') return;
      Object.defineProperty(this, key,
        Object.getOwnPropertyDescriptor(PNG.prototype, key));
    }, this);
    PNG.call(this, options);
    return this;
  }

  if (options.itype === 'w3m' && this.type !== 'w3mimage') {
    var W3MImage = require('./w3mimage');
    Object.getOwnPropertyNames(W3MImage.prototype).forEach(function(key) {
      if (key === 'type') return;
      Object.defineProperty(this, key,
        Object.getOwnPropertyDescriptor(W3MImage.prototype, key));
    }, this);
    W3MImage.call(this, options);
    return this;
  }
}

Image.prototype.__proto__ = Box.prototype;

Image.prototype.type = 'image';

/**
 * Expose
 */

module.exports = Image;
