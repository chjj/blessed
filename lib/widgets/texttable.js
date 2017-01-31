/**
 * texttable.js - compact text-only table element for blessed
 * Copyright (c) 2016, DeeJayy.
 * https://github.com/deejayyhu/blessed
 */

/**
 * Modules
 */

var Node = require('./node');
var Box = require('./box');
var Table = require('./table');
var helpers = require('../helpers');

/**
 * TextTable
 */

function TextTable(options) {
  var self = this;

  if (!(this instanceof Node)) {
    return new TextTable(options);
  }

  options = options || {};
  options.shrink = true;
  options.style = options.style || {};
  options.style.border = options.style.border || {};
  options.style.header = options.style.header || {};
  options.style.cell = options.style.cell || {};
  options.align = options.align || 'center';
  options.format = options.format || [];

  // Regular tables do not get custom height (this would
  // require extra padding). Maybe add in the future.
  delete options.height;

  Box.call(this, options);

  this.pad = options.pad != null
    ? options.pad
    : 2;

  this.setData(options.rows || options.data);

  this.on('attach', function() {
    self.setContent('');
    self.setData(self.rows);
  });

  this.on('resize', function() {
    self.setContent('');
    self.setData(self.rows);
    self.screen.render();
  });
}

TextTable.prototype.__proto__ = Box.prototype;

TextTable.prototype.type = 'TextTable';

TextTable.prototype._calculateMaxes = Table.prototype._calculateMaxes;

TextTable.prototype.setRows =
TextTable.prototype.setData = function(rows) {
  var self = this
    , text = ''
    , align = this.align;

  this.rows = rows || [];

  this._calculateMaxes();

  if (!this._maxes) return;

  this.rows.forEach(function(row, i) {
    var isFooter = i === self.rows.length - 1;
    var isHeader = i === 0;

    row.forEach(function(cell, i) {
      var width = self._maxes[i];
      if (self.parseTags) {
        cell = helpers.tagSubstring(cell, 0, width-1);
      } else {
        cell = cell.substring(0, width-1);
      }

      var clen = self.strWidth(cell);

      if (i !== 0) {
        text += ' ';
      }

      align = self.options.format[i] && self.options.format[i]['text-align'] ? self.options.format[i]['text-align'] : self.align;

      while (clen < width) {
        if (align === 'center') {
          cell = ' ' + cell + ' ';
          clen += 2;
        } else if (align === 'left') {
          cell = cell + ' ';
          clen += 1;
        } else if (align === 'right') {
          cell = ' ' + cell;
          clen += 1;
        }
      }

      if (clen > width) {
        if (align === 'center') {
          cell = cell.substring(1);
          clen--;
        } else if (align === 'left') {
          cell = cell.slice(0, -1);
          clen--;
        } else if (align === 'right') {
          cell = cell.substring(1);
          clen--;
        }
      }

      text += cell;
    });
    if (!isFooter) {
      text += '\n';
    }
    if (isHeader) {
      row.forEach(function(cell, i) {
        var width = self._maxes[i];
        text += '-'.repeat(width) + ' ';
      });
      text += '\n';
    }
  });

  delete this.align;
  this.setContent(text);
  this.align = align;
};

TextTable.prototype.render = function() {
  var self = this;

  var coords = this._render();
  if (!coords) return;

  this._calculateMaxes();

  if (!this._maxes) return coords;

  var lines = this.screen.lines
    , xi = coords.xi
    , yi = coords.yi
    , rx
    , ry
    , i;

  var dattr = this.sattr(this.style)
    , hattr = this.sattr(this.style.header)
    , cattr = this.sattr(this.style.cell)
    , battr = this.sattr(this.style.border);

  var width = coords.xl - coords.xi - this.iright
    , height = coords.yl - coords.yi - this.ibottom;

  // Apply attributes to header cells and cells.
  for (var y = this.itop; y < height; y++) {
    if (!lines[yi + y]) break;
    for (var x = this.ileft; x < width; x++) {
      if (!lines[yi + y][xi + x]) break;
      // Check to see if it's not the default attr. Allows for tags:
      if (lines[yi + y][xi + x][0] !== dattr) continue;
      if (y === this.itop) {
        lines[yi + y][xi + x][0] = hattr;
      } else {
        lines[yi + y][xi + x][0] = cattr;
      }
      lines[yi + y].dirty = true;
    }
  }

  if (!this.border || this.options.noCellBorders) return coords;

  // Draw border with correct angles.
  ry = 0;
  for (i = 0; i < self.rows.length + 1; i++) {
    if (!lines[yi + ry]) break;
    rx = 0;
    self._maxes.forEach(function(max, i) {
      rx += max;
      if (i === 0) {
        if (!lines[yi + ry][xi + 0]) return;
        // left side
        if (ry === 0) {
          // top
          lines[yi + ry][xi + 0][0] = battr;
          // lines[yi + ry][xi + 0][1] = '\u250c'; // '┌'
        } else if (ry / 2 === self.rows.length) {
          // bottom
          lines[yi + ry][xi + 0][0] = battr;
          // lines[yi + ry][xi + 0][1] = '\u2514'; // '└'
        }
        lines[yi + ry].dirty = true;
      } else if (i === self._maxes.length - 1) {
        if (!lines[yi + ry][xi + rx + 1]) return;
        // right side
        if (ry === 0) {
          // top
          rx++;
          lines[yi + ry][xi + rx][0] = battr;
          // lines[yi + ry][xi + rx][1] = '\u2510'; // '┐'
        } else if (ry / 2 === self.rows.length) {
          // bottom
          rx++;
          lines[yi + ry][xi + rx][0] = battr;
          // lines[yi + ry][xi + rx][1] = '\u2518'; // '┘'
        }
        lines[yi + ry].dirty = true;
        return;
      }
      if (!lines[yi + ry][xi + rx + 1]) return;
      lines[yi + ry].dirty = true;
    });
    ry += 2;
  }

  return coords;
};

/**
 * Expose
 */

module.exports = TextTable;
