##### Server Side Usage

A simple telnet server might look like this (see examples/blessed-telnet.js for
a full example):

``` js
var blessed = require('blessed');
var telnet = require('telnet2');

telnet({ tty: true }, function(client) {
  client.on('term', function(terminal) {
    screen.terminal = terminal;
    screen.render();
  });

  client.on('size', function(width, height) {
    client.columns = width;
    client.rows = height;
    client.emit('resize');
  });

  var screen = blessed.screen({
    smartCSR: true,
    input: client,
    output: client,
    terminal: 'xterm-256color',
    fullUnicode: true
  });

  client.on('close', function() {
    if (!screen.destroyed) {
      screen.destroy();
    }
  });

  screen.key(['C-c', 'q'], function(ch, key) {
    screen.destroy();
  });

  screen.on('destroy', function() {
    if (client.writable) {
      client.destroy();
    }
  });

  screen.data.main = blessed.box({
    parent: screen,
    left: 'center',
    top: 'center',
    width: '80%',
    height: '90%',
    border: 'line',
    content: 'Welcome to my server. Here is your own private session.'
  });

  screen.render();
}).listen(2300);
```

Once you've written something similar and started it, you can simply telnet
into your blessed app:

``` bash
$ telnet localhost 2300
```

Creating a netcat server would also work as long as you disable line buffering
and terminal echo on the commandline via `stty`:
`$ stty -icanon -echo; ncat localhost 2300; stty icanon echo`

Or by using netcat's `-t` option: `$ ncat -t localhost 2300`

Creating a streaming http 1.1 server than runs in the terminal is possible by
curling it with special arguments: `$ curl -sSNT. localhost:8080`.

There are currently no examples of netcat/nc/ncat or http->curl servers yet.

---

The `blessed.screen` constructor can accept `input`, `output`, and `term`
arguments to aid with this. The multiple screens will be managed internally by
blessed. The programmer just has to keep track of the references, however, to
avoid ambiguity, it's possible to explicitly dictate which screen a node is
part of by using the `screen` option when creating an element.

The `screen.destroy()` method is also crucial: this will clean up all event
listeners the screen has bound and make sure it stops listening on the event
loop. Make absolutely certain to remember to clean up your screens once you're
done with them.

A tricky part is making sure to include the ability for the client to send the
TERM which is reset on the serverside, and the terminal size, which is should
also be reset on the serverside. Both of these capabilities are demonstrated
above.

For a working example of a blessed telnet server, see
`examples/blessed-telnet.js`.



