var blessed = require('../')
  , screen;

screen = blessed.screen({
  dump: __dirname + '/logs/csr.log',
  smartCSR: true
});

var lorem = require('fs').readFileSync(__dirname + '/git.diff', 'utf8');

function expectClean(value) {
  var cleanSides = screen.cleanSides;
  screen.cleanSides = function() {
    var ret = cleanSides.apply(this, arguments);
    if (ret !== value) {
      throw new Error('Failed. Expected '
        + value + ' from cleanSides. Got '
        + ret + '.');
    }
    return ret;
  };
}

/*
blessed.box({
  parent: screen,
  left: 0,
  top: 'center',
  width: '50%',
  height: 2,
  style: {
    bg: 'green'
  },
  content: 'This will disallow CSR.'
});
expectClean(false);
*/

blessed.box({
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
expectClean(true);

var text = blessed.scrollabletext({
  parent: screen,
  content: lorem,
  border: 'line',
  left: 'center',
  top: 'center',
  width: '100%',
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
