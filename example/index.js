/**
 * Example Program for Blessed
 * Copyright (c) 2013, Christopher Jeffrey (MIT License).
 * https://github.com/chjj/blessed
 */

var blessed = require('../')
  , program = blessed.program();

process.title = 'blessed';

program.on('keypress', function(ch, key) {
  if (key.name === 'q') {
    program.clear();
    program.disableMouse();
    program.showCursor();
    program.normalBuffer();
    process.exit(0);
  }
});

program.on('mouse', function(data) {
  if (data.action === 'mouseup') return;
  program.move(1, program.rows);
  program.eraseInLine('right');
  if (data.action === 'wheelup') {
    program.write('Mouse wheel up at: ' + data.x + ', ' + data.y);
  } else if (data.action === 'wheeldown') {
    program.write('Mouse wheel down at: ' + data.x + ', ' + data.y);
  } else if (data.action === 'mousedown' && data.button === 'left') {
    program.write('Left button down at: ' + data.x + ', ' + data.y);
  } else if (data.action === 'mousedown' && data.button === 'right') {
    program.write('Right button down at: ' + data.x + ', ' + data.y);
  } else {
    program.write('Mouse at: ' + data.x + ', ' + data.y);
  }
  program.move(data.x, data.y);
  program.bg('red');
  program.write(' ');
  program.bg('!red');
});

program.on('focus', function() {
  program.move(1, program.rows);
  program.write('Gained focus.');
});

program.on('blur', function() {
  program.move(1, program.rows);
  program.write('Lost focus.');
});

program.alternateBuffer();
program.enableMouse();
program.hideCursor();
program.clear();

program.move(1, 1);
program.bg('black');
program.write('Hello world', 'blue fg');
program.setx((program.cols / 2 | 0) - 4);
program.down(5);
program.write('Hi again!');
program.bg('!black');
program.feed();

program.getCursor(function(err, data) {
  if (!err) {
    program.write('Cursor is at: ' + data.x + ', ' + data.y + '.');
    program.feed();
  }

  program.charset('SCLD');
  program.write('abcdefghijklmnopqrstuvwxyz0123456789');
  program.charset('US');
  program.setx(1);
});
