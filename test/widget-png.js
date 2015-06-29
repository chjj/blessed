var blessed = require('../');
var fs = require('fs');

var screen = blessed.screen({
  tput: true,
  smartCSR: true,
  dump: __dirname + '/logs/png.log'
});

var box = blessed.box({
  parent: screen,
  left: 4,
  top: 3,
  width: 10,
  height: 6,
  border: 'line',
  style: {
    bg: 'green'
  },
  content: 'Lorem ipsum doler',
  align: 'center'
});

var file = process.argv[2];
var testImage = __dirname + '/test-image.png';
var spinfox = __dirname + '/spinfox.png';

// XXX I'm not sure of the license of this file,
// so I'm not going to redistribute it in the repo.
var url = 'https://people.mozilla.org/~dolske/apng/spinfox.png';

if (!file) {
  try {
    if (!fs.existsSync(spinfox)) {
      var buf = blessed.png.curl(url);
      fs.writeFileSync(spinfox, buf);
    }
    file = spinfox;
  } catch (e) {
    file = testImage;
  }
}

var png = blessed.png({
  parent: screen,
  // border: 'line',
  width: 20,
  height: 19,
  top: 2,
  left: 0,
  file: file,
  ascii: false,
  draggable: true
});

screen.render();

screen.key('q', function() {
  process.exit(0);
});

var timeout = setInterval(function() {
  png.left++;
  screen.render();
}, 100);

png.on('mousedown', function() {
  clearInterval(timeout);
});
