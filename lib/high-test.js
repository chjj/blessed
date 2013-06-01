var blessed = require('blessed')
  , program = blessed()
  , screen;

var high = require('blessed/lib/high');

Object.keys(high).forEach(function(key) {
  blessed[key] = high[key];
});

screen = new blessed.Screen({
  program: program
});

screen.append(new blessed.Box({
  screen: screen,
  parent: screen,
  fg: 3,
  bg: 5,
  border: {
    type: 'ascii',
    fg: 1
  },
  content: 'Hello world!',
  //width: 30,
  //height: 15,
  width: '50%',
  height: '50%',
  top: 'center',
  left: 'center'
}));

program.on('keypress', function(ch, key) {
  if (key.name === 'escape' || key.name === 'q') {
    exit(0);
  }
});

program.clear();
program.alternateBuffer();
program.hideCursor();

function exit(c) {
  program.disableMouse();
  program.clear();
  program.showCursor();
  program.normalBuffer();
  return process.exit(c || 0);
}

screen.render();
