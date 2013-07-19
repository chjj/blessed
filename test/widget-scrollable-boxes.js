var blessed = require('../')
  , screen = blessed.screen();

var box = blessed.scrollablebox({
//var box = blessed.scrollabletext({
  parent: screen,
  left: 'center',
  top: 'center',
  width: '80%',
  height: '80%',
  bg: 'green',
  border: {
    type: 'ascii'
  },
  content: 'foobar',
  keys: true,
  vi: true,
  alwaysScroll: true,
  scrollbar: {
    ch: ' ',
    inverse: true
  }
});

var text = blessed.box({
  parent: box,
  content: 'hello',
  style: {
    bg: 'red'
  },
  left: 2,
  top: 30,
  width: '50%',
  height: 4
});

var text2 = blessed.box({
  parent: box,
  content: 'world',
  style: {
    bg: 'red'
  },
  left: 2,
  top: 50,
  width: '50%',
  height: 3
});

screen.key('q', function() {
  return process.exit(0);
});

box.on('keypress', function(ch, key) {
  if (key.name === 'up' || key.name === 'k') {
    box.scroll(-1);
    screen.render();
    return;
  }
  if (key.name === 'down' || key.name === 'j') {
    box.scroll(1);
    screen.render();
    return;
  }
});

box.focus();

screen.render();
