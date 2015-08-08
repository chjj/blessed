var blessed = require('../');

var screen = blessed.screen({
  tput: true,
  smartCSR: true,
  dump: __dirname + '/logs/file.log',
  warnings: true
});

var fm = blessed.filemanager({
  parent: screen,
  border: 'line',
  style: {
    selected: {
      bg: 'blue'
    }
  },
  height: 'half',
  width: 'half',
  top: 'center',
  left: 'center',
  label: ' {blue-fg}%path{/blue-fg} ',
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
  style: {
    bg: 'green'
  },
  border: 'line',
  height: 'half',
  width: 'half',
  top: 'center',
  left: 'center',
  hidden: true
});

fm.refresh();

screen.render();

screen.key('q', function() {
  screen.destroy();
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
