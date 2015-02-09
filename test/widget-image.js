var blessed = require('../')
  , screen;

screen = blessed.screen({
  dump: __dirname + '/logs/image.log',
  smartCSR: true
});

// To ensure our w3mimgdisplay search works:
blessed.image.w3mdisplay = '/does/not/exist';

var file = process.argv[2] || __dirname + '/test-image.png';

var image = blessed.image({
  parent: screen,
  left: 'center',
  top: 'center',
  width: 'shrink',
  height: 'shrink',
  bg: 'green'
});

setTimeout(function() {
  image.setImage(file);
  screen.render();
}, 1000);

image.focus();

screen.key('i', function() {
  screen.displayImage(file);
});

screen.key('q', function() {
  return process.exit(0);
});

screen.render();
