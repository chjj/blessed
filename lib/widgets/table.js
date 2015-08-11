/**
 * table.js - table element for blessed
 * Copyright (c) 2013-2015, Christopher Jeffrey and contributors (MIT License).
 * https://github.com/chjj/blessed
 */

/**
 * Modules
 */

var Node = require('./node');
var Box = require('./box');

/**
 * Table
 */

function Table(options) {
  var self = this;

  if (!(this instanceof Node)) {
    return new Table(options);
  }

  options = options || {};
  options.shrink = true;
  options.style = options.style || {};
  options.style.border = options.style.border || {};
  options.style.header = options.style.header || {};
  options.style.cell = options.style.cell || {};
  options.align = options.align || 'center';

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

Table.prototype.__proto__ = Box.prototype;

Table.prototype.type = 'table';

Table.prototype._calculateMaxes = function() {
  var self = this;
  var maxes = [];

  if (this.detached) return;

  this.rows = this.rows || [];

  this.rows.forEach(function(row) {
    row.forEach(function(cell, i) {
      var clen = self.strWidth(cell);
      if (!maxes[i] || maxes[i] < clen) {
        maxes[i] = clen;
      }
    });
  });

  var total = maxes.reduce(function(total, max) {
    return total + max;
  }, 0);
  total += maxes.length + 1;

  // XXX There might be an issue with resizing where on the first resize event
  // width appears to be less than total if it's a percentage or left/right
  // combination.
  if (this.width < total) {
    delete this.position.width;
  }

  if (this.position.width != null) {
    var missing = this.width - total;
    var w = missing / maxes.length | 0;
    var wr = missing % maxes.length;
    maxes = maxes.map(function(max, i) {
      if (i === maxes.length - 1) {
        return max + w + wr;
      }
      return max + w;
    });
  } else {
    maxes = maxes.map(function(max) {
      return max + self.pad;
    });
  }

  return this._maxes = maxes;
};

Table.prototype.setRows =
Table.prototype.setData = function(rows) {
  var self = this
    , text = ''
    , align = this.align;

  this.rows = rows || [];

  this._calculateMaxes();

  if (!this._maxes) return;

  this.rows.forEach(function(row, i) {
    var isFooter = i === self.rows.length - 1;
    row.forEach(function(cell, i) {
      var width = self._maxes[i];
      var clen = self.strWidth(cell);

      if (i !== 0) {
        text += ' ';
      }

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
      text += '\n\n';
    }
  });

  delete this.align;
  this.setContent(text);
  this.align = align;
};

Table.prototype.render = function() {
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
        } else {
          // middle
          lines[yi + ry][xi + 0][0] = battr;
          lines[yi + ry][xi + 0][1] = '\u251c'; // '├'
          // XXX If we alter iwidth and ileft for no borders - nothing should be written here
          if (!self.border.left) {
            lines[yi + ry][xi + 0][1] = '\u2500'; // '─'
          }
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
        } else {
          // middle
          rx++;
          lines[yi + ry][xi + rx][0] = battr;
          lines[yi + ry][xi + rx][1] = '\u2524'; // '┤'
          // XXX If we alter iwidth and iright for no borders - nothing should be written here
          if (!self.border.right) {
            lines[yi + ry][xi + rx][1] = '\u2500'; // '─'
          }
        }
        lines[yi + ry].dirty = true;
        return;
      }
      if (!lines[yi + ry][xi + rx + 1]) return;
      // center
      if (ry === 0) {
        // top
        rx++;
        lines[yi + ry][xi + rx][0] = battr;
        lines[yi + ry][xi + rx][1] = '\u252c'; // '┬'
        // XXX If we alter iheight and itop for no borders - nothing should be written here
        if (!self.border.top) {
          lines[yi + ry][xi + rx][1] = '\u2502'; // '│'
        }
      } else if (ry / 2 === self.rows.length) {
        // bottom
        rx++;
        lines[yi + ry][xi + rx][0] = battr;
        lines[yi + ry][xi + rx][1] = '\u2534'; // '┴'
        // XXX If we alter iheight and ibottom for no borders - nothing should be written here
        if (!self.border.bottom) {
          lines[yi + ry][xi + rx][1] = '\u2502'; // '│'
        }
      } else {
        // middle
        if (self.options.fillCellBorders) {
          var lbg = (ry <= 2 ? hattr : cattr) & 0x1ff;
          rx++;
          lines[yi + ry][xi + rx][0] = (battr & ~0x1ff) | lbg;
        } else {
          rx++;
          lines[yi + ry][xi + rx][0] = battr;
        }
        lines[yi + ry][xi + rx][1] = '\u253c'; // '┼'
        // rx++;
      }
      lines[yi + ry].dirty = true;
    });
    ry += 2;
  }

  // Draw internal borders.
  for (ry = 1; ry < self.rows.length * 2; ry++) {
    if (!lines[yi + ry]) break;
    rx = 0;
    self._maxes.slice(0, -1).forEach(function(max) {
      rx += max;
      if (!lines[yi + ry][xi + rx + 1]) return;
      if (ry % 2 !== 0) {
        if (self.options.fillCellBorders) {
          var lbg = (ry <= 2 ? hattr : cattr) & 0x1ff;
          rx++;
          lines[yi + ry][xi + rx][0] = (battr & ~0x1ff) | lbg;
        } else {
          rx++;
          lines[yi + ry][xi + rx][0] = battr;
        }
        lines[yi + ry][xi + rx][1] = '\u2502'; // '│'
        lines[yi + ry].dirty = true;
      } else {
        rx++;
      }
    });
    rx = 1;
    self._maxes.forEach(function(max) {
      while (max--) {
        if (ry % 2 === 0) {
          if (!lines[yi + ry]) break;
          if (!lines[yi + ry][xi + rx + 1]) break;
          if (self.options.fillCellBorders) {
            var lbg = (ry <= 2 ? hattr : cattr) & 0x1ff;
            lines[yi + ry][xi + rx][0] = (battr & ~0x1ff) | lbg;
          } else {
            lines[yi + ry][xi + rx][0] = battr;
          }
          lines[yi + ry][xi + rx][1] = '\u2500'; // '─'
          lines[yi + ry].dirty = true;
        }
        rx++;
      }
      rx++;
    });
  }

  return coords;
};

/**
 * Expose
 */

module.exports = Table;
