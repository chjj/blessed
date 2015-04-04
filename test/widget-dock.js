var blessed = require('../')
  , screen;

screen = blessed.screen({
  dump: __dirname + '/logs/dock.log',
  smartCSR: true,
  dockBorders: true
});

blessed.box({
  parent: screen,
  left: 0,
  top: 0,
  width: 10,
  height: 5,
  border: 'line',
  content: 'Foo'
});

blessed.box({
  parent: screen,
  left: 9,
  top: 0,
  width: 10,
  height: 5,
  content: 'Bar',
  border: 'line'
});

blessed.box({
  parent: screen,
  left: 0,
  top: 4,
  width: 10,
  height: 5,
  border: 'line',
  content: 'Foo'
});

blessed.box({
  parent: screen,
  left: 9,
  top: 4,
  width: 10,
  height: 5,
  border: 'line',
  content: 'Bar'
});

screen.key('q', function() {
  return process.exit(0);
});

screen.render();
