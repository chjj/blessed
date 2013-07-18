var blessed = require('../')
  , screen = blessed.screen();

var bar = blessed.listbar({
  parent: screen,
  bottom: 0,
  left: 0,
  mouse: true,
  keys: true,
  shrinkBox: true,
  style: {
    bg: 'green',
    item: {
      bg: 'red',
      hover: {
        bg: 'blue'
      },
      focus: {
        fg: 'blue'
      }
    },
  },
  items: [
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
    'ten',
    'eleven',
    'twelve',
    'thirteen',
    'fourteen',
    'fifteen'
  ]
});

bar.focus();

screen.key('q', function() {
  return process.exit(0);
});

screen.render();
