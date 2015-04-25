var blessed = require('../')
  , screen;

screen = blessed.screen({
  dump: __dirname + '/logs/listtable.log',
  autoPadding: false
});

var table = blessed.listtable({
  parent: screen,
  top: 'center',
  left: 'center',
  data: null,
  border: 'line',
  align: 'center',
  tags: true,
  keys: true,
  width: '80%',
  height: '70%',
  vi: true,
  mouse: true,
  style: {
    border: {
      fg: 'red'
    },
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
  }
});

var data = [
  [ 'Animals',  'Foods',  'Times',   'Numbers' ],
  [ 'Elephant', 'Apple',  '1:00am',  'One'     ],
  [ 'Bird',     'Orange', '2:15pm',  'Two'     ],
  [ 'T-Rex',    'Taco',   '8:45am',  'Three'   ],
  [ 'Mouse',    'Cheese', '9:05am',  'Four'    ]
];

var data = [
  [ 'Animals',  'Foods',  'Times'  ],
  [ 'Elephant', 'Apple',  '1:00am' ],
  [ 'Bird',     'Orange', '2:15pm' ],
  [ 'T-Rex',    'Taco',   '8:45am' ],
  [ 'Mouse',    'Cheese', '9:05am' ]
];

data[1][0] = '{red-fg}' + data[1][0] + '{/red-fg}';

table.setData(data);

table.focus();

screen.key('q', function() {
  return process.exit(0);
});

screen.render();
