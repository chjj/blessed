var blessed = require('../');

var screen = blessed.screen({
  tput: true,
  smartCSR: true,
  dump: __dirname + '/file.log'
});

var fm = blessed.filemanager({
  parent: screen,
  border: {
    type: 'ascii'
  },
  selectedBg: 'blue',
  height: 'half',
  width: 'half',
  top: 'center',
  left: 'center',
  cwd: process.env.HOME,
  keys: true,
  vi: true,
  scrollbar: {
    bg: 'white',
    ch: ' '
  }
});

var box = blessed.box({
  parent: screen,
  bg: 'green',
  border: {
    type: 'ascii'
  },
  height: 'half',
  width: 'half',
  top: 'center',
  left: 'center',
  hidden: true
});

fm.refresh();

screen.render();

screen.key('q', function() {
  process.exit(0);
});

screen.key(['s', 'p'], function() {
  fm.hide();
  screen.render();
  setTimeout(function() {
    fm.pick(function(err, file) {
      box.show();
      box.setContent(err ? err + '' : file);
      screen.render();
      setTimeout(function() {
        box.hide();
        fm.reset(function() {
          fm.show();
          screen.render();
        });
      }, 2000);
    });
  }, 2000);
});
