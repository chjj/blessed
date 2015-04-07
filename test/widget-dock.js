var blessed = require('../')
  , screen;

screen = blessed.screen({
  dump: __dirname + '/logs/dock.log',
  smartCSR: true,
  dockBorders: true
});

var topleft = blessed.box({
  parent: screen,
  left: 0,
  top: 0,
  width: '50%',
  height: '50%',
  border: {
    type: 'line',
    left: false,
    top: false,
    right: true,
    bottom: false
  },
  // border: 'line',
  content: 'Foo'
});

var topright = blessed.box({
  parent: screen,
  left: '50%-1',
  top: 0,
  width: '50%+1',
  height: '50%',
  border: {
    type: 'line',
    left: true,
    top: false,
    right: false,
    bottom: false
  },
  // border: 'line',
  content: 'Bar'
});

var bottomleft = blessed.box({
  parent: screen,
  left: 0,
  top: '50%-1',
  width: '50%',
  height: '50%+1',
  border: {
    type: 'line',
    left: false,
    top: true,
    right: false,
    bottom: false
  },
  border: 'line',
  content: 'Foo'
});

var bottomright = blessed.listtable({
  parent: screen,
  left: '50%-1',
  top: '50%-1',
  width: '50%+1',
  height: '50%+1',
  border: {
    type: 'line',
    left: true,
    top: true,
    right: false,
    bottom: false
  },
  // border: 'line',
  align: 'center',
  tags: true,
  keys: true,
  vi: true,
  mouse: true,
  style: {
    header: {
      fg: 'blue',
      bold: true
    },
    cell: {
      fg: 'magenta',
      selected: {
        bg: 'blue'
      }
    }
  },
  data: [
    [ 'Animals',  'Foods',  'Times',   'Numbers' ],
    [ 'Elephant', 'Apple',  '1:00am',  'One'     ],
    [ 'Bird',     'Orange', '2:15pm',  'Two'     ],
    [ 'T-Rex',    'Taco',   '8:45am',  'Three'   ],
    [ 'Mouse',    'Cheese', '9:05am',  'Four'    ]
  ]
});

bottomright.focus();

var over = blessed.box({
  parent: screen,
  hidden: true,
  left: 'center',
  top: 'center',
  width: '50%',
  height: '50%',
  border: {
    type: 'line',
    left: false,
    top: true,
    right: true,
    bottom: true
  },
  content: 'Foo'
});

screen.on('keypress', function() {
  over.toggle();
  screen.render();
});

screen.key('escape', function() {
  over.hide();
  screen.render();
});

screen.key('q', function() {
  return process.exit(0);
});

screen.render();
