var blessed = require('../')
  , screen;

screen = blessed.screen({
  dump: __dirname + '/logs/nested-attr.log',
  warnings: true
});

blessed.box({
  parent: screen,
  left: 'center',
  top: 'center',
  width: '80%',
  height: '80%',
  style: {
    bg: 'black',
    fg: 'yellow'
  },
  tags: true,
  border: 'line',
  content: '{red-fg}hello {blue-fg}how{/blue-fg}'
    + ' {yellow-bg}are{/yellow-bg} you?{/red-fg}'
});

screen.key('q', function() {
  return process.exit(0);
});

screen.render();
