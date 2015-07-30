var blessed = require('../');

var screen = blessed.screen({
  dump: __dirname + '/logs/exit.log',
  smartCSR: true,
  autoPadding: true,
  warnings: true,
  ignoreLocked: ['C-q']
});

var box = blessed.prompt({
  parent: screen,
  left: 'center',
  top: 'center',
  width: '70%',
  height: 'shrink',
  border: 'line'
});

screen.render();

box.input('Input: ', '', function(err, data) {
  screen.destroy();
  if (process.argv[2] === 'resume') {
    process.stdin.resume();
  } else if (process.argv[2] === 'end') {
    process.stdin.setRawMode(false);
    process.stdin.end();
  }
  if (err) throw err;
  console.log('Input: ' + data);
});

screen.key('C-q', function(ch, key) {
  return process.exit(0);
});
