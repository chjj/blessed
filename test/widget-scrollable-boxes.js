var blessed = require('../')
  , screen;

screen = blessed.screen({
  dump: __dirname + '/logs/scrollable-boxes.log',
  smartCSR: true,
  warnings: true
});

var box = blessed.box({
  parent: screen,
  //padding: 2,
  scrollable: true,
  left: 'center',
  top: 'center',
  width: '80%',
  height: '80%',
  style: {
    bg: 'green'
  },
  border: 'line',
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
  padding: 2,
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
  padding: 1,
  style: {
    bg: 'red'
  },
  left: 2,
  top: 50,
  width: '50%',
  height: 3
});

var box2 = blessed.box({
  parent: box,
  scrollable: true,
  content: 'foo-one\nfoo-two\nfoo-three',
  padding: 2,
  left: 'center',
  top: 20,
  width: '80%',
  height: 9,
  border: 'line',
  style: {
    bg: 'magenta',
    focus: {
      bg: 'blue'
    },
    hover: {
      bg: 'red'
    }
    // scrollbar: {
    //   inverse: true
    // }
  },
  keys: true,
  vi: true,
  alwaysScroll: true
  // scrollbar: {
  //   ch: ' '
  // }
});

var box3 = blessed.box({
  parent: box2,
  scrollable: true,
  //content: 'foo1\nfoo2\nfoo3\nfoo4\nfoo5\nfoo6\nfoo7\nf008',
  //left: 'center',
  left: 3,
  top: 3,
  content: 'foo',
  //shrink: true,
  height: 4,
  width: 5,
  //width: '80%',
  //height: 5,
  border: 'line',
  style: {
    bg: 'yellow',
    focus: {
      bg: 'blue'
    },
    hover: {
      bg: 'red'
    }
    // scrollbar: {
    //   inverse: true
    // }
  },
  keys: true,
  vi: true,
  alwaysScroll: true
  // scrollbar: {
  //   ch: ' '
  // }
});

screen.key('q', function() {
  return screen.destroy();
});

box.focus();

screen.render();
