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

/*
screen.append(new blessed.Box({
  screen: screen,
  parent: screen,
  fg: 4,
  bg: -1,
  border: {
    type: 'ascii',
    fg: -1,
    bg: -1
  },
  content: 'Hello world!',
  width: '50%',
  height: '50%',
  top: 'center',
  left: 'center'
}));

screen.children[0].append(new blessed.Box({
  screen: screen,
  parent: screen.children[0],
  fg: 4,
  bg: 3,
  border: {
    type: 'bg',
    fg: 0,
    bg: 1,
    ch: '/'
  },
  content: 'Foobar',
  width: '50%',
  height: '50%',
  top: 'center',
  left: 'center'
}));
*/

screen.append(new blessed.List({
  screen: screen,
  parent: screen,
  fg: 4,
  bg: -1,
  border: {
    type: 'ascii',
    fg: -1,
    bg: -1
  },
  width: '50%',
  height: '50%',
  top: 'center',
  left: 'center',
  selectedBg: 2,
  items: [
    { content: 'one' },
    { content: 'two' },
    { content: 'three' },
    { content: 'four' }
  ]
}));

program.on('keypress', function(ch, key) {
  if (key.name === 'escape' || key.name === 'q') {
    program.disableMouse();
    program.clear();
    program.showCursor();
    program.normalBuffer();
    return process.exit(0);
  }
});

program.alternateBuffer();
program.hideCursor();

screen.render();
