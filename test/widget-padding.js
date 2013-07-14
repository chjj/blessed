var blessed = require('../')
  , screen = blessed.screen();

blessed.box({
  parent: screen,
  border: {
    type: 'ascii',
  },
  bg: 'red',
  content: 'hello world\nhi',
  align: 'center',
  left: 'center',
  top: 'center',
  width: 20,
  height: 8,
  padding: 1
});

screen.key('q', function() {
  return process.exit(0);
});

screen.render();
