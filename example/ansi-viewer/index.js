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

// Animating ANSI art doesn't work for screenshots.
var ANIMATING = [
  'bbs/void3',
  'holiday/xmasfwks',
  'unsorted/diver',
  'unsorted/mash-chp',
  'unsorted/ryans47',
  'unsorted/xmasfwks'
];

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
        // Animating art hangs terminal during screenshot as of right now.
        if (~ANIMATING.indexOf(name)) {
          var sgr = blessed.element.prototype.screenshot.call(art,
            0 - art.ileft, art.width - art.iright,
            0 - art.itop, art.height - art.ibottom);
        } else {
          var sgr = art.screenshot();
        }
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
