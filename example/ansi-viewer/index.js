/**
 * ansi-viewer
 * ANSI art viewer for node.
 * Copyright (c) 2015, Christopher Jeffrey and contributors (MIT License).
 * https://github.com/chjj/blessed
 */

var blessed = require('blessed')
  , request = require('request')
  , fs = require('fs')
  , cp = require('child_process')
  , singlebyte = require('./singlebyte');

// $ wget -r -o log --tries=10 'http://artscene.textfiles.com/ansi/'
// $ grep 'http.*\.ans$' log | awk '{ print $3 }' > ansi-art.list

var urls = fs.readFileSync(__dirname + '/ansi-art.list', 'utf8').trim().split('\n');

var map = urls.reduce(function(map, url) {
  map[/([^.\/]+\/[^.\/]+)\.ans$/.exec(url)[1]] = url;
  return map;
}, {});

var max = Object.keys(map).reduce(function(out, text) {
  return Math.max(out, text.length);
}, 0) + 6;

var screen = blessed.screen({
  smartCSR: true,
  dockBorders: true
});

var art = blessed.terminal({
  parent: screen,
  left: 0,
  top: 0,
  height: 60,
  // some are 78/80, some are 80/82
  width: 82,
  border: 'line',
  tags: true,
  label: ' {bold}{cyan-fg}ANSI Art{/cyan-fg}{/bold} (Drag Me) ',
  handler: function() {},
  draggable: true
});

var list = blessed.list({
  parent: screen,
  label: ' {bold}{cyan-fg}Art List{/cyan-fg}{/bold} (Drag Me) ',
  tags: true,
  draggable: true,
  top: 0,
  right: 0,
  width: max,
  height: '50%',
  keys: true,
  vi: true,
  mouse: true,
  border: 'line',
  scrollbar: {
    ch: ' ',
    track: {
      bg: 'cyan'
    },
    style: {
      inverse: true
    }
  },
  style: {
    item: {
      hover: {
        bg: 'blue'
      }
    },
    selected: {
      bg: 'blue',
      bold: true
    }
  },
  search: function(callback) {
    prompt.input('Search:', '', function(err, value) {
      if (err) return;
      return callback(null, value);
    });
  }
});

var status = blessed.box({
  parent: screen,
  bottom: 0,
  right: 0,
  height: 1,
  width: 'shrink',
  style: {
    bg: 'blue'
  },
  content: 'Select your piece of ANSI art (`/` to search).'
});

var loader = blessed.loading({
  parent: screen,
  top: 'center',
  left: 'center',
  height: 5,
  align: 'center',
  width: '50%',
  tags: true,
  hidden: true,
  border: 'line'
});

var msg = blessed.message({
  parent: screen,
  top: 'center',
  left: 'center',
  height: 'shrink',
  width: '50%',
  align: 'center',
  tags: true,
  hidden: true,
  border: 'line'
});

var prompt = blessed.prompt({
  parent: screen,
  top: 'center',
  left: 'center',
  height: 'shrink',
  width: 'shrink',
  keys: true,
  vi: true,
  mouse: true,
  tags: true,
  border: 'line',
  hidden: true
});

list.setItems(Object.keys(map));

list.on('select', function(el, selected) {
  if (list._.rendering) return;

  var name = el.getText();
  var url = map[name];

  status.setContent(url);

  list._.rendering = true;
  loader.load('Loading...');

  request({
    uri: url,
    encoding: null
  }, function(err, res, body) {
    list._.rendering = false;
    loader.stop();

    if (err) {
      return msg.error(err.message);
    }

    if (!body) {
      return msg.error('No body.');
    }

    return cp437ToUtf8(body, function(err, body) {
      if (err) {
        return msg.error(err.message);
      }

      if (process.argv[2] === '--debug') {
        var filename = name.replace(/\//g, '.') + '.ans';
        fs.writeFileSync(__dirname + '/' + filename, body);
      }

      // Remove text:
      body = body.replace('Downloaded From P-80 International Information Systems 304-744-2253', '');

      // Remove MCI codes:
      body = body.replace(/%[A-Z0-9]{2}/g, '');

      // ^A (SOH) seems to need to produce CRLF in some cases??
      // body = body.replace(/\x01/g, '\r\n');

      // Reset and write the art:
      art.term.reset();
      art.term.write(body);
      art.term.cursorHidden = true;

      screen.render();

      if (process.argv[2] === '--debug' || process.argv[2] === '--save') {
        //var sgr = blessed.element.prototype.screenshot.call(art,
        //  0 - art.ileft, art.width - art.iright,
        //  0 - art.itop, art.height - art.ibottom);
        var sgr = art.screenshot();
        fs.writeFileSync(__dirname + '/' + filename + '.sgr', sgr);
      }
    });
  });
});

list.focus();

screen.key('q', function() {
  return process.exit(0);
});

screen.key('h', function() {
  list.toggle();
  if (list.visible) list.focus();
});

screen.render();

/**
 * Helpers
 */

// https://github.com/chjj/blessed/issues/127
// https://github.com/Mithgol/node-singlebyte

function cp437ToUtf8(buf, callback) {
  try {
    return callback(null, singlebyte.bufToStr(buf, 'cp437'));
  } catch (e) {
    return callback(e);
  }
}

blessed.Element.prototype.screenshot = function(xi, xl, yi, yl) {
  xi = this.lpos.xi + this.ileft + (xi || 0);
  if (xl != null) {
    xl = this.lpos.xi + this.ileft + (xl || 0);
  } else {
    xl = this.lpos.xl - this.iright;
  }
  yi = this.lpos.yi + this.itop + (yi || 0);
  if (yl != null) {
    yl = this.lpos.yi + this.itop + (yl || 0);
  } else {
    yl = this.lpos.yl - this.ibottom;
  }
  return this.screen.screenshot(xi, xl, yi, yl);
};

blessed.Terminal.prototype.screenshot = function(xi, xl, yi, yl) {
  xi = 0 + (xi || 0);
  if (xl != null) {
    xl = 0 + (xl || 0);
  } else {
    xl = this.term.lines[0].length;
  }
  yi = 0 + (yi || 0);
  if (yl != null) {
    yl = 0 + (yl || 0);
  } else {
    yl = this.term.lines.length;
  }
  return this.screen.screenshot(xi, xl, yi, yl, this.term);
};

blessed.Screen.prototype.screenshot = function(xi, xl, yi, yl, term) {
  if (xi == null) xi = 0;
  if (xl == null) xl = this.lpos.xl;
  if (yi == null) yi = 0;
  if (yl == null) yl = this.lpos.yl;

  var x
    , y
    , line
    , out
    , ch
    , data
    , attr
    , cwid
    , point;

  var sdattr = this.dattr;
  if (term) {
    this.dattr = term.defAttr;
    // default foreground = 257
    if (((this.dattr >> 9) & 0x1ff) === 257) {
      this.dattr &= ~(0x1ff << 9);
      this.dattr |= ((sdattr >> 9) & 0x1ff) << 9;
    }
    // default background = 256
    if ((this.dattr & 0x1ff) === 256) {
      this.dattr &= ~0x1ff;
      this.dattr |= sdattr & 0x1ff;
    }
  }

  var main = '';

  var acs;

  for (y = yi; y < yl; y++) {
    line = term
      ? term.lines[y]
      : this.lines[y];

    if (!line) break;

    out = '';
    attr = this.dattr;

    for (x = xi; x < xl; x++) {
      if (!line[x]) break;

      data = line[x][0];
      ch = line[x][1];

      if (term) {
        // default foreground = 257
        if (((data >> 9) & 0x1ff) === 257) {
          data &= ~(0x1ff << 9);
          data |= ((sdattr >> 9) & 0x1ff) << 9;
        }
        // default background = 256
        if ((data & 0x1ff) === 256) {
          data &= ~0x1ff;
          data |= sdattr & 0x1ff;
        }
      }

      if (data !== attr) {
        if (attr !== this.dattr) {
          out += '\x1b[m';
        }
        if (data !== this.dattr) {
          out += screen.codeAttr(data);
        }
      }

      if (this.fullUnicode) {
        point = blessed.unicode.codePointAt(line[x][1], 0);
        if (point <= 0x00ffff) {
          cwid = blessed.unicode.charWidth(point);
          if (cwid === 2) {
            if (x === xl - 1) {
              ch = ' ';
            } else {
              x++;
            }
          }
        }
      }

      /*
      if (this.tput.strings.enter_alt_charset_mode
          && !this.tput.brokenACS && (this.tput.acscr[ch] || acs)) {
        if (this.tput.acscr[ch]) {
          if (acs) {
            ch = this.tput.acscr[ch];
          } else {
            ch = this.tput.smacs()
              + this.tput.acscr[ch];
            acs = true;
          }
        } else if (acs) {
          ch = this.tput.rmacs() + ch;
          acs = false;
        }
      } else {
        if (!this.tput.unicode && this.tput.numbers.U8 !== 1 && ch > '~') {
          ch = this.tput.utoa[ch] || '?';
        }
      }
      */

      out += ch;
      attr = data;
    }

    if (attr !== this.dattr) {
      out += '\x1b[m';
    }

    if (out) {
      main += (y > 0 ? '\n' : '') + out;
    }
  }

  /*
  if (acs) {
    main += this.tput.rmacs();
    acs = false;
  }
  */

  main = main.replace(/(?:\s*\x1b\[40m\s*\x1b\[m\s*)*$/, '') + '\n';

  if (term) {
    this.dattr = sdattr;
  }

  return main;
};
