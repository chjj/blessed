var blessed = require('../')
  , screen;

screen = blessed.screen({
  dump: __dirname + '/logs/table.log',
  autoPadding: false,
  fullUnicode: true,
  warnings: true
});

var DU = '杜';
var JUAN = '鹃';

var table = blessed.table({
  parent: screen,
  top: 'center',
  left: 'center',
  data: null,
  border: 'line',
  align: 'center',
  tags: true,
  //width: '80%',
  width: 'shrink',
  style: {
    border: {
      fg: 'red'
    },
    header: {
      fg: 'blue',
      bold: true
    },
    cell: {
      fg: 'magenta'
    }
  }
});

var data1 = [
  [ 'Animals',  'Foods',  'Times'  ],
  [ 'Elephant', 'Apple',  '1:00am' ],
  [ 'Bird',     'Orange', '2:15pm' ],
  [ 'T-Rex',    'Taco',   '8:45am' ],
  [ 'Mouse',    'Cheese', '9:05am' ]
];

data1[1][0] = '{red-fg}' + data1[1][0] + '{/red-fg}';
data1[2][0] += ' (' + DU + JUAN + ')';

var data2 = [
  [ 'Animals',  'Foods',  'Times',   'Numbers' ],
  [ 'Elephant', 'Apple',  '1:00am',  'One'     ],
  [ 'Bird',     'Orange', '2:15pm',  'Two'     ],
  [ 'T-Rex',    'Taco',   '8:45am',  'Three'   ],
  [ 'Mouse',    'Cheese', '9:05am',  'Four'    ]
];

data2[1][0] = '{red-fg}' + data2[1][0] + '{/red-fg}';
data2[2][0] += ' (' + DU + JUAN + ')';

screen.key('q', function() {
  return process.exit(0);
});

table.setData(data2);
screen.render();

setTimeout(function() {
  table.setData(data1);
  screen.render();
}, 3000);
