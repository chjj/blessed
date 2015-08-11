/**
 * image.js - image element for blessed
 * Copyright (c) 2013-2015, Christopher Jeffrey and contributors (MIT License).
 * https://github.com/chjj/blessed
 */

/**
 * Modules
 */

var Node = require('./node');
var Box = require('./box');

/**
 * Image
 */

function Image(options) {
  if (!(this instanceof Node)) {
    return new Image(options);
  }

  options = options || {};
  options.type = options.itype || options.type || 'ansi';

  Box.call(this, options);

  if (options.type === 'ansi' && this.type !== 'ansiimage') {
    var ANSIImage = require('./ansiimage');
    Object.getOwnPropertyNames(ANSIImage.prototype).forEach(function(key) {
      if (key === 'type') return;
      Object.defineProperty(this, key,
        Object.getOwnPropertyDescriptor(ANSIImage.prototype, key));
    }, this);
    ANSIImage.call(this, options);
    return this;
  }

  if (options.type === 'overlay' && this.type !== 'overlayimage') {
    var OverlayImage = require('./overlayimage');
    Object.getOwnPropertyNames(OverlayImage.prototype).forEach(function(key) {
      if (key === 'type') return;
      Object.defineProperty(this, key,
        Object.getOwnPropertyDescriptor(OverlayImage.prototype, key));
    }, this);
    OverlayImage.call(this, options);
    return this;
  }

  throw new Error('`type` must either be `ansi` or `overlay`.');
}

Image.prototype.__proto__ = Box.prototype;

Image.prototype.type = 'image';

/**
 * Expose
 */

module.exports = Image;
