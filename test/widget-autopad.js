var blessed = require('../')
  , screen;

screen = blessed.screen({
  dump: __dirname + '/logs/autopad.log',
  smartCSR: true,
  autoPadding: true,
  warnings: true
});

var box1 = blessed.box({
  parent: screen,
  top: 'center',
  left: 'center',
  width: 20,
  height: 10,
  border: 'line'
});

var box2 = blessed.box({
  parent: box1,
  top: 0,
  left: 0,
  width: 10,
  height: 5,
  border: 'line'
});

screen.key('q', function() {
  return screen.destroy();
});

screen.render();
