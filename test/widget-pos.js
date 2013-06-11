var blessed = require('blessed')
  , program = blessed();

var screen = new blessed.Screen({
  program: program
});

var main = new blessed.Box({
  width: '75%',
  height: '75%',
  bg: 3,
  top: 2,
  left: 2,
  content: 'Welcome to my program'
});

screen.append(main);

var inner = new blessed.Box({
  width: '50%',
  height: '50%',
  bg: 4,
  top: 2,
  left: 2,
  content: 'Hello'
});

main.append(inner);

inner.setContent(inner.content + '\n' + JSON.stringify({
  left: inner.left,
  right: inner.right,
  top: inner.top,
  bottom: inner.bottom,
  width: inner.width,
  height: inner.height,
  rleft: inner.rleft,
  rright: inner.rright,
  rtop: inner.rtop,
  rbottom: inner.rbottom
}));

screen.on('keypress', function(ch, key) {
  if (key.name === 'escape' || key.name === 'q') {
    return process.exit(0);
  }
});

screen.render();
