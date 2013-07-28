var blessed = require('../')
  , screen;

screen = blessed.screen({
  dump: __dirname + '/nested-attr.log',
  smartCSR: true
});

blessed.box({
  parent: screen,
  left: 'center',
  top: 'center',
  width: '80%',
  height: '80%',
  bg: 'black',
  fg: 'yellow',
  tags: true,
  border: {
    type: 'ascii'
  },
  content: '{red-fg}hello {blue-fg}how{/blue-fg} are you?{/red-fg}'
});

screen.key('q', function() {
  return process.exit(0);
});

screen.render();
