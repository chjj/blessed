/**
 * ansi-art-viewer
 * ANSI art viewer for node.
 * Copyright (c) 2015, Christopher Jeffrey and contributors (MIT License).
 * https://github.com/chjj/blessed
 */

var blessed = require('../../')
  , request = require('request')
  , fs = require('fs')
  , screen;

// $ wget -r -o log --tries=10 'http://artscene.textfiles.com/ansi/'
// $ grep 'http.*\.ans$' log | awk '{ print $3 }' > blessed/ansi-art.list

var urls = fs.readFileSync(__dirname + '/ansi-art.list', 'utf8').trim().split('\n');

var map = urls.reduce(function(map, url) {
  map[/([^.\/]+\/[^.\/]+)\.ans$/.exec(url)[1]] = url;
  return map;
}, {});

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
  width: '40%',
  height: '40%',
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
    //transparent: true,
    item: {
      hover: {
        bg: 'blue'
      }
    },
    selected: {
      bg: 'blue',
      bold: true
    }
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
  }
});

list.setItems(Object.keys(map));

list.on('select', function(url, selected) {
  url = map[url.getText()];
  status.setContent(url);
  request(url, function(err, res, body) {
    if (err || !body) return;
    art.term.reset();
    art.term.write(body);
    art.term.cursorHidden = true;
    screen.render();
  });
});

list.select(0);
list.focus();

screen.key('q', function() {
  return process.exit(0);
});

screen.key('h', function() {
  list.toggle();
  if (list.visible) list.focus();
});

screen.render();
