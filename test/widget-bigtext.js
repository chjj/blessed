var blessed = require('../')
  , screen;

screen = blessed.screen({
  dump: __dirname + '/logs/bigtext.log',
  smartCSR: true
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
  style: {
    fg: 'red',
    bold: false
  }
});

screen.key('q', function() {
  return process.exit(0);
});

screen.render();

