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
  height: 4,
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
  [ 'Animals',  'Foods',  'Times'  ],
  [ 'Elephant', 'Apple',  '1:00am' ],
  [ 'Bird',     'Orange', '2:15pm' ]
];

data[1][0] = '{red-fg}' + data[1][0] + '{/red-fg}';

table.setData(data);

table.focus();

screen.key('q', function() {
  return process.exit(0);
});

screen.render();
