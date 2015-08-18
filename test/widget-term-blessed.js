var blessed = require('../');

var screen = blessed.screen({
  dump: __dirname + '/logs/termblessed.log',
  smartCSR: true,
  warnings: true
});

var terminal = blessed.terminal({
  parent: screen,
  // cursor: 'line',
  cursorBlink: true,
  screenKeys: false,
  top: 'center',
  left: 'center',
  width: '90%',
  height: '90%',
  border: 'line',
  handler: function() {},
  style: {
    fg: 'default',
    bg: 'default',
    focus: {
      border: {
        fg: 'green'
      }
    }
  }
});

terminal.focus();

var term = terminal.term;

var screen2 = blessed.screen({
  dump: __dirname + '/logs/termblessed2.log',
  smartCSR: true,
  warnings: true,
  input: term,
  output: term
});

var box1 = blessed.box({
  parent: screen2,
  top: 'center',
  left: 'center',
  width: 20,
  height: 10,
  border: 'line',
  content: 'Hello world'
});

screen.key('C-q', function() {
  // NOTE:
  // not necessary since screen.destroy causes terminal.term to be destroyed
  // (screen2's input and output are no longer readable/writable)
  // screen2.destroy();
  return screen.destroy();
});

screen2.render();
screen.render();
