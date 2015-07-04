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

program.setMouse({ sendFocus: true }, true);
//program._currentMouse.sendFocus = true;
//program.enableMouse(program._currentMouse);
//program.write('\x1b[?1004h');

program.on('mouse', function(data) {
  program.cup(data.y, data.x);
  program.write(' ', 'blue bg');
  program.cup(0, 0);
  program.write(util.inspect(data));
});

program.on('resize', function(data) {
  setTimeout(function() {
    program.clear();
    program.cup(0, 0);
    program.write(util.inspect({ cols: program.cols, rows: program.rows }));
  }, 200);
});

process.on('SIGWINCH', function(data) {
  setTimeout(function() {
    program.cup(1, 0);
    program.write(util.inspect({ winch: true, cols: program.cols, rows: program.rows }));
  }, 200);
});

program.on('focus', function(data) {
  program.clear();
  program.cup(0, 0);
  program.write('FOCUSIN');
});

program.on('blur', function(data) {
  program.clear();
  program.cup(0, 0);
  program.write('FOCUSOUT');
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

// program.getCursor(function(err, data) {
//   program.write(util.inspect(data));
// });

// program.manipulateWindow(18, function(err, data) {
//   program.write(util.inspect(data));
// });
