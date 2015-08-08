var blessed = require('../')
  , screen;

screen = blessed.screen({
  dump: __dirname + '/logs/layout.log',
  smartCSR: true,
  autoPadding: true,
  warnings: true
});

var layout = blessed.layout({
  parent: screen,
  top: 'center',
  left: 'center',
  width: '50%',
  height: '50%',
  border: 'line',
  layout: process.argv[2] === 'grid' ? 'grid' : 'inline',
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
  border: 'line',
  content: '1'
});

var box2 = blessed.box({
  parent: layout,
  top: 0,
  left: 0,
  width: 10,
  height: 5,
  border: 'line',
  content: '2'
});

var box3 = blessed.box({
  parent: layout,
  top: 0,
  left: 0,
  width: 10,
  height: 5,
  border: 'line',
  content: '3'
});

var box4 = blessed.box({
  parent: layout,
  top: 0,
  left: 0,
  width: 10,
  height: 5,
  border: 'line',
  content: '4'
});

var box5 = blessed.box({
  parent: layout,
  top: 0,
  left: 0,
  width: 10,
  height: 5,
  border: 'line',
  content: '5'
});

var box6 = blessed.box({
  parent: layout,
  top: 0,
  left: 0,
  width: 10,
  height: 5,
  border: 'line',
  content: '6'
});

var box7 = blessed.box({
  parent: layout,
  top: 0,
  left: 0,
  width: 10,
  height: 5,
  border: 'line',
  content: '7'
});

var box8 = blessed.box({
  parent: layout,
  top: 'center',
  left: 'center',
  width: 20,
  height: 10,
  border: 'line',
  content: '8'
});

var box9 = blessed.box({
  parent: layout,
  top: 0,
  left: 0,
  width: 10,
  height: 5,
  border: 'line',
  content: '9'
});

var box10 = blessed.box({
  parent: layout,
  top: 'center',
  left: 'center',
  width: 20,
  height: 10,
  border: 'line',
  content: '10'
});

var box11 = blessed.box({
  parent: layout,
  top: 0,
  left: 0,
  width: 10,
  height: 5,
  border: 'line',
  content: '11'
});

var box12 = blessed.box({
  parent: layout,
  top: 'center',
  left: 'center',
  width: 20,
  height: 10,
  border: 'line',
  content: '12'
});

if (process.argv[2] !== 'grid') {
  for (var i = 0; i < 10; i++) {
    blessed.box({
      parent: layout,
      // width: i % 2 === 0 ? 10 : 20,
      // height: i % 2 === 0 ? 5 : 10,
      width: Math.random() > 0.5 ? 10 : 20,
      height: Math.random() > 0.5 ? 5 : 10,
      border: 'line',
      content: (i + 1 + 12) + ''
    });
  }
}

screen.key('q', function() {
  return screen.destroy();
});

screen.render();
