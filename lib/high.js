/**
 * Blessed high-level interface
 * Still in development
 */

/*
  API Example:
  This will render a box with ascii borders containing the
  text 'Hello world!', centered horizontally and vertically.

  var blessed = require('blessed')
    , program = blessed()
    , screen;

  screen = new blessed.Screen({
    program: program
  });

  screen.append(new blessed.Text({
    screen: screen,
    parent: screen,
    fg: 3,
    bg: 5,
    border: {
      type: 'ascii',
      fg: 1
    },
    content: 'Hello world!',
    top: 'center',
    left: 'center'
  }));

  program.on('keypress', function(ch, key) {
    if (key.name === 'escape') {
      process.exit(0);
    }
  });

  screen.render();
*/

/**
 * Node
 */

function Node(options) {
  this.children = options.children || [];
}

Node.prototype.prepend = function(element) {
  this.children.unshift(element);
};

Node.prototype.append = function(element) {
  this.children.push(element);
};

Node.prototype.remove = function(element) {
  var i = this.children.indexOf(element);
  if (~i) this.children.splice(i, 1);
};

Node.prototype.detach = function(element) {
  this.parent.remove(element);
};

/**
 * Screen
 */

function Screen(options) {
  var self = this;

  Node.call(this, options);

  this.children = options.children || [];
  this.program = options.program;
  this.tput = this.program.tput;
  this.dattr = ((0 << 18) | (0x1ff << 9)) | 0x1ff;
  this.position = {
    left: this.left = 0,
    right: this.right = 0,
    top: this.top = 0,
    bottom: this.bottom = 0
  };

  this.alloc();

  this.program.on('resize', function() {
    self.alloc();
    self.program.clear();
    self.render();
  });
}

Screen.prototype.__proto__ = Node.prototype;

Screen.prototype.__defineGetter__('cols', function() {
  return this.program.cols;
});

Screen.prototype.__defineGetter__('rows', function() {
  return this.program.rows;
});

Screen.prototype.__defineGetter__('width', function() {
  return this.program.cols;
});

Screen.prototype.__defineGetter__('height', function() {
  return this.program.rows;
});

Screen.prototype.alloc = function() {
  var x, y;
  this.lines = [];
  for (y = 0; y < this.rows; y++) {
    this.lines[y] = [];
    for (x = 0; x < this.cols; x++) {
      this.lines[y][x] = [this.dattr, ' '];
    }
    this.lines[y].dirty = true;
  }
};

Screen.prototype.render = function() {
  this.children.forEach(function(el) {
    el.render();
  });
  this.draw(0, this.rows - 1);
};

Screen.prototype.draw = function(start, end) {
  var x
    , y
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

    for (x = 0; x < this.cols; x++) {
      data = line[x][0];
      ch = line[x][1];

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

    //this.program.move(y + 1, 1);
    //this.program.write(out);
    this.program.write('\x1b[' + (y + 1) + ';1H' + out);
  }

  this.program.restoreCursor();
};

/**
 * Element
 */

function Element(options) {
  Node.call(this, options);
  this.screen = options.screen;
  this.parent = options.parent || (function(){throw Error('No parent.')})();
  this.position = {
    left: options.left || 0,
    right: options.right || 0,
    top: options.top || 0,
    bottom: options.bottom || 0,
    width: options.width || null,
    height: options.height || null
  };

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

Element.prototype.__defineGetter__('left', function() {
  var left = this.position.left;

/*
  if (typeof left === 'string') {
    if (left === 'center') left = '50%';
    left = +left.slice(0, -1) / 100;
    var len = Math.min(this.content.length, this.screen.cols);
    //left = (this.screen.cols - len) * left | 0;
    left = (this.parent.width - len) * left | 0;
  }
*/

  if (typeof left === 'string') {
    if (left === 'center') left = '50%';
    left = +left.slice(0, -1) / 100;
    var len = Math.min(this.width, this.screen.cols);
    //left = (this.screen.cols - len) * left | 0;
    left = (this.parent.width - len) * left | 0;
  }

  return (this.parent.left || 0) + left;
});

Element.prototype.__defineGetter__('right', function() {
  return (this.parent.right || 0) + this.position.right;
});

Element.prototype.__defineGetter__('top', function() {
  var top = this.position.top;
/*
  if (typeof top === 'string') {
    if (top === 'center') top = '50%';
    top = +top.slice(0, -1) / 100;
    //var len = Math.min(this.content.length, this.screen.cols);
    //top = (this.screen.cols - len) * top | 0;
    var len = (this.content.length - this.left) / this.screen.cols;
    //top = (this.screen.rows - len) * top | 0;
    top = (this.parent.height - len) * top | 0;
  }
*/

  if (typeof top === 'string') {
    if (top === 'center') top = '50%';
    top = +top.slice(0, -1) / 100;
    var len = Math.min(this.height, this.screen.rows);
    //top = (this.screen.rows - len) * top | 0;
    top = (this.parent.height - len) * top | 0;
  }

  return (this.parent.top || 0) + top;
});

Element.prototype.__defineGetter__('bottom', function() {
  return (this.parent.bottom || 0) + this.position.bottom;
});

Element.prototype.__defineGetter__('width', function() {
  var width = this.position.width;
  if (typeof width === 'string') {
    if (width === 'half') width = '50%';
    width = +width.slice(0, -1) / 100;
    //return this.screen.cols * width | 0;
    return this.parent.width * width | 0;
  }
  if (!width) {
    //width = this.screen.cols - this.position.right - this.position.left;
    width = this.parent.width - this.position.right - this.position.left;
    width = width || 0;
  }
  return width;
});

Element.prototype.__defineGetter__('height', function() {
  var height = this.position.height;
  if (typeof height === 'string') {
    if (height === 'half') height = '50%';
    height = +height.slice(0, -1) / 100;
    //return this.screen.rows * height | 0;
    return this.parent.height * height | 0;
  }
  if (!height) {
    //height = this.screen.rows - this.position.bottom - this.position.top;
    height = this.parent.height - this.position.bottom - this.position.top;
    height = height || 0;
  }
  return height;
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

  if (this.position.width) {
    xl = xi + this.width;
  }

  if (this.position.height) {
    yl = yi + this.height;
  }

  for (yi = this.top; yi < yl; yi++) {
    for (xi = this.left; xi < xl; xi++) {
      if (this.border && (yi === this.top || xi === this.left || yi === yl - 1 || xi === xl - 1)) {
        attr = ((this.border.bold << 18) + (this.border.underline << 18)) | (this.border.fg << 9) | this.border.bg;
        if (this.border.type === 'ascii') {
          if (yi === this.top) {
            if (xi === this.left) ch = '┌';
            else if (xi === xl - 1) ch = '┐';
            else ch = '─';
          } else if (yi === yl - 1) {
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

  if (this.position.width) {
    xl = this.width;
  }

  if (this.position.height) {
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
  this.children = [];
  this.selected = 0;

  this.selectedBg = options.selectedBg;
  this.selectedFg = options.selectedFg;
  this.selectedBold = options.selectedBold;
  this.selectedUnderline = options.selectedUnderline;

  if (options.children) {
    options.children.forEach(this.add.bind(this));
  }
}

List.prototype.__proto__ = ScrollableBox.prototype;

List.prototype.add = function(item) {
  this.append(new Text({
    screen: this.screen,
    parent: this,
    top: this.children.length,
    content: item.content,
    height: 1
  }));
};

List.prototype.select = function(index) {
  if (typeof index === 'object') {
    index = this.children.indexOf(index);
  }
  if (this.selectedBg) {
    this.children[this.selected].bg = this.bg;
    this.children[index].bg = this.selectedBg;
  }
  if (this.selectedFg) {
    this.children[this.selected].fg = this.fg;
    this.children[index].fg = this.selectedFg;
  }
  if (this.selectedBold != null) {
    this.children[this.selected].bold = this.bold;
    this.children[index].bold = this.selectedBold;
  }
  if (this.selectedUnderline != null) {
    this.children[this.selected].underline = this.underline;
    this.children[index].underline = this.selectedUnderline;
  }
  this.selected = index;

  var height = this.height;
  if (this.selected >= height) {
    this.scroll(this.selected - height);
  }
};

List.prototype.remove = function(index) {
  if (typeof index === 'object') {
    index = this.children.indexOf(index);
  }
  this.children.splice(index, 1);
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
exports.ScrollableBox = ScrollableBox;
exports.List = List;
exports.Input = Input;
exports.Textbox = Textbox;
exports.Button = Button;
