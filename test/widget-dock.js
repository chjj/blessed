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
  width: '50%',
  height: '50%',
  border: 'line',
  content: 'Foo'
});

blessed.box({
  parent: screen,
  left: '50%-1',
  top: 0,
  width: '50%+1',
  height: '50%',
  content: 'Bar',
  border: 'line'
});

blessed.box({
  parent: screen,
  left: 0,
  top: '50%-1',
  width: '50%',
  height: '50%+1',
  border: 'line',
  content: 'Foo'
});

blessed.listtable({
  parent: screen,
  left: '50%-1',
  top: '50%-1',
  width: '50%+1',
  height: '50%+1',
  border: 'line',
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
}).focus();

// blessed.box({
//   parent: screen,
//   left: '50%-1',
//   top: '50%-1',
//   width: '50%+1',
//   height: '50%+1',
//   border: 'line',
//   content: 'Bar'
// });

screen.key('q', function() {
  return process.exit(0);
});

screen.render();
