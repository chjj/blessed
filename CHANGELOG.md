# Blessed v0.1.0 - new terminal goodies for node.js

![blessed](https://raw.githubusercontent.com/chjj/blessed/master/img/v0.1.0-3.gif)

The features demonstrated in the above gif __element transparency/shadow__ and
__border docking__.

## New useful options for your typewriter application:

- __`transparent` option__ - Lower element opacity to 50%. This will display
  dimmed elements and content behind the foreground element using a naive color
  blending function (good enough for a terminal's limited amount of colors).
  works best with 256color terminals. (see widget-shadow.js)

- __`shadow` option__ - Give the element a translucent shadow. Automatically
  darkens the background behind it. (see widget-shadow.js)

- __`dockBorders` option__ - Element borders will automatically "dock" to each
  other. Instead of overlapping the borders end up connecting. (see
  widget-dock.js)

- __`autoPadding` default__ - Auto padding is now enabled by default, meaning
  blessed will automatically position elements inside their parent's border.

- __`rleft` property__ - Relative offsets are now default element properties
  (`left` instead of `rleft`).

- __`draggable` property__ - Make any element draggable with the mouse. (see
  widget-shadow.js or widget-dock.js)

- __`Table` and `ListTable` elements__ - Tables with a high quality rendering.
  (see widget-table.js and widget-listtable.js)

- __`Log` element__ - A top to bottom logger box with scrollback and other
  features. (see widget-log.js)

- __Obscurable borders__ - In addition to docking borders, it's possible to
  obscure borders by sliding them off the screen with negative offsets. (see
  widget-dock.js)

- __Percentage expressions__ - Like CSS, arithmetic can now be performed on
  percentages. e.g. `width: '50%-1'`. This is useful for overlapping borders on
  elements with a percentage width. (see widget-dock.js)

## Other features that weren't mentioned before:

- __`setHover` option__ - Set a hover text box to follow cursor on mouseover,
  similar to how a web browser handles the "title" attribute. (see widget.js)

- __`Terminal` element__ - Spin up a pseudo terminal as a blessed element.
  useful for writing a terminal multiplexer. (requires term.js and pty.js as
  optional dependencies). (see example/multiplex.js)

- __`Image` element__ - Uses `w3mimgdisplay` to draw real images your terminal.
  this is much easier than calling w3mimgdisplay by hand. Image elements behave
  like any other element, although it is wise to use `width: 'shrink', height:
  'shrink'`. (see widget-image.js)

---

The major things that justified the 0.1.0 release were fixes and stabilization
of api (`autoPadding`/`rleft`/`left`). Scrolling boxes were almost completely
revamped to work a bit smarter.

---

## Things yet to come:

- __@secrettriangle's [improvements](https://github.com/slap-editor/slap) for
  textareas__ - This allows for real text navigation.

- __Gravity and margin layouts__

This is something that's been in the idea bin for a while. Every element could
potentially have properties like:

```
  gravity: 'bottomleft',
  margin: 5,
``

In other words, just a more complex `float` system than what the CSSOM is used
to.
