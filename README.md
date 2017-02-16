# blessed

A curses-like library with a high level terminal interface API for node.js.

![blessed](https://raw.githubusercontent.com/chjj/blessed/master/img/v0.1.0-3.gif)

Blessed is over 16,000 lines of code and terminal goodness. It's completely
implemented in javascript, and its goal consists of two things:

1. Reimplement ncurses entirely by parsing and compiling terminfo and termcap,
and exposing a `Program` object which can output escape sequences compatible
with _any_ terminal.

2. Implement a widget API which is heavily optimized for terminals.

The blessed renderer makes use of CSR (change-scroll-region), and BCE
(back-color-erase). It draws the screen using the painter's algorithm and is
sped up with smart cursor movements and a screen damage buffer. This means
rendering of your application will be extremely efficient: blessed only draws
the changes (damage) to the screen.

Blessed is arguably as accurate as ncurses, but even more optimized in some
ways. The widget library gives you an API which is reminiscent of the DOM.
Anyone is able to make an awesome terminal application with blessed. There are
terminal widget libraries for other platforms (primarily [python][urwid] and
[perl][curses-ui]), but blessed is possibly the most DOM-like (dare I say the
most user-friendly?).

Blessed has been used to implement other popular libraries and programs.
Examples include: the [slap text editor][slap] and [blessed-contrib][contrib].
The blessed API itself has gone on to inspire [termui][termui] for Go.

## Install

``` bash
$ npm install blessed
```

## Example

This will render a box with line borders containing the text `'Hello world!'`,
perfectly centered horizontally and vertically.

__NOTE__: It is recommend you use either `smartCSR` or `fastCSR` as a
`blessed.screen` option. This will enable CSR when scrolling text in elements
or when manipulating lines.

``` js
var blessed = require('blessed');

// Create a screen object.
var screen = blessed.screen({
  smartCSR: true
});

screen.title = 'my window title';

// Create a box perfectly centered horizontally and vertically.
var box = blessed.box({
  top: 'center',
  left: 'center',
  width: '50%',
  height: '50%',
  content: 'Hello {bold}world{/bold}!',
  tags: true,
  border: {
    type: 'line'
  },
  style: {
    fg: 'white',
    bg: 'magenta',
    border: {
      fg: '#f0f0f0'
    },
    hover: {
      bg: 'green'
    }
  }
});

// Append our box to the screen.
screen.append(box);

// Add a png icon to the box
var icon = blessed.image({
  parent: box,
  top: 0,
  left: 0,
  type: 'overlay',
  width: 'shrink',
  height: 'shrink',
  file: __dirname + '/my-program-icon.png',
  search: false
});

// If our box is clicked, change the content.
box.on('click', function(data) {
  box.setContent('{center}Some different {red-fg}content{/red-fg}.{/center}');
  screen.render();
});

// If box is focused, handle `enter`/`return` and give us some more content.
box.key('enter', function(ch, key) {
  box.setContent('{right}Even different {black-fg}content{/black-fg}.{/right}\n');
  box.setLine(1, 'bar');
  box.insertLine(1, 'foo');
  screen.render();
});

// Quit on Escape, q, or Control-C.
screen.key(['escape', 'q', 'C-c'], function(ch, key) {
  return process.exit(0);
});

// Focus our element.
box.focus();

// Render the screen.
screen.render();
```

## Contribution and License Agreement

If you contribute code to this project, you are implicitly allowing your code
to be distributed under the MIT license. You are also implicitly verifying that
all code is your original work. `</legalese>`


## License

Copyright (c) 2013-2015, Christopher Jeffrey. (MIT License)

See LICENSE for more info.

[slap]: https://github.com/slap-editor/slap
[contrib]: https://github.com/yaronn/blessed-contrib
[termui]: https://github.com/gizak/termui
[curses]: https://en.wikipedia.org/wiki/Curses_(programming_library)
[ncurses]: https://en.wikipedia.org/wiki/Ncurses
[urwid]: http://urwid.org/reference/index.html
[curses-ui]: http://search.cpan.org/~mdxi/Curses-UI-0.9609/lib/Curses/UI.pm
[termbox]: https://github.com/nsf/termbox-go
[ttystudio]: https://github.com/chjj/ttystudio#choosing-a-new-font-for-your-terminal-recording
