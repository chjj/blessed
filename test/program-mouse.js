var blessed = require('../')
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
  console.log(data);
});

program.key(['q', 'escape', 'C-c'], function() {
  program.showCursor();
  program.disableMouse();
  program.normalBuffer();
  process.exit(0);
});
