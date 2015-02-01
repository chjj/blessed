var blessed = require('../')
  , screen;

screen = blessed.screen({
  dump: __dirname + '/logs/image.log',
  smartCSR: true
});

var img = blessed.image({
  parent: screen,
  left: 'center',
  top: 'center',
  width: 'shrink',
  height: 'shrink',
  bg: 'green',
  file: process.argv[2] || __dirname + '/test-image.png'
});

img.focus();

screen.key('q', function() {
  return process.exit(0);
});

screen.render();
