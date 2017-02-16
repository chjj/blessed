#### Terminal (from Box)

A box which spins up a pseudo terminal and renders the output. Useful for
writing a terminal multiplexer, or something similar to an mc-like file
manager. Requires term.js and pty.js to be installed. See
`example/multiplex.js` for an example terminal multiplexer.

##### Options:

- Inherits all from Box.
- __handler__ - Handler for input data.
- __shell__ - Name of shell. `$SHELL` by default.
- __args__ - Args for shell.
- __cursor__ - Can be `line`, `underline`, and `block`.
- __terminal__ - Terminal name (Default: `xterm`).
- __env__ - Object for process env.
- Other options similar to term.js'.

##### Properties:

- Inherits all from Box.
- __term__ - Reference to the headless term.js terminal.
- __pty__ - Reference to the pty.js pseudo terminal.

##### Events:

- Inherits all from Box.
- __title__ - Window title from terminal.
- Other events similar to ScrollableBox.

##### Methods:

- Inherits all from Box.
- __write(data)__ - Write data to the terminal.
- __screenshot([xi, xl, yi, xl])__ - Nearly identical to `element.screenshot`,
  however, the specified region includes the terminal's _entire_ scrollback,
  rather than just what is visible on the screen.
- Other methods similar to ScrollableBox.


