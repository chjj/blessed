var blessed = require('../')
  , screen;

screen = blessed.screen({
  dump: __dirname + '/logs/padding.log'
});

blessed.box({
  parent: screen,
  border: 'line',
  style: {
    bg: 'red',
  },
  content: 'hello world\nhi',
  align: 'center',
  left: 'center',
  top: 'center',
  width: 22,
  height: 10,
  padding: 2
});

screen.key('q', function() {
  return process.exit(0);
});

screen.render();
