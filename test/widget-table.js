var blessed = require('../')
  , screen;

screen = blessed.screen({
  dump: __dirname + '/logs/table.log',
  autoPadding: true
});

var table = blessed.table({
  parent: screen,
  top: 'center',
  left: 'center',
  data: null,
  border: 'line',
  align: 'center',
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

table.setData([
  [ 'Animals',  'Foods',  'Times'  ],
  [ 'Elephant', 'Apple',  '1:00am' ],
  [ 'Bird',     'Orange', '2:15pm' ]
]);

screen.key('q', function() {
  return process.exit(0);
});

screen.render();
