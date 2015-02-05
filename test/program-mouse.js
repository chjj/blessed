#!/usr/bin/env node

var blessed = require('../')
  , util = require('util')
  , program;

program = blessed.program({
  dump: __dirname + '/logs/mouse.log'
});

// program.setMouse({
//   allMotion: true,
//   //utfMouse: true
//   urxvtMouse: true
// }, true);

program.alternateBuffer();
program.enableMouse();
program.hideCursor();

program.on('mouse', function(data) {
  program.cup(data.y, data.x);
  program.write(' ', 'blue bg');
  program.cup(0, 0);
  program.write(util.inspect(data));
});

program.key(['q', 'escape', 'C-c'], function() {
  program.showCursor();
  program.disableMouse();
  program.normalBuffer();
  process.exit(0);
});

program.on('keypress', function(ch, data) {
  if (data.name === 'mouse') return;
  program.clear();
  program.cup(0, 0);
  program.write(util.inspect(data));
});

program.on('mouse-debug', function(s, buf) {
  if (s) {
    program.cup(10, 0);
    program.write(util.inspect(s));
  }
  if (buf) {
    program.cup(11, 0);
    buf = Array.prototype.slice.call(buf);
    program.write(util.inspect(buf));
  }
});

// program.getCursor(function(err, data) {
//   program.write(util.inspect(data));
// });
