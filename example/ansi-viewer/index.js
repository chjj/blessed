/**
 * ansi-viewer
 * ANSI art viewer for node.
 * Copyright (c) 2015, Christopher Jeffrey and contributors (MIT License).
 * https://github.com/chjj/blessed
 */

var blessed = require('../../')
  , request = require('request')
  , fs = require('fs')
  , screen;

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

screen = blessed.screen({
  smartCSR: true,
  dockBorders: true
});

var art = blessed.terminal({
  parent: screen,
  left: 0,
  top: 0,
  right: 0,
  bottom: 0,
  handler: function() {}
});

var list = blessed.list({
  parent: screen,
  label: ' {bold}{cyan-fg}ANSI Art{/cyan-fg}{/bold} (Drag Me) ',
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
  content: 'Label:',
  border: 'line',
  hidden: true
});

list.setItems(Object.keys(map));

list.on('select', function(url, selected) {
  if (list._.rendering) return;

  url = map[url.getText()];
  status.setContent(url);

  list._.rendering = true;
  loader.load('Loading...');

  request(url, function(err, res, body) {
    list._.rendering = false;
    loader.stop();

    if (err) {
      return msg.error(err.message);
    }

    if (!body) {
      return msg.error('No body.');
    }

    // Remove MCI codes:
    body = body.replace(/%[A-Z0-9]{2}/g, '');

    // Reset and write the art:
    art.term.reset();
    art.term.write(body);
    art.term.cursorHidden = true;

    screen.render();
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
