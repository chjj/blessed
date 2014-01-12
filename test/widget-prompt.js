var blessed = require('../');

var screen = blessed.screen({
  tput: true,
  smartCSR: true,
  dump: __dirname + '/logs/prompt.log',
  autoPadding: true
});

var prompt = blessed.prompt({
  parent: screen,
  border: {
    type: 'ascii'
  },
  height: 'shrink',
  width: 'half',
  top: 'center',
  left: 'center',
  label: ' {blue-fg}Prompt{/blue-fg} ',
  tags: true,
  keys: true,
  vi: true
});

var question = blessed.question({
  parent: screen,
  border: {
    type: 'ascii'
  },
  height: 'shrink',
  width: 'half',
  top: 'center',
  left: 'center',
  label: ' {blue-fg}Question{/blue-fg} ',
  tags: true,
  keys: true,
  vi: true
});

var msg = blessed.message({
  parent: screen,
  border: {
    type: 'ascii'
  },
  height: 'shrink',
  width: 'half',
  top: 'center',
  left: 'center',
  label: ' {blue-fg}Message{/blue-fg} ',
  tags: true,
  keys: true,
  hidden: true,
  vi: true
});

var loader = blessed.loading({
  parent: screen,
  border: {
    type: 'ascii'
  },
  height: 'shrink',
  width: 'half',
  top: 'center',
  left: 'center',
  label: ' {blue-fg}Loader{/blue-fg} ',
  tags: true,
  keys: true,
  hidden: true,
  vi: true
});

prompt.type('Question?', '', function(err, value) {
  question.ask('Question?', function(err, value) {
    msg.display('Hello world!', 3, function(err) {
      msg.display('Hello world again!', -1, function(err) {
        loader.load('Loading...');
        setTimeout(function() {
          loader.stop();
          process.exit(0);
        }, 3000);
      });
    });
  });
});

screen.key('q', function() {
  process.exit(0);
});

screen.render();
