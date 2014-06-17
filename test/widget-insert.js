var blessed = require('../');

var screen = blessed.screen({
  dump: __dirname + '/logs/insert.log'
});

var box = blessed.box({
  parent: screen,
  //align: 'center',
  bg: 'blue',
  height: 5,
  top: 'center',
  left: 0,
  width: 12,
  tags: true,
  content: 'line{|}1',
  //valign: 'middle'
});

screen.render();

box.insertBottom('line{|}2');
box.insertTop('line{|}0');

screen.render();

setTimeout(function() {
  box.deleteTop();
  screen.render();
}, 2000);

screen.key('q', function() {
  process.exit(0);
});
