var blessed = require('blessed');

var screen = blessed.screen({
  tput: true
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
