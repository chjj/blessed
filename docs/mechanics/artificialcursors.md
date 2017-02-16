#### Artificial Cursors

Terminal cursors can be tricky. They all have different custom escape codes to
alter. As an _experimental_ alternative, blessed can draw a cursor for you,
allowing you to have a custom cursor that you control.

``` js
var screen = blessed.screen({
  cursor: {
    artificial: true,
    shape: 'line',
    blink: true,
    color: null // null for default
  }
});
```

That's it. It's controlled the same way as the regular cursor.

To create a custom cursor:

``` js
var screen = blessed.screen({
  cursor: {
    artificial: true,
    shape: {
      bg: 'red',
      fg: 'white',
      bold: true,
      ch: '#'
    },
    blink: true
  }
});
```


