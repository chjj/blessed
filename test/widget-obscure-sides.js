var blessed = require('../');

var screen = blessed.screen({
  tput: true,
  smartCSR: true,
  dump: __dirname + '/logs/obscure-sides.log',
  autoPadding: true
});

var box = blessed.box({
  parent: screen,
  scrollable: true,
  alwaysScroll: true,
  bg: 'blue',
  border: {
    type: 'bg',
    ch: ' ',
    style: {
      inverse: true
    }
  },
  height: 10,
  width: 30,
  top: 'center',
  left: 'center',
  cwd: process.env.HOME,
  keys: true,
  vi: true,
  scrollbar: {
    bg: 'white',
    ch: ' '
  }
});

var child = blessed.box({
  parent: box,
  content: 'hello',
  bg: 'green',
  border_: {
    type: 'ascii'
  },
  height: 5,
  width: 20,
  top: 2,
  left: 15
});

var child2 = blessed.box({
  parent: box,
  content: 'hello',
  bg: 'green',
  border: {
    type: 'ascii'
  },
  height: 5,
  width: 20,
  top: 25,
  left: -5
});

box.focus();

screen.render();

screen.key('q', function() {
  process.exit(0);
});
