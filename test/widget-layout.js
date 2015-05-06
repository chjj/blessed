var blessed = require('../')
  , screen;

screen = blessed.screen({
  dump: __dirname + '/logs/layout.log',
  smartCSR: true,
  autoPadding: true
});

var layout = blessed.layout({
  parent: screen,
  top: 'center',
  left: 'center',
  width: '50%',
  height: '50%',
  border: 'line',
  style: {
    bg: 'red',
    border: {
      fg: 'blue'
    }
  }
});

var box1 = blessed.box({
  parent: layout,
  top: 'center',
  left: 'center',
  width: 20,
  height: 10,
  border: 'line'
});

var box2 = blessed.box({
  parent: layout,
  top: 0,
  left: 0,
  width: 10,
  height: 5,
  border: 'line'
});

var box2 = blessed.box({
  parent: layout,
  top: 0,
  left: 0,
  width: 10,
  height: 5,
  border: 'line'
});

var box2 = blessed.box({
  parent: layout,
  top: 0,
  left: 0,
  width: 10,
  height: 5,
  border: 'line'
});

var box2 = blessed.box({
  parent: layout,
  top: 0,
  left: 0,
  width: 10,
  height: 5,
  border: 'line'
});

var box2 = blessed.box({
  parent: layout,
  top: 0,
  left: 0,
  width: 10,
  height: 5,
  border: 'line'
});

var box2 = blessed.box({
  parent: layout,
  top: 0,
  left: 0,
  width: 10,
  height: 5,
  border: 'line'
});

var box1 = blessed.box({
  parent: layout,
  top: 'center',
  left: 'center',
  width: 20,
  height: 10,
  border: 'line'
});

var box2 = blessed.box({
  parent: layout,
  top: 0,
  left: 0,
  width: 10,
  height: 5,
  border: 'line'
});

var box1 = blessed.box({
  parent: layout,
  top: 'center',
  left: 'center',
  width: 20,
  height: 10,
  border: 'line'
});

/*
for (var i = 0; i < 10; i++) {
  blessed.box({
    parent: layout,
    width: i % 2 === 0 ? 10 : 20,
    height: i % 2 === 0 ? 5 : 10,
    border: 'line'
  });
}
*/

screen.key('q', function() {
  return process.exit(0);
});

screen.render();
