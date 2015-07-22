var blessed = require('../');

var screen = blessed.screen({
  dump: __dirname + '/logs/play.log',
  smartCSR: true,
  warnings: true
});

var frames = require(__dirname + '/frames.json');

setInterval(function() {
  if (!frames.length) return process.exit(0);
  process.stdout.write(frames.shift());
}, 100);
