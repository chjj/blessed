/**
 * bigtext.js - bigtext element for blessed
 * Copyright (c) 2013-2015, Christopher Jeffrey and contributors (MIT License).
 * https://github.com/chjj/blessed
 */

/**
 * Modules
 */

var fs = require('fs');

var Node = require('./node');
var Box = require('./box');

/**
 * BigText
 */

function BigText(options) {
  if (!(this instanceof Node)) {
    return new BigText(options);
  }
  options = options || {};
  options.font = options.font
    || __dirname + '/../../usr/fonts/ter-u14n.json';
  options.fontBold = options.font
    || __dirname + '/../../usr/fonts/ter-u14b.json';
  this.fch = options.fch;
  this.ratio = {};
  this.font = this.loadFont(options.font);
  this.fontBold = this.loadFont(options.font);
  Box.call(this, options);
  if (this.style.bold) {
    this.font = this.fontBold;
  }
}

BigText.prototype.__proto__ = Box.prototype;

BigText.prototype.type = 'bigtext';

BigText.prototype.loadFont = function(filename) {
  var self = this
    , data
    , font;

  data = JSON.parse(fs.readFileSync(filename, 'utf8'));

  this.ratio.width = data.width;
  this.ratio.height = data.height;

  function convertLetter(ch, lines) {
    var line, i;

    while (lines.length > self.ratio.height) {
      lines.shift();
      lines.pop();
    }

    lines = lines.map(function(line) {
      var chs = line.split('');
      chs = chs.map(function(ch) {
        return ch === ' ' ? 0 : 1;
      });
      while (chs.length < self.ratio.width) {
        chs.push(0);
      }
      return chs;
    });

    while (lines.length < self.ratio.height) {
      line = [];
      for (i = 0; i < self.ratio.width; i++) {
        line.push(0);
      }
      lines.push(line);
    }

    return lines;
  }

  font = Object.keys(data.glyphs).reduce(function(out, ch) {
    var lines = data.glyphs[ch].map;
    out[ch] = convertLetter(ch, lines);
    return out;
  }, {});

  delete font[' '];

  return font;
};

BigText.prototype.setContent = function(content) {
  this.content = '';
  this.text = content || '';
};

BigText.prototype.render = function() {
  if (this.position.width == null || this._shrinkWidth) {
    // if (this.width - this.iwidth < this.ratio.width * this.text.length + 1) {
      this.position.width = this.ratio.width * this.text.length + 1;
      this._shrinkWidth = true;
    // }
  }
  if (this.position.height == null || this._shrinkHeight) {
    // if (this.height - this.iheight < this.ratio.height + 0) {
      this.position.height = this.ratio.height + 0;
      this._shrinkHeight = true;
    // }
  }

  var coords = this._render();
  if (!coords) return;

  var lines = this.screen.lines
    , left = coords.xi + this.ileft
    , top = coords.yi + this.itop
    , right = coords.xl - this.iright
    , bottom = coords.yl - this.ibottom;

  var dattr = this.sattr(this.style)
    , bg = dattr & 0x1ff
    , fg = (dattr >> 9) & 0x1ff
    , flags = (dattr >> 18) & 0x1ff
    , attr = (flags << 18) | (bg << 9) | fg;

  for (var x = left, i = 0; x < right; x += this.ratio.width, i++) {
    var ch = this.text[i];
    if (!ch) break;
    var map = this.font[ch];
    if (!map) continue;
    for (var y = top; y < Math.min(bottom, top + this.ratio.height); y++) {
      if (!lines[y]) continue;
      var mline = map[y - top];
      if (!mline) continue;
      for (var mx = 0; mx < this.ratio.width; mx++) {
        var mcell = mline[mx];
        if (mcell == null) break;
        if (this.fch && this.fch !== ' ') {
          lines[y][x + mx][0] = dattr;
          lines[y][x + mx][1] = mcell === 1 ? this.fch : this.ch;
        } else {
          lines[y][x + mx][0] = mcell === 1 ? attr : dattr;
          lines[y][x + mx][1] = mcell === 1 ? ' ' : this.ch;
        }
      }
      lines[y].dirty = true;
    }
  }

  return coords;
};

/**
 * Expose
 */

module.exports = BigText;
