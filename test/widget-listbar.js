var blessed = require('../')
  , screen;

screen = blessed.screen({
  dump: __dirname + '/logs/listbar.log'
});

var box = blessed.box({
  parent: screen,
  top: 0,
  right: 0,
  width: 'shrink',
  height: 'shrink',
  content: '...'
});

var bar = blessed.listbar({
  parent: screen,
  bottom: 0,
  left: 0,
  height: 3,
  mouse: true,
  keys: true,
  autoCommandKeys: true,
  border: {
    type: 'line'
  },
  vi: true,
  style: {
    bg: 'green',
    item: {
      bg: 'red',
      hover: {
        bg: 'blue'
      },
      //focus: {
      //  bg: 'blue'
      //}
    },
    selected: {
      bg: 'blue'
    }
  },
  commands: {
    'one': function() {
      box.setContent('Pressed one.');
      screen.render();
    },
    'two': function() {
      box.setContent('Pressed two.');
      screen.render();
    },
    'three': function() {
      box.setContent('Pressed three.');
      screen.render();
    },
    'four': function() {
      box.setContent('Pressed four.');
      screen.render();
    },
    'five': function() {
      box.setContent('Pressed five.');
      screen.render();
    },
    'six': function() {
      box.setContent('Pressed six.');
      screen.render();
    },
    'seven': function() {
      box.setContent('Pressed seven.');
      screen.render();
    },
    'eight': function() {
      box.setContent('Pressed eight.');
      screen.render();
    },
    'nine': function() {
      box.setContent('Pressed nine.');
      screen.render();
    },
    'ten': function() {
      box.setContent('Pressed ten.');
      screen.render();
    },
    'eleven': function() {
      box.setContent('Pressed eleven.');
      screen.render();
    },
    'twelve': function() {
      box.setContent('Pressed twelve.');
      screen.render();
    },
    'thirteen': function() {
      box.setContent('Pressed thirteen.');
      screen.render();
    },
    'fourteen': function() {
      box.setContent('Pressed fourteen.');
      screen.render();
    },
    'fifteen': function() {
      box.setContent('Pressed fifteen.');
      screen.render();
    }
  }
});

bar.focus();

screen.key('q', function() {
  return process.exit(0);
});

screen.render();
