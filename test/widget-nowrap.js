var fs = require('fs')
  , blessed = require('../')
  , screen;

// {open}xxxx{close} xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx
// xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx {red-bg}xxxx xxxx xxxx{/red-bg}

screen = blessed.screen({
  dump: __dirname + '/logs/nowrap.log'
});

var box = blessed.box({
  parent: screen,
  width: 60,
  wrap: false,
  tags: true,
  content: fs.readFileSync(__filename, 'utf8')
});

box.focus();

screen.key('q', function() {
  return process.exit(0);
});

screen.render();
