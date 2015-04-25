var blessed = require('../')
  , screen;

screen = blessed.screen({
  dump: __dirname + '/logs/valign.log',
  smartCSR: true,
  autoPadding: false
});

var box = blessed.box({
  parent: screen,
  top: 'center',
  left: 'center',
  width: '50%',
  height: 5,
  align: 'center',
  valign: 'middle',
  // valign: 'bottom',
  content: 'Foobar.',
  border: 'line'
});

screen.key('q', function() {
  return process.exit(0);
});

screen.render();
