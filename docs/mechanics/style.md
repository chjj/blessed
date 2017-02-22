#### Style

The style option controls most of the visual aspects of an element.

``` js
  style: {
    fg: 'blue',
    bg: 'black',
    bold: true,
    underline: false,
    blink: false,
    inverse: false,
    invisible: false,
    transparent: false,
    border: {
      fg: 'blue',
      bg: 'red'
    },
    scrollbar: {
      bg: 'blue'
    },
    focus: {
      bg: 'red'
    },
    hover: {
      bg: 'red'
    }
  }
```


##### Colors

Colors can be the names of any of the 16 basic terminal colors, along with hex
values (e.g. `#ff0000`) for 256 color terminals. If 256 or 88 colors is not
supported. Blessed with reduce the color to whatever is available.


##### Attributes

Blessed supports all terminal attributes, including `bold`, `underline`,
`blink`, `inverse`, and `invisible`. Attributes are represented as bools in the
`style` object.


##### Transparency

Blessed can set the opacity of an element to 50% using `style.transparent =
true;`. While this seems like it normally shouldn't be possible in a terminal,
blessed will use a color blending algorithm to blend the element of the
foremost element with the background behind it. Obviously characters cannot be
blended, but background colors can.


##### Shadow

Translucent shadows are also an option when it comes to styling an element.
This option will create a 50% opacity 2-cell wide, 1-cell high shadow offset to
the bottom-right.

``` js
shadow: true
```


##### Effects

Blessed supports hover and focus styles. (Hover is only useful is mouse input
is enabled).

``` js
  style: {
    hover: {
      bg: 'red'
    },
    focus: {
      border: {
        fg: 'blue'
      }
    }
  }
```


##### Scrollbar

On scrollable elements, blessed will support style options for the scrollbar,
such as:

``` js
style: {
  scrollbar: {
    bg: 'red',
    fg: 'blue'
  }
}
```

As a main option, scrollbar will either take a bool or an object:

``` js
scrollbar: {
  ch: ' '
}
```

Or:

``` js
scrollbar: true
```


