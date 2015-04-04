var blessed = require('../')
  , assert = require('assert')
  , screen;

screen = blessed.screen({
  dump: __dirname + '/logs/pos.log'
});

// My terminal size at the time of writing these tests:
screen.program.cols = 154;
screen.program.rows = 19;
screen.alloc();

var main = blessed.box({
  //width: '75%',
  //height: '75%',
  width: 115,
  height: 14,
  style: {
    bg: 'yellow'
  },
  top: 2,
  left: 2,
  content: 'Welcome to my program'
});

screen.append(main);

var inner = blessed.box({
  width: '50%',
  height: '50%',
  //width: 57,
  //height: 7,
  style: {
    bg: 'blue'
  },
  top: 2,
  left: 2,
  content: 'Hello'
});

main.append(inner);

inner.setContent(inner.content + '\n' + JSON.stringify({
  aleft: inner.aleft,
  aright: inner.aright,
  atop: inner.atop,
  abottom: inner.abottom,
  width: inner.width,
  height: inner.height,
  rleft: inner.rleft,
  rright: inner.rright,
  rtop: inner.rtop,
  rbottom: inner.rbottom
}));

assert.equal(inner.width, 57);
assert.equal(inner.height, 7);

assert.equal(inner.aleft, 4);
assert.equal(inner.aright, 93);
assert.equal(inner.atop, 4);
assert.equal(inner.abottom, 8);

assert.equal(inner.rleft, 2);
assert.equal(inner.rright, 56);
assert.equal(inner.rtop, 2);
assert.equal(inner.rbottom, 5);

// Change left to half of the parent width.
inner.rleft = '50%';
assert.equal(inner.aleft, 59);

// Change left to half of the screen width.
inner.aleft = '50%';
assert.equal(inner.aleft, screen.width / 2 | 0);

// Test implied height/width.
reset(inner, {
  top: 5,
  bottom: 5,
  left: 5,
  right: 5
});

assert.equal(inner.width, 105);
assert.equal(inner.height, 4);

// Demonstrate the difference between `left: 5`, and `.aleft = 5` (relative vs. absolute):
inner.atop = inner.abottom = inner.aleft = inner.aright = 5;

assert.equal(inner.width, 144);
assert.equal(inner.height, 9);

// Test center keyword
reset(inner, {
  width: '50%',
  height: '50%',
  left: 'center',
  top: 'center'
});

assert.equal(inner.rleft, 29);
assert.equal(inner.rtop, 4);

// TODO: Start storing position.left, etc. as absolute?

screen.on('keypress', function(ch, key) {
  if (key.name === 'escape' || key.name === 'q') {
    return process.exit(0);
  }
});

screen.render();

function reset(el, pos) {
  pos = pos || {};
  el.position.width = el.options.width = pos.width;
  el.position.height = el.options.height = pos.height;
  el.position.left = el.options.left = pos.left;
  el.position.right = el.options.right = pos.right;
  el.position.top = el.options.top = pos.top;
  el.position.bottom = el.options.bottom = pos.bottom;
}
