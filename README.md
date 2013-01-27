# blessed

A curses-like library for node.js.

As of right now, it does not read all terminfo. It was designed for one
terminal's terminfo: **xterm**.

I want this library to eventually become a high-level library for terminal
widgets.

## Example Usage

``` js
var Program = require('blessed')
  , program = new Program;

program.on('key', function(ch, key) {
  if (key.ctrl && key.name === 'c') {
    console.log('This would have been SIGINT!');
  }
});

program.setMouse({ normalMouse: true });

program.on('mouse', function(data) {
  console.log('Mouse event received:');
  console.log(data.button, data.x, data.y);
});

program.alternateBuffer();

program.clear();

program.bg('white');
program.fg('blue');
program.write('Hello world');
program.fg('!blue');
program.setx(1);
program.down(5);
program.write('Hi again!');
program.bg('!white');
program.feed();

program.getCursor(function(err, data) {
  if (!err) {
    console.log('Cursor is at: %s, %s.', data.x, data.y);
  }

  program.charset('SCLD');
  program.write('abcdefghijklmnopqrstuvwxyz0123456789');
  program.charset('US');
  program.setx(0);

  setTimeout(function() {
    program.eraseInLine('right');
    setTimeout(function() {
      program.clear();
      program.normalBuffer();
      program.setMouse({ normalMouse: false });
    }, 2000);
  }, 2000);
});
```

## License

Copyright (c) 2013, Christopher Jeffrey. (MIT License)

See LICENSE for more info.
