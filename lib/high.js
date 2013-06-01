/**
 * Blessed high-level interface
 * Still in development
 */

/**
 * Node
 */

function Node(options) {}

/**
 * Screen
 */

function Screen(options) {
  Node.call(this, options);
  this.cols = options.cols;
  this.rows = options.rows;
  this.children = options.children || [];
  this.program = options.program;
  this.tput = this.program.tput;
  this.lines = [];
  this.dattr = ((0 << 18) | (0x1ff << 9)) | 0x1ff;
  this.offset = {};
  var x, y;
  for (y = 0; y < this.rows; y++) {
    this.lines[y] = [];
    for (x = 0; x < this.cols; x++) {
      this.lines[y][x] = [this.dattr, ' '];
    }
    this.lines[y].dirty = true;
  }
}

Screen.prototype.__proto__ = Node.prototype;

Screen.prototype.render = function() {
  this.children.forEach(function(el) {
    el.render();
  });
  this.draw(0, this.rows - 1);
};

Screen.prototype.draw = function(start, end) {
  var x
    , y
    , i
    , line
    , out
    , ch
    , data
    , attr
    , fgColor
    , bgColor
    , flags;

  this.program.saveCursor();

  for (y = start; y <= end; y++) {
    line = this.lines[y];

    if (!line.dirty) continue;
    line.dirty = false;

    out = '';
    attr = this.dattr;

    for (i = 0; i < this.cols; i++) {
      data = line[i][0];
      ch = line[i][1];

      if (data && data !== attr) {
        if (attr !== this.dattr) {
          out += '\x1b[m';
        }
        if (data !== this.dattr) {
          out += '\x1b[';

          bgColor = data & 0x1ff;
          fgColor = (data >> 9) & 0x1ff;
          flags = data >> 18;

          // bold
          if (flags & 1) {
            out += '1;';
          }

          // underline
          if (flags & 2) {
            out += '4;';
          }

          // blink
          if (flags & 4) {
            out += '5;';
          }

          // inverse
          if (flags & 8) {
            out += '7;';
          }

          // invisible
          if (flags & 16) {
            out += '8;';
          }

          if (bgColor !== 0x1ff) {
            if (bgColor < 16) { //|| this.tput.colors <= 16) {
              if (bgColor < 8) {
                bgColor += 40;
              } else if (bgColor < 16) {
                bgColor += 100;
              }
              out += bgColor + ';';
            } else {
              out += '48;5;' + bgColor + ';';
            }
          }

          if (fgColor !== 0x1ff) {
            if (fgColor < 16) { //|| this.tput.colors <= 16) {
              if (fgColor < 8) {
                fgColor += 30;
              } else if (fgColor < 16) {
                fgColor += 90;
              }
              out += fgColor + ';';
            } else {
              out += '38;5;' + fgColor + ';';
            }
          }

          if (out[out.length-1] === ';') out = out.slice(0, -1);

          out += 'm';
        }
      }

      out += ch;
      attr = data;
    }

    if (attr && attr !== this.dattr) {
      out += '\x1b[m';
    }

    this.program.write('\x1b[' + y + ';0H' + out);
  }

  this.program.restoreCursor();
};

/**
 * Element
 */

// Example Borders:
// options.border = {
//   type: 'ascii',
//   color: 'red',
//   left: false
// };
// options.border = {
//   type: 'bg',
//   color: 'lightblack',
//   right: false,
//   width: 1
// };

function Element(options) {
  Node.call(this, options);
  this.screen = options.screen;
  this.parent = options.parent || (function(){throw Error('No parent.')})();
  this.offset = {
    left: options.left || 0,
    right: options.right || 0,
    top: options.top || 0,
    bottom: options.bottom || 0
  };
  this.width = options.width || null;
  this.height = options.height || null;

/*
  if (!this.right) {
    this.width = options.width;
  }

  if (!this.bottom) {
    this.height = options.height;
  }
*/

  this.fg = options.fg || 0x1ff;
  this.bg = options.bg || 0x1ff;
  this.bold = options.bold ? 1 : 0;
  this.underline = options.underline ? 2 : 0;

  this.fixed = options.fixed || false;
  this.border = options.border;

  this.children = options.children || [];

  this.clickable = this.clickable || false;
  this.hover = this.hover || false;

  this.content = options.content || '';
}

Element.prototype.__proto__ = Node.prototype;

Element.prototype.prepend = function(element) {
  this.children.unshift(element);
};

Element.prototype.append = function(element) {
  this.children.push(element);
};

Element.prototype.remove = function(element) {
  var i = this.children.indexOf(element);
  if (~i) this.children.splice(i, 1);
};

Element.prototype.detach = function(element) {
  this.parent.remove(element);
};

Element.prototype.__defineGetter__('left', function() {
  return (this.parent.left || 0) + this.offset.left;
});

Element.prototype.__defineGetter__('right', function() {
  return (this.parent.right || 0) + this.offset.right;
});

Element.prototype.__defineGetter__('top', function() {
  return (this.parent.top || 0) + this.offset.top;
});

Element.prototype.__defineGetter__('bottom', function() {
  return (this.parent.bottom || 0) + this.offset.bottom;
});

/**
 * Box
 */

function Box(options) {
  Element.call(this, options);
}

Box.prototype.__proto__ = Element.prototype;

Box.prototype.render = function() {
  var lines = this.screen.lines
    , xi = this.left
    , xl = this.screen.cols - this.right
    , yi = this.top
    , yl = this.screen.rows - this.bottom
    , cell
    , attr
    , ch
    , ci = 0
    , cl = this.content.length;

  if (this.width) {
    xl = this.width;
  }

  if (this.height) {
    yl = this.height;
  }

/*
  if (this.border) {
    attr = ((this.border.bold << 18) + (this.border.underline << 18)) | (this.border.fg << 9) | this.border.bg;
    if (this.border.type === 'ascii') {
      var i = xi, l = xl - 1;
      for (; i < xl; i++) {
        cell = lines[yi][i];
        ch = '─';
        if (attr !== cell[0] || ch !== cell[1]) {
          cell[0] = attr;
          cell[1] = ch;
          lines[yi].dirty = true;
        }

        cell = lines[yl - 1][i];
        ch = '─';
        if (attr !== cell[0] || ch !== cell[1]) {
          cell[0] = attr;
          cell[1] = ch;
          lines[yl - 1].dirty = true;
        }
      }

      var i = yi, l = yl - 1;
      for (; i < yl; i++) {
        cell = lines[i][xi];
        ch = '─';
        if (attr !== cell[0] || ch !== cell[1]) {
          cell[0] = attr;
          cell[1] = ch;
          lines[i].dirty = true;
        }

        cell = lines[i][xl - 1];
        ch = '─';
      }

      cell = lines[yi][xi];
      ch = '┌';
      if (attr !== cell[0] || ch !== cell[1]) {
        cell[0] = attr;
        cell[1] = ch;
        lines[yi].dirty = true;
      }

      cell = lines[yi][xl - 1];
      ch = '┐';
      if (attr !== cell[0] || ch !== cell[1]) {
        cell[0] = attr;
        cell[1] = ch;
        lines[yi].dirty = true;
      }

      cell = lines[yl - 1][xi];
      ch = '└';
      if (attr !== cell[0] || ch !== cell[1]) {
        cell[0] = attr;
        cell[1] = ch;
        lines[yl - 1].dirty = true;
      }

      cell = lines[yl - 1][xl - 1];
      ch = '┘';
      if (attr !== cell[0] || ch !== cell[1]) {
        cell[0] = attr;
        cell[1] = ch;
        lines[yl - 1].dirty = true;
      }
    } else if (this.border.type === 'bg') {
      var i = xi, l = xl - 1;
      for (; i < xl; i++) {
        cell = lines[yi][i];
        ch = ' ';
        if (attr !== cell[0] || ch !== cell[1]) {
          cell[0] = attr;
          cell[1] = ch;
          lines[yi].dirty = true;
        }

        cell = lines[yl - 1][i];
        ch = ' ';
        if (attr !== cell[0] || ch !== cell[1]) {
          cell[0] = attr;
          cell[1] = ch;
          lines[yl - 1].dirty = true;
        }
      }
      var i = yi, l = yl - 1;
      for (; i < yl; i++) {
        cell = lines[i][xi];
        ch = ' ';
        if (attr !== cell[0] || ch !== cell[1]) {
          cell[0] = attr;
          cell[1] = ch;
          lines[i].dirty = true;
        }

        cell = lines[i][xl - 1];
        ch = ' ';
        if (attr !== cell[0] || ch !== cell[1]) {
          cell[0] = attr;
          cell[1] = ch;
          lines[i].dirty = true;
        }
      }
    }
    xi++;
    yi++;
    xl--;
    yl--;
  }
*/

  for (yi = this.top; yi < yl; yi++) {
    for (xi = this.left; xi < xl; xi++) {
      if (this.border && (yi === this.top || xi === this.left || yi === yl - 1 || xi === xl - 1)) {
        attr = ((this.border.bold << 18) + (this.border.underline << 18)) | (this.border.fg << 9) | this.border.bg;
        if (this.border.type === 'ascii') {
          if (yi === this.top) {
            if (xi === this.left) ch = '┌';
            else if (xi === xl - 1) ch = '┐';
            else ch = '─';
          } else (yi === yl - 1) {
            if (xi === this.left) ch = '└';
            else if (xi === xl - 1) ch = '┘';
            else ch = '─';
          } else if (xi === this.left || xi === xl - 1) {
            ch = '│';
          }
        } else if (this.border.type === 'bg') {
          ch = ' ';
        }
      } else {
        attr = ((this.bold << 18) + (this.underline << 18)) | (this.fg << 9) | this.bg;
        ch = this.content[ci++] || ' ';
      }
      cell = lines[yi][xi];
      if (attr !== cell[0] || ch !== cell[1]) {
        lines[yi][xi][0] = attr;
        lines[yi][xi][1] = ch;
        lines[yi].dirty = true;
      }
    }
  }

  this.children.forEach(function(el) {
    el.render();
  });
};

/**
 * Text
 */

function Text(options) {
  Element.call(this, options);
}

Text.prototype.__proto__ = Element.prototype;

Text.prototype.render = function() {
  var lines = this.screen.lines
    , xi = this.left
    , xl = this.screen.cols - this.right
    , yi = this.top
    , yl = this.screen.rows - this.bottom
    , cell
    , attr
    , ch
    , ci = 0
    , cl = this.content.length;

  if (this.width) {
    xl = this.width;
  }

  if (this.height) {
    yl = this.height;
  }

  for (yi = this.top; yi < yl; yi++) {
    for (xi = this.left; xi < xl; xi++) {
      cell = lines[yi][xi];
      attr = ((this.bold << 18) + (this.underline << 18)) | (this.fg << 9) | this.bg;
      ch = this.content[ci++];
      if (!ch) break;
      if (attr !== cell[0] || ch !== cell[1]) {
        lines[yi][xi][0] = attr;
        lines[yi][xi][1] = ch;
        lines[yi].dirty = true;
      }
    }
  }
};

/**
 * ScrollableBox
 */

function ScrollableBox(options) {
  Box.call(this, options);
  this.childOffset = 0;
}

ScrollableBox.prototype.__proto__ = Box.prototype;

ScrollableBox.prototype.scroll = function(offset) {
  if (typeof offset === 'object') {
    this.childOffset = this.children.indexOf(offset);
    return;
  }
  this.childOffset += offset;
  if (this.childOffset < 0) {
    this.childOffset = 0;
  } else if (this.childOffset >= this.children.length) {
    this.childOffset = this.children.length - 1;
  }
};

ScrollableBox.prototype._render = ScrollableBox.prototype.render;
ScrollableBox.prototype.render = function() {
  var children = this.children;
  this.children = this.children.slice(this.childOffset);
  this._render();
  this.children = children;
};

/**
 * List
 */

function List(options) {
  ScrollableBox.call(this, options);
  this.items = [];
  this.selected = 0;

  this.selectedBg = options.selectedBg;
  this.selectedFg = options.selectedFg;
  this.selectedBold = options.selectedBold;
  this.selectedUnderline = options.selectedUnderline;

  if (options.items) {
    options.items.forEach(this.add.bind(this));
  }
}

List.prototype.__proto__ = ScrollableBox.prototype;

List.prototype.add = function(item) {
  this.items.push(new Text({
    screen: this.screen,
    parent: this,
    top: this.items.length,
    content: item.content,
    height: 1
  }));
};

List.prototype.select = function(index) {
  if (typeof index === 'object') {
    index = this.items.indexOf(index);
  }
  if (this.selectedBg) {
    this.items[this.selected].bg = this.bg;
    this.items[index].bg = this.selectedBg;
  }
  if (this.selectedFg) {
    this.items[this.selected].fg = this.fg;
    this.items[index].fg = this.selectedFg;
  }
  if (this.selectedBold != null) {
    this.items[this.selected].bold = this.bold;
    this.items[index].bold = this.selectedBold;
  }
  if (this.selectedUnderline != null) {
    this.items[this.selected].underline = this.underline;
    this.items[index].underline = this.selectedUnderline;
  }
  this.selected = index;
};

List.prototype.remove = function(index) {
  if (typeof index === 'object') {
    index = this.items.indexOf(index);
  }
  this.items.splice(index, 1);
};

/**
 * Input
 */

function Input(options) {
  Box.call(this, options);
}

Input.prototype.__proto__ = Box.prototype;

/**
 * Textbox
 */

function Textbox(options) {
  Input.call(this, options);
}

Textbox.prototype.__proto__ = Input.prototype;

/**
 * Button
 */

function Button(options) {
  Input.call(this, options);
}

Button.prototype.__proto__ = Input.prototype;

/**
 * Expose
 */

exports.Screen = Screen;
exports.Box = Box;
exports.Text = Text;
exports.List = List;
