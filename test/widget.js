var blessed = require('blessed')
  , program = blessed();

var screen = new blessed.Screen({
  program: program
});

screen.append(new blessed.Text({
  top: 0,
  left: 2,
  content: 'Welcome to my program'
}));

screen.append(new blessed.Line({
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
  mouse: true,
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
list.select(0);

list.prepend(new blessed.Text({
  left: 2,
  content: ' My list '
}));

list.on('keypress', function(ch, key) {
  if (key.name === 'up' || key.name === 'k') {
    list.up();
    screen.render();
    return;
  } else if (key.name === 'down' || key.name === 'j') {
    list.down();
    screen.render();
    return;
  }
});

list.on('click', function() {
  list.focus();
});

var progress = new blessed.ProgressBar({
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

var lorem = 'Lorem ipsum \x1b[41mdolor sit amet, \nconsectetur adipisicing elit, \x1b[43msed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';

var lorem = require('fs').readFileSync(__dirname + '/../t.log', 'utf8');

//lorem = lorem.replace(/\x1b[^m]*m/g, '');

var stext = new blessed.ScrollableText({
  mouse: true,
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
  //height: 4,
  height: 6,
  left: 0,
  bottom: 0
});

stext.on('click', function() {
  stext.focus();
});

screen.append(stext);
stext.on('keypress', function(ch, key) {
  if (key.name === 'up' || key.name === 'k') {
    stext.scroll(-1);
    screen.render();
    return;
  } else if (key.name === 'down' || key.name === 'j') {
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
    return process.exit(0);
  }
});

list.focus();

screen.render();

setInterval(function() {
  stext.toggle();
  screen.render();
}, 1000);

(function fill() {
  if (progress.filled === 100) progress.filled = 0;
  progress.progress(2);
  screen.render();
  setTimeout(fill, 300);
})();
