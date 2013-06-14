var blessed = require('blessed')
  , program = blessed({ tput: true });

var screen = new blessed.Screen({
  program: program
});

screen.append(new blessed.Text({
  top: 0,
  left: 2,
  width: '100%',
  content: 'Welcome to my program',
  align: 'center'
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
  align: 'center',
  mouse: true,
  fg: 'blue',
  bg: 'default',
  border: {
    type: 'ascii',
    fg: 'default',
    bg: 'default'
  },
  width: '50%',
  height: '50%',
  top: 'center',
  left: 'center',
  selectedBg: 'green',
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

var progress = new blessed.ProgressBar({
  fg: 'blue',
  bg: 'default',
  barBg: 'default',
  barFg: 'blue',
  border: {
    type: 'ascii',
    fg: 'default',
    bg: 'default'
  },
  ch: ':',
  //orientation: 'vertical',
  //height: 10,
  //width: 3,
  width: '50%',
  height: 3,
  right: 0,
  bottom: 0,
  filled: 50
});

screen.append(progress);

var lorem = 'Lorem ipsum \x1b[41mdolor sit amet, \nconsectetur adipisicing elit, \x1b[43msed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';

var lorem = require('fs').readFileSync(__dirname + '/git.diff', 'utf8');

//lorem = lorem.replace(/\x1b[^m]*m/g, '');

var stext = new blessed.ScrollableText({
  //padding: 1,
  mouse: true,
  content: lorem,
  fg: 'blue',
  bg: 'default',
  barBg: 'default',
  barFg: 'blue',
  border: {
    type: 'ascii',
    fg: 'default',
    bg: 'default'
  },
  width: '50%',
  //height: 4,
  height: 6,
  left: 0,
  bottom: 0
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

var input = new blessed.Textbox({
  mouse: true,
  label: ' My Input ',
  content: '',
  fg: 'blue',
  bg: 'default',
  barBg: 'default',
  barFg: 'blue',
  border: {
    type: 'ascii',
    fg: 'default',
    bg: 'default'
  },
  width: '30%',
  height: 3,
  right: 0,
  top: 2
});

screen.append(input);

screen.on('keypress', function(ch, key) {
  if (key.name === 'tab') {
    return key.shift
      ? screen.focusPrev()
      : screen.focusNext();
  }
  if (key.name === 'i') {
    return input.setInput(function(err, value) {
      if (value) screen.children[0].setContent(value);
    });
  }
  if (key.name === 'e') {
    return input.setEditor(function(err, value) {
      if (value) screen.children[0].setContent(value);
    });
  }
  if (key.name === 'escape' || key.name === 'q') {
    return process.exit(0);
  }
});

list.focus();

//screen.on('element click', function(el) {
//  el.focus();
//});

screen.render();

setInterval(function() {
  progress.toggle();
  screen.render();
}, 2000);

(function fill() {
  if (progress.filled === 100) {
    progress.reset();
  }
  progress.progress(2);
  screen.render();
  setTimeout(fill, 300);
  progress.top -= 2;
})();
