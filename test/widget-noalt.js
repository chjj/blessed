var blessed = require('../')
  , screen;

screen = blessed.screen({
  dump: __dirname + '/logs/noalt.log',
  title: 'widget-noalt test',
  noAlt: true
});

var list = blessed.list({
  parent: screen,
  align: 'center',
  mouse: true,
  keys: true,
  vi: true,
  width: '50%',
  height: 'shrink',
  //border: 'line',
  bottom: 2,
  left: 0,
  style: {
    fg: 'blue',
    bg: 'default',
    selected: {
      bg: 'green'
    }
  },
  items: [
    'one',
    'two',
    'three'
  ]
});

list.select(0);

list.on('select', function(item) {
  console.log(item.getText());
  process.exit(0);
});

screen.key('C-c', function() {
  process.exit(0);
});

list.focus();

screen.render();
