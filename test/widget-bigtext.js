var blessed = require('../')
  , screen;

screen = blessed.screen({
  dump: __dirname + '/logs/bigtext.log',
  smartCSR: true,
  warnings: true
});

var box = blessed.bigtext({
  parent: screen,
  content: 'Hello',
  shrink: true,
  width: '80%',
  // height: '80%',
  height: 'shrink',
  // width: 'shrink',
  border: 'line',
  fch: ' ',
  ch: '\u2592',
  style: {
    fg: 'red',
    bg: 'blue',
    bold: false
  }
});

screen.key('q', function() {
  return screen.destroy();
});

screen.render();

