var blessed = require('../')
  , fs = require('fs');

var screen = blessed.screen({
  dump: __dirname + '/logs/record.log',
  smartCSR: true,
  warnings: true
});

var btext = blessed.box({
  parent: screen,
  left: 'center',
  top: 'center',
  width: '80%',
  height: '80%',
  style: {
    bg: 'green'
  },
  border: 'line',
  content: 'CSR should still work.'
});

var text = blessed.scrollabletext({
  parent: screen,
  content: fs.readFileSync(__dirname + '/git.diff', 'utf8'),
  border: 'line',
  left: 'center',
  top: 'center',
  draggable: true,
  width: '50%',
  height: '50%',
  mouse: true,
  keys: true,
  vi: true
});

text.focus();

screen.key('q', function() {
  return process.exit(0);
});

screen.render();

var frames = [];

setInterval(function() {
  frames.push(screen.screenshot());
}, 100);

process.on('exit', function() {
  fs.writeFileSync(__dirname + '/frames.json', JSON.stringify(frames));
});
