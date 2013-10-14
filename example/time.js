/**
 * A clock using blessed
 * Copyright (c) 2013, Christopher Jeffrey (MIT License).
 * https://github.com/chjj/blessed
 */

var blessed = require('blessed')

var screen = blessed.screen({
  autoPadding: true,
});

var positions = {};

var container = blessed.box({
  parent: screen,
  top: 'center',
  left: 'center',
  width: 'shrink',
  height: 'shrink',
  padding: 2,
  border: {
    type: 'line',
    fg: 'black'
  }
});

var date = blessed.box({
  parent: screen,
  top: 1,
  left: 1,
  width: 'shrink',
  height: 'shrink',
  border: {
    type: 'line',
    fg: 'black'
  }
});

for (var i = 0; i < 10; i++) {
  var symbols = positions[i] = {};

  /**
   * Zero
   */

  symbols[0] = blessed.box({
    parent: container,
    top: 0,
    left: 0,
    width: 10,
    height: 8
  });

  blessed.box({
    parent: symbols[0],
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    style: {
      //bg: 'red',
      inverse: true
    }
  });

  blessed.box({
    parent: symbols[0],
    top: 0,
    left: 0,
    bottom: 0,
    width: 1,
    style: {
      //bg: 'blue',
      inverse: true
    }
  });

  blessed.box({
    parent: symbols[0],
    top: 0,
    right: 0,
    bottom: 0,
    width: 1,
    style: {
      //bg: 'yellow'
      inverse: true
    }
  });

  blessed.box({
    parent: symbols[0],
    top: 7,
    left: 0,
    right: 0,
    height: 1,
    style: {
      //bg: 'magenta'
      inverse: true
    }
  });

  symbols[0].hide();

  /**
   * One
   */

  symbols[1] = blessed.box({
    parent: container,
    top: 0,
    width: 10,
    height: 8
  });

  blessed.box({
    parent: symbols[1],
    top: 0,
    left: 'center',
    width: 2,
    style: {
      //bg: 'red',
      inverse: true
    }
  });

  symbols[1].hide();

  /**
   * Two
   */

  symbols[2] = blessed.box({
    parent: container,
    top: 0,
    left: 0,
    width: 10,
    height: 8
  });

  blessed.box({
    parent: symbols[2],
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    style: {
      //bg: 'red',
      inverse: true
    }
  });

  blessed.box({
    parent: symbols[2],
    top: 0,
    right: 0,
    height: 4,
    width: 1,
    style: {
      //bg: 'blue',
      inverse: true
    }
  });

  blessed.box({
    parent: symbols[2],
    top: 3,
    left: 0,
    right: 0,
    height: 1,
    style: {
      //bg: 'green'
      inverse: true
    }
  });

  blessed.box({
    parent: symbols[2],
    top: 4,
    left: 0,
    height: 4,
    width: 1,
    style: {
      //bg: 'yellow'
      inverse: true
    }
  });

  blessed.box({
    parent: symbols[2],
    top: 7,
    left: 0,
    right: 0,
    height: 1,
    style: {
      //bg: 'magenta'
      inverse: true
    }
  });

  symbols[2].hide();

  /**
   * Three
   */

  symbols[3] = blessed.box({
    parent: container,
    top: 0,
    left: 0,
    width: 10,
    height: 8
  });

  blessed.box({
    parent: symbols[3],
    top: 0,
    bottom: 0,
    right: 0,
    width: 1,
    height: 8,
    style: {
      //bg: 'magenta'
      inverse: true
    }
  });

  blessed.box({
    parent: symbols[3],
    top: 0,
    right: 0,
    left: 0,
    height: 1,
    style: {
      //bg: 'magenta'
      inverse: true
    }
  });

  blessed.box({
    parent: symbols[3],
    top: 3,
    right: 0,
    left: 0,
    height: 1,
    style: {
      //bg: 'magenta'
      inverse: true
    }
  });

  blessed.box({
    parent: symbols[3],
    top: 7,
    right: 0,
    left: 0,
    height: 1,
    style: {
      //bg: 'magenta'
      inverse: true
    }
  });

  symbols[3].hide();

  /**
   * Four
   */

  symbols[4] = blessed.box({
    parent: container,
    top: 0,
    left: 0,
    width: 10,
    height: 8
  });

  blessed.box({
    parent: symbols[4],
    top: 0,
    bottom: 0,
    right: 0,
    width: 1,
    height: 8,
    style: {
      //bg: 'magenta'
      inverse: true
    }
  });

  blessed.box({
    parent: symbols[4],
    top: 3,
    right: 0,
    left: 0,
    height: 1,
    style: {
      //bg: 'magenta'
      inverse: true
    }
  });

  blessed.box({
    parent: symbols[4],
    top: 0,
    left: 0,
    width: 1,
    height: 4,
    style: {
      //bg: 'magenta'
      inverse: true
    }
  });

  symbols[4].hide();

  /**
   * Five
   */

  symbols[5] = blessed.box({
    parent: container,
    top: 0,
    left: 0,
    width: 10,
    height: 8
  });

  blessed.box({
    parent: symbols[5],
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    style: {
      //bg: 'red',
      inverse: true
    }
  });

  blessed.box({
    parent: symbols[5],
    top: 0,
    left: 0,
    height: 4,
    width: 1,
    style: {
      //bg: 'blue',
      inverse: true
    }
  });

  blessed.box({
    parent: symbols[5],
    top: 3,
    left: 0,
    right: 0,
    height: 1,
    style: {
      //bg: 'green'
      inverse: true
    }
  });

  blessed.box({
    parent: symbols[5],
    top: 4,
    right: 0,
    height: 4,
    width: 1,
    style: {
      //bg: 'yellow'
      inverse: true
    }
  });

  blessed.box({
    parent: symbols[5],
    top: 7,
    left: 0,
    right: 0,
    height: 1,
    style: {
      //bg: 'magenta'
      inverse: true
    }
  });

  symbols[5].hide();

  /**
   * Six
   */

  symbols[6] = blessed.box({
    parent: container,
    top: 0,
    left: 0,
    width: 10,
    height: 8
  });

  blessed.box({
    parent: symbols[6],
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    style: {
      //bg: 'red',
      inverse: true
    }
  });

  blessed.box({
    parent: symbols[6],
    top: 0,
    left: 0,
    bottom: 0,
    width: 1,
    style: {
      //bg: 'blue',
      inverse: true
    }
  });

  blessed.box({
    parent: symbols[6],
    top: 3,
    left: 0,
    right: 0,
    height: 1,
    style: {
      //bg: 'green'
      inverse: true
    }
  });

  blessed.box({
    parent: symbols[6],
    top: 4,
    right: 0,
    height: 4,
    width: 1,
    style: {
      //bg: 'yellow'
      inverse: true
    }
  });

  blessed.box({
    parent: symbols[6],
    top: 7,
    left: 0,
    right: 0,
    height: 1,
    style: {
      //bg: 'magenta'
      inverse: true
    }
  });

  symbols[6].hide();

  /**
   * Seven
   */

  symbols[7] = blessed.box({
    parent: container,
    top: 0,
    left: 0,
    width: 10,
    height: 8
  });

  blessed.box({
    parent: symbols[7],
    top: 0,
    bottom: 0,
    right: 0,
    width: 1,
    height: 8,
    style: {
      //bg: 'magenta'
      inverse: true
    }
  });

  blessed.box({
    parent: symbols[7],
    top: 0,
    right: 0,
    left: 0,
    height: 1,
    style: {
      //bg: 'magenta'
      inverse: true
    }
  });

  symbols[7].hide();

  /**
   * Eight
   */

  symbols[8] = blessed.box({
    parent: container,
    top: 0,
    left: 0,
    width: 10,
    height: 8
  });

  blessed.box({
    parent: symbols[8],
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    style: {
      //bg: 'red',
      inverse: true
    }
  });

  blessed.box({
    parent: symbols[8],
    top: 0,
    left: 0,
    bottom: 0,
    width: 1,
    style: {
      //bg: 'blue',
      inverse: true
    }
  });

  blessed.box({
    parent: symbols[8],
    top: 3,
    left: 0,
    right: 0,
    height: 1,
    style: {
      //bg: 'green'
      inverse: true
    }
  });

  blessed.box({
    parent: symbols[8],
    top: 0,
    right: 0,
    bottom: 0,
    width: 1,
    style: {
      //bg: 'yellow'
      inverse: true
    }
  });

  blessed.box({
    parent: symbols[8],
    top: 7,
    left: 0,
    right: 0,
    height: 1,
    style: {
      //bg: 'magenta'
      inverse: true
    }
  });

  symbols[8].hide();

  /**
   * Nine
   */

  symbols[9] = blessed.box({
    parent: container,
    top: 0,
    left: 0,
    width: 10,
    height: 8
  });

  blessed.box({
    parent: symbols[9],
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    style: {
      //bg: 'red',
      inverse: true
    }
  });

  blessed.box({
    parent: symbols[9],
    top: 0,
    left: 0,
    height: 4,
    width: 1,
    style: {
      //bg: 'blue',
      inverse: true
    }
  });

  blessed.box({
    parent: symbols[9],
    top: 3,
    left: 0,
    right: 0,
    height: 1,
    style: {
      //bg: 'green'
      inverse: true
    }
  });

  blessed.box({
    parent: symbols[9],
    top: 0,
    right: 0,
    bottom: 0,
    width: 1,
    style: {
      //bg: 'yellow'
      inverse: true
    }
  });

  blessed.box({
    parent: symbols[9],
    top: 7,
    left: 0,
    right: 0,
    height: 1,
    style: {
      //bg: 'magenta'
      inverse: true
    }
  });

  symbols[9].hide();

  /**
   * Colon
   */

  symbols[':'] = blessed.box({
    parent: container,
    top: 0,
    left: 0,
    width: 2,
    height: 8
  });

  blessed.box({
    parent: symbols[':'],
    top: 2,
    left: 0,
    height: 1,
    style: {
      //bg: 'red',
      bg: 'black',
      //inverse: true
    }
  });

  blessed.box({
    parent: symbols[':'],
    top: 5,
    left: 0,
    height: 1,
    style: {
      //bg: 'red',
      bg: 'black',
      //inverse: true
    }
  });

  symbols[':'].hide();

  /**
   * A
   */

  symbols['a'] = blessed.box({
    parent: container,
    top: 1,
    left: 0,
    width: 10,
    height: 7
  });

  blessed.box({
    parent: symbols['a'],
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    style: {
      //bg: 'red',
      bg: 'black',
      //inverse: true
    }
  });

  blessed.box({
    parent: symbols['a'],
    top: 0,
    left: 0,
    bottom: 0,
    width: 1,
    style: {
      //bg: 'blue',
      bg: 'black',
      //inverse: true
    }
  });

  blessed.box({
    parent: symbols['a'],
    top: 3,
    left: 0,
    right: 0,
    height: 1,
    style: {
      //bg: 'green'
      bg: 'black',
      //inverse: true
    }
  });

  blessed.box({
    parent: symbols['a'],
    top: 0,
    right: 0,
    bottom: 0,
    width: 1,
    style: {
      //bg: 'yellow'
      bg: 'black',
      //inverse: true
    }
  });

  symbols['a'].hide();

  /**
   * P
   */

  symbols['p'] = blessed.box({
    parent: container,
    top: 1,
    left: 0,
    width: 10,
    height: 7
  });

  blessed.box({
    parent: symbols['p'],
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    style: {
      //bg: 'red',
      bg: 'black',
      //inverse: true
    }
  });

  blessed.box({
    parent: symbols['p'],
    top: 0,
    right: 0,
    height: 4,
    width: 1,
    style: {
      //bg: 'blue',
      bg: 'black',
      //inverse: true
    }
  });

  blessed.box({
    parent: symbols['p'],
    top: 0,
    left: 0,
    bottom: 0,
    width: 1,
    style: {
      //bg: 'blue',
      bg: 'black',
      //inverse: true
    }
  });

  blessed.box({
    parent: symbols['p'],
    top: 3,
    left: 0,
    right: 0,
    height: 1,
    style: {
      //bg: 'green'
      bg: 'black',
      //inverse: true
    }
  });

  symbols['p'].hide();

  /**
   * M
   */

  symbols['m'] = blessed.box({
    parent: container,
    top: 1,
    left: 0,
    width: 10,
    height: 7
  });

  blessed.box({
    parent: symbols['m'],
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    style: {
      //bg: 'red',
      bg: 'black',
      //inverse: true
    }
  });

  blessed.box({
    parent: symbols['m'],
    top: 0,
    left: 0,
    bottom: 0,
    width: 1,
    style: {
      //bg: 'blue',
      bg: 'black',
      //inverse: true
    }
  });

  blessed.box({
    parent: symbols['m'],
    top: 0,
    right: 0,
    bottom: 0,
    width: 1,
    style: {
      //bg: 'yellow'
      bg: 'black',
      //inverse: true
    }
  });

  blessed.box({
    parent: symbols['m'],
    top: 0,
    bottom: 0,
    left: 'center',
    width: 1,
    style: {
      //bg: 'magenta'
      bg: 'black',
      //inverse: true
    }
  });

  symbols['m'].hide();
}

screen.render();

function updateTime() {
  var d = new Date
    , im = 'am'
    , time
    , h
    , m
    , s;

  h = d.getHours();
  if (h > 12) {
    im = 'pm';
    h -= 12;
  }
  if (h < 10) {
    h = '0' + h;
  }

  m = d.getMinutes();
  if (m < 10) {
    m = '0' + m;
  }

  s = d.getSeconds();
  if (s < 10) {
    s = '0' + s;
  }

  if (process.argv[2] === '-s') {
    time = h + ':' + m + ':' + s + im;
  } else {
    time = h + ':' + m + im;
  }

  time = time.split('');

  Object.keys(positions).forEach(function(key) {
    var symbols = positions[key];
    Object.keys(symbols).forEach(function(key) {
      symbols[key].hide();
    });
  });

  var pos = 0;
  time.forEach(function(ch, i) {
    var symbols = positions[i];
    var symbol = symbols[ch];
    symbol.rleft = pos;
    pos += symbol.width + 1;
    symbol.show();
  });

  date.setContent((new Date()).toISOString());

  screen.render();
}

setInterval(updateTime, 1000);
updateTime();

screen.key('q', function() {
  process.exit(0);
});
