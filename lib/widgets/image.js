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

  if (options.itype === 'ansi' && this.type !== 'ansiimage') {
    var ANSIImage = require('./ansiimage');
    Object.getOwnPropertyNames(ANSIImage.prototype).forEach(function(key) {
      if (key === 'type') return;
      Object.defineProperty(this, key,
        Object.getOwnPropertyDescriptor(ANSIImage.prototype, key));
    }, this);
    ANSIImage.call(this, options);
    return this;
  }

  if (options.itype === 'overlay' && this.type !== 'overlayimage') {
    var OverlayImage = require('./overlayimage');
    Object.getOwnPropertyNames(OverlayImage.prototype).forEach(function(key) {
      if (key === 'type') return;
      Object.defineProperty(this, key,
        Object.getOwnPropertyDescriptor(OverlayImage.prototype, key));
    }, this);
    OverlayImage.call(this, options);
    return this;
  }
}

Image.prototype.__proto__ = Box.prototype;

Image.prototype.type = 'image';

/**
 * Expose
 */

module.exports = Image;
