var blessed = require('../')
  , screen;

screen = blessed.screen({
  dump: __dirname + '/logs/textarea.log',
  fullUnicode: true,
  warnings: true
});

var box = blessed.textarea({
  parent: screen,
  // Possibly support:
  // align: 'center',
  style: {
    bg: 'blue'
  },
  height: 'half',
  width: 'half',
  top: 'center',
  left: 'center',
  tags: true
});

screen.render();

screen.key('q', function() {
  process.exit(0);
});

screen.key('i', function() {
  box.readInput(function() {});
});

screen.key('e', function() {
  box.readEditor(function() {});
});
