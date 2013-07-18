var blessed = require('../')
  , screen = blessed.screen();

var main = blessed.box({
  width: screen.width,
  height: screen.height,
  bg: 'yellow',
  top: 0,
  left: 0,
  content: 'Welcome to my program\na\nb\nc\nd\ne\nf\ng\nh'
});

screen.append(main);

screen.render();

screen.insertTop(1, screen.height - 3);
//screen.insertBottom(1, screen.height - 3);
//screen.insertBottom(1, screen.height - 3);

screen.on('keypress', function(ch, key) {
  if (key.name === 'q') return process.exit(0);
});
