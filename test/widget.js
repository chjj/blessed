var blessed = require('blessed')
  , program = blessed()
  , screen;

program.alternateBuffer();
program.hideCursor();

screen = new blessed.Screen({
  program: program
});

screen.append(new blessed.Text({
  screen: screen,
  parent: screen,
  top: 0,
  left: 2,
  content: 'Welcome to my program'
}));

screen.append(new blessed.Line({
  screen: screen,
  parent: screen,
  orientation: 'horizontal',
  top: 1,
  left: 0,
  right: 0
}));

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

var list = new blessed.List({
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
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
    'ten'
  ]
});

screen.append(list);

list.prepend(new blessed.Text({
  screen: screen,
  parent: list,
  left: 2,
  content: ' My list '
}));

list.on('keypress', function(ch, key) {
  if (key.name === 'up') {
    list.up();
    screen.render();
    return;
  } else if (key.name === 'down') {
    list.down();
    screen.render();
    return;
  }
});

var progress = new blessed.ProgressBar({
  screen: screen,
  parent: screen,
  fg: 4,
  bg: -1,
  barBg: -1,
  barFg: 4,
  border: {
    type: 'ascii',
    fg: -1,
    bg: -1
  },
  ch: ':',
  width: '50%',
  height: 3,
  right: 0,
  bottom: 0,
  filled: 50
});

screen.append(progress);

var lorem = 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';

var stext = new blessed.ScrollableText({
  screen: screen,
  parent: screen,
  content: lorem,
  fg: 4,
  bg: -1,
  barBg: -1,
  barFg: 4,
  border: {
    type: 'ascii',
    fg: -1,
    bg: -1
  },
  width: '50%',
  height: 4,
  left: 0,
  bottom: 0
});

screen.append(stext);
stext.on('keypress', function(ch, key) {
  if (key.name === 'up') {
    stext.scroll(-1);
    screen.render();
    return;
  } else if (key.name === 'down') {
    stext.scroll(1);
    screen.render();
    return;
  }
});

screen.on('element focus', function(old, cur) {
  if (old.border) old.border.fg = 0x1ff;
  if (cur.border) cur.border.fg = 2;
  screen.render();
});

program.on('keypress', function(ch, key) {
  if (key.name === 'tab') {
    return key.shift
      ? screen.focusPrev()
      : screen.focusNext();
  }
  if (key.name === 'escape' || key.name === 'q') {
    program.disableMouse();
    program.clear();
    program.showCursor();
    program.normalBuffer();
    return process.exit(0);
  }
});

list.focus();

screen.render();

(function fill() {
  if (progress.filled === 100) progress.filled = 0;
  progress.progress(2);
  screen.render();
  setTimeout(fill, 300);
})();
