var blessed = require('../')
  , screen;

screen = blessed.screen({
  dump: __dirname + '/logs/image.log',
  smartCSR: true
});

blessed.image.w3mdisplay = '/does/not/exist';

var file = process.argv[2] || __dirname + '/test-image.png';

var img = blessed.image({
  parent: screen,
  left: 'center',
  top: 'center',
  width: 'shrink',
  height: 'shrink',
  bg: 'green'
});

setTimeout(function() {
  img.setImage(file);
  screen.render();
}, 1000);

img.focus();

screen.key('i', function() {
  screen.displayImage(img.options.file);
});

screen.key('q', function() {
  return process.exit(0);
});

screen.render();
