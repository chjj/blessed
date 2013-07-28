var blessed = require('../')
  , screen;

screen = blessed.screen({
  dump: __dirname + '/logs/textarea.log'
});

var box = blessed.textarea({
  parent: screen,
  // Possibly support:
  // align: 'center',
  bg: 'blue',
  height: 'half',
  width: 'half',
  top: 'center',
  left: 'center'
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
