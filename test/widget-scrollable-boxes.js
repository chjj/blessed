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
  content: 'hello1\nhello2\nhello3\nhello4',
  style: {
    bg: 'red'
  },
  left: 2,
  top: 30,
  width: '50%',
  height: 6
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

box.focus();

screen.render();
