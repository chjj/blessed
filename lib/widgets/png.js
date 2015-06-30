/**
 * png.js - render PNGs as ANSI
 * Copyright (c) 2013-2015, Christopher Jeffrey and contributors (MIT License).
 * https://github.com/chjj/blessed
 */

/**
 * Modules
 */

var cp = require('child_process')
  , path = require('path')
  , fs = require('fs');

var helpers = require('../helpers');
var colors = require('../colors');

var Node = require('./node');
var Box = require('./box');

var tng = require('../../vendor/tng');

/**
 * PNG
 */

function PNG(options) {
  var self = this;

  if (!(this instanceof Node)) {
    return new PNG(options);
  }

  options = options || {};
  options.shrink = true;

  Box.call(this, options);

  this.scale = this.options.scale || 1.0;
  this.options.animate = this.options.animate !== false;
  this._noFill = true;

  if (this.options.file) {
    this.setImage(this.options.file);
  }

  this.screen.on('prerender', function() {
    var lpos = self.lpos;
    if (!lpos) return;
    // prevent image from blending with itself if there are alpha channels
    self.screen.clearRegion(lpos.xi, lpos.xl, lpos.yi, lpos.yl);
  });
}

PNG.prototype.__proto__ = Box.prototype;

PNG.prototype.type = 'png';

PNG.curl = function(url) {
  try {
    return cp.execFileSync('curl',
      ['-s', '-A', '', url],
      { stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) {
    ;
  }
  try {
    return cp.execFileSync('wget',
      ['-U', '', '-O', '-', url],
      { stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) {
    ;
  }
  throw new Error('curl or wget failed.');
};

PNG.prototype.setImage = function(file) {
  var self = this;
  this.file = typeof file === 'string' ? file : null;
  if (/^https?:/.test(file)) {
    file = PNG.curl(file);
  }
  var width = this.position.width;
  var height = this.position.height;
  if (width != null) {
    width = this.width;
  }
  if (height != null) {
    height = this.height;
  }
  try {
    this.setContent('');
    this.img = tng(file, {
      colors: colors,
      width: width,
      height: height,
      scale: this.scale,
      ascii: this.options.ascii,
      speed: this.options.speed,
      filename: this.file
    });
    if (width == null || height == null) {
      this.width = this.img.cellmap[0].length;
      this.height = this.img.cellmap.length;
    }
    if (this.img.frames && this.options.animate) {
      this.img.play(function(bmp, cellmap) {
        self.cellmap = cellmap;
        self.screen.render();
      });
    } else {
      self.cellmap = self.img.cellmap;
    }
  } catch (e) {
    this.setContent('PNG Error: ' + e.message);
    this.img = null;
    this.cellmap = null;
  }
};

PNG.prototype.clearImage = function() {
  this.setContent('');
  this.img = null;
  this.cellmap = null;
};

PNG.prototype.render = function() {
  var self = this;

  var coords = this._render();
  if (!coords) return;

  if (this.img) {
    this.img.renderElement(this.cellmap, this);
  }

  return coords;
};

/**
 * Expose
 */

module.exports = PNG;
