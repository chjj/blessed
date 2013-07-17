var blessed = require('blessed')
  , screen = blessed.screen();

var outer = blessed.box({
  parent: screen,
  //left: 0,
  //top: 0,
  //left: '50%',
  //top: '50%',
  left: 'center',
  top: 'center',
  padding: 1,
  shrink: true,
  bg: 'green'
});

var inner = blessed.box({
  parent: outer,
  left: 0,
  top: 0,
  width: 5,
  height: 5,
  //padding: 1,
  //content: 'f',
  bg: 'magenta'
});

screen.key('q', function() {
  return process.exit(0);
});

screen.render();
