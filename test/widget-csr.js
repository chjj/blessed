var blessed = require('blessed')
  , screen = blessed.screen({ dump: __dirname + '/p.log' });

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

blessed.box({
  parent: screen,
  left: 0,
  top: 'center',
  width: '50%',
  height: 2,
  bg: 'green',
  content: 'This will disallow CSR.'
});
expectClean(false);

/*
blessed.box({
  parent: screen,
  left: 'center',
  top: 'center',
  width: '80%',
  height: '80%',
  bg: 'green',
  border: {
    type: 'ascii'
  },
  content: 'CSR should still work.'
});
expectClean(true);
*/

var text = blessed.scrollabletext({
  parent: screen,
  content: lorem,
  border: {
    type: 'ascii'
  },
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
