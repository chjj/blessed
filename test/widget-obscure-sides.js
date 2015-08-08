var blessed = require('../');

var screen = blessed.screen({
  tput: true,
  smartCSR: true,
  dump: __dirname + '/logs/obscure-sides.log',
  autoPadding: true,
  warnings: true
});

var box = blessed.box({
  parent: screen,
  scrollable: true,
  alwaysScroll: true,
  border: {
    type: 'bg',
    ch: ' '
  },
  style: {
    bg: 'blue',
    border: {
      inverse: true
    },
    scrollbar: {
      bg: 'white'
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
    ch: ' '
  }
});

var child = blessed.box({
  parent: box,
  content: 'hello',
  style: {
    bg: 'green'
  },
  // border: 'line',
  height: 5,
  width: 20,
  top: 2,
  left: 15
});

var child2 = blessed.box({
  parent: box,
  content: 'hello',
  style: {
    bg: 'green',
  },
  border: 'line',
  height: 5,
  width: 20,
  top: 25,
  left: -5
});

box.focus();

screen.render();

screen.key('q', function() {
  screen.destroy();
});
