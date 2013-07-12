# blessed

A curses-like library for node.js.

Blessed was originally written to only support the xterm terminfo, but can
now parse and compile any terminfo to be completely portable accross all
terminals. See the `tput` example below.

Blessed also includes an extremely high-level widget library.


## Example Usage

This will actually parse the xterm terminfo and compile every
string capability to a javascript function:

``` js
var Tput = require('blessed').Tput
  , tput = Tput('xterm');

console.log(tput.setaf(4) + 'hello' + tput.sgr0());
```

To play around with it on the command line, it works just like tput:

``` bash
$ tput.js setaf 2
$ tput.js sgr0
$ echo "$(tput.js setaf 2)hello world$(tput.js sgr0)"
```

The main functionality is exposed in the main `blessed` module:

``` js
var blessed = require('blessed')
  , program = blessed();

program.key('q', function(ch, key) {
  program.clear();
  program.disableMouse();
  program.showCursor();
  program.normalBuffer();
  process.exit(0);
});

program.on('mouse', function(data) {
  if (data.action === 'mousemove') {
    program.move(data.x, data.y);
    program.bg('red');
    program.write('x');
    program.bg('!red');
  }
});

program.alternateBuffer();
program.enableMouse();
program.hideCursor();
program.clear();

program.move(1, 1);
program.bg('black');
program.write('Hello world', 'blue fg');
program.setx((program.cols / 2 | 0) - 4);
program.down(5);
program.write('Hi again!');
program.bg('!black');
program.feed();
```


## High-level Documentation

### Example

This will render a box with ascii borders containing the text 'Hello world!',
perfectly centered horizontally and vertically.

``` js
var blessed = require('blessed')
  , screen = new blessed.Screen;

var box = new blessed.Box({
  top: 'center',
  left: 'center',
  width: '50%',
  height: '50%',
  border: {
    type: 'ascii',
    fg: 'white'
  },
  fg: 'white',
  bg: 'magenta',
  content: 'Hello world!',
  tags: true
});

screen.append(box);

box.on('click', function(data) {
  box.setContent('{center}Some different {red-fg}content{/red-fg}.{/center}');
  screen.render();
});

screen.key('escape', function(ch, key) {
  return process.exit(0);
});

screen.render();
```


### Widgets

Blessed comes with a number of high-level widgets so you can avoid all the
nasty low-level terminal stuff.


#### Node (from EventEmitter)

The base node which everything inherits from.

##### Options:

- **screen** - the screen to be associated with.
- **parent** - the desired parent.
- **children** - an arrray of children.

##### Properties:

- inherits all from EventEmitter.
- **options** - original options object.
- **parent** - parent node.
- **screen** - parent screen.
- **children** - array of node's children.
- **data, _, $** - an object for any miscellanous user data.
- **index** - render index (document order index) of the last render call.

##### Events:

- inherits all from EventEmitter.
- **adopt** - received when node is added to a parent.
- **remove** - received when node is removed from it's current parent.
- **reparent** - received when node gains a new parent.
- **attach** - received when node is attached to the screen directly or
  somewhere in its ancestry.
- **detach** - received when node is detached from the screen directly or
  somewhere in its ancestry.

##### Methods:

- inherits all from EventEmitter.
- **prepend(node)** - prepend a node to this node's children.
- **append(node)** - append a node to this node's children.
- **remove(node)** - remove child node from node.
- **detach()** - remove node from its parent.
- **emitDescendants(type, args..., [iterator])** - emit event for element, and
  recursively emit same event for all descendants.
- **get(name, [default])** - get user property with a potential default value.
- **set(name, value)** - set user property to value.


#### Screen (from Node)

The screen on which every other node renders.

##### Options:

- **program** - the blessed Program to be associated with.

##### Properties:

- inherits all from Node.
- **program** - the blessed Program object.
- **tput** - the blessed Tput object (only available if you passed `tput: true`
  to the Program constructor.)
- **focused** - top of the focus history stack.
- **width** - width of the screen (same as `program.cols`).
- **height** - height of the screen (same as `program.rows`).
- **cols** - same as `screen.width`.
- **rows** - same as `screen.height`.
- **left**, **rleft** - left offset, always zero.
- **right**, **rright** - right offset, always zero.
- **top**, **rtop** - top offset, always zero.
- **bottom**, **rbottom** - bottom offset, always zero.
- **grabKeys** - whether the focused element grabs all keypresses.
- **lockKeys** - prevent keypresses from being received by any element.
- **hover** - the currently hovered element. only set if mouse events are bound.

##### Events:

- inherits all from Node.
- **resize** - received on screen resize.
- **mouse** - received on mouse events.
- **keypress** - received on key events.
- **element [name]** - global events received for all elements.
- **key [name]** - received on key event for [name].

##### Methods:

- inherits all from Node.
- **alloc()** - allocate a new pending screen buffer and a new output screen
  buffer.
- **draw(start, end)** - draw the screen based on the contents of the screen
  buffer.
- **render()** - render all child elements, writing all data to the screen
  buffer and drawing the screen.
- **clearRegion(x1, x2, y1, y2)** - clear any region on the screen.
- **fillRegion(attr, ch, x1, x2, y1, y2)** - fill any region with a character
  of a certain attribute.
- **focus(offset)** - focus element by offset of focusable elements.
- **focusPrev()** - focus previous element in the index.
- **focusNext()** - focus next element in the index.
- **focusPush(element)** - push element on the focus stack (equivalent to
  `screen.focused = el`).
- **focusPop()/focusLast()** - pop element off the focus stack.
- **saveFocus()** - save the focused element.
- **restoreFocus()** - restore the saved focused element.
- **key(name, listener)** - bind a keypress listener for a specific key.
- **onceKey(name, listener)** - bind a keypress listener for a specific key
  once.
- **unkey(name, listener)** - remove a keypress listener for a specific key.
- **spawn(file, args, options)** - spawn a process in the foreground, return to
  blessed app after exit.
- **exec(file, args, options, callback)** - spawn a process in the foreground,
  return to blessed app after exit. executes callback on error or exit.
- **readEditor([options], callback)** - read data from text editor.
- **setEffects(el, fel, over, out, effects, temp)** - set effects based on
  two events and attributes.
- **insertLine(n, y, top, bottom)** - insert a line into the screen (using csr:
  this bypasses the output buffer).
- **deleteLine(n, y, top, bottom)** - delete a line from the screen (using csr:
  this bypasses the output buffer).
- **insertBottom(top, bottom)** - insert a line at the bottom of the screen.
- **insertTop(top, bottom)** - insert a line at the top of the screen.
- **deleteBottom(top, bottom)** - delete a line at the bottom of the screen.
- **deleteTop(top, bottom)** - delete a line at the top of the screen.


#### Element (from Node)

The base element.

##### Options:

- **fg, bg, bold, underline** - attributes.
- **border** - border object, see below.
- **content** - element's text content.
- **clickable** - element is clickable.
- **input** - element is focusable and can receive key input.
- **hidden** - whether the element is hidden.
- **label** - a simple text label for the element.
- **align** - text alignment: `left`, `center`, or `right`.
- **shrink** - shrink/flex/grow to content width during render.
- **padding** - amount of padding on the inside of the element. **(does not work...yet)**

##### Properties:

- inherits all from Node.
- **border** - border object.
  - **type** - type of border (`ascii` or `bg`). `bg` by default.
  - **ch** - character to use if `bg` type, default is space.
  - **bg, fg** - border foreground and background, must be numbers (-1 for
    default).
  - **bold, underline** - border attributes.
- **position** - raw width, height, and offsets.
- **content** - text content.
- **hidden** - whether the element is hidden or not.
- **fg, bg** - foreground and background, must be numbers (-1 for default).
- **bold, underline** - attributes.
- **width** - calculated width.
- **height** - calculated height.
- **left** - calculated absolute left offset.
- **right** - calculated absolute right offset.
- **top** - calculated absolute top offset.
- **bottom** - calculated absolute bottom offset.
- **rleft** - calculated relative left offset.
- **rright** - calculated relative right offset.
- **rtop** - calculated relative top offset.
- **rbottom** - calculated relative bottom offset.

##### Events:

- inherits all from Node.
- **blur, focus** - received when an element is focused or unfocused.
- **mouse** - received on mouse events for this element.
  - **mousedown, mouseup** - mouse button was pressed or released.
  - **wheeldown, wheelup** - wheel was scrolled down or up.
  - **mouseover, mouseout** - element was hovered or unhovered.
  - **mousemove** - mouse was moved somewhere on this element.
- **keypress** - received on key events for this element.
- **move** - received when the element is moved.
- **resize** - received when the element is resized.
- **key [name]** - received on key event for [name].

##### Methods:

- inherits all from Node.
- **render()** - write content and children to the screen buffer.
- **setContent(text)** - set the content.
- **hide()** - hide element.
- **show()** - show element.
- **toggle()** - toggle hidden/shown.
- **focus()** - focus element.
- **key(name, listener)** - bind a keypress listener for a specific key.
- **onceKey(name, listener)** - bind a keypress listener for a specific key
  once.
- **unkey(name, listener)** - remove a keypress listener for a specific key.
- **onScreenEvent(type, listener)** - same as`el.on('screen', ...)` except this
  will automatically cleanup listeners after the element is detached.


#### Box (from Element)

A box element which draws a simple box containing `content` or other elements.

##### Options:

- inherits all from Element.

##### Properties:

- inherits all from Element.

##### Events:

- inherits all from Element.

##### Methods:

- inherits all from Element.
- **insertLine(i, line)** - insert a line into the box's content.
- **deleteLine(i)** - delete a line from the box's content.
- **getLine(i)** - get a line from the box's content.
- **setLine(i, line)** - set a line in the box's content.
- **clearLine(i)** - clear a line from the box's content.
- **insertTop(line)** - insert a line at the top of the box.
- **insertBottom(line)** - insert a line at the bottom of the box.
- **deleteTop()** - delete a line at the top of the box.
- **deleteBottom()** - delete a line at the bottom of the box.


#### Line (from Box)

A simple line which can be `ascii` or `bg` styled.

##### Options:

- inherits all from Box.
- **orientation** - can be `vertical` or `horizontal`.
- **type, bg, fg, ch** - treated the same as a border object.

Inherits all options, properties, events, and methods from Box.


#### Text (from Element)

An element similar to Box, but geared towards rendering simple text elements.

##### Options:

- inherits all from Element.
- **fill** - fill the entire line with chosen bg until parent bg ends, even if
  there is not enough text to fill the entire width. **(deprecated)**
- **align** - text alignment: `left`, `center`, or `right`.

Inherits all options, properties, events, and methods from Element.


#### Line (from Box)

A simple line which can be `ascii` or `bg` styled.

##### Options:

- inherits all from Box.
- **orientation** - can be `vertical` or `horizontal`.
- **type, bg, fg, ch** - treated the same as a border object.

Inherits all options, properties, events, and methods from Box.


#### ScrollableBox (from Box)

A box with scrollable content.

##### Options:

- inherits all from Box.
- **baseLimit** - a limit to the childBase. default is `Infinity`.
- **alwaysScroll** - a option which causes the ignoring of `childOffset`. this
  in turn causes the childBase to change every time the element is scrolled.
- **scrollbar** - object enabling a scrollbar. allows `ch`, `fg`, and `bg`
  properties.

##### Properties:

- inherits all from Box.
- **childBase** - the offset of the top of the scroll content.
- **childOffset** - the offset of the chosen item (if there is one).

##### Events:

- inherits all from Box.
- **scroll** - received when the element is scrolled.
- **resetScroll** - reset scroll offset to zero.

##### Methods:

- **scroll(offset)** - scroll the content by an offset.


#### List (from ScrollableBox)

A scrollable list which can display selectable items.

##### Options:

- inherits all from ScrollableBox.
- **selectFg, selectedBg** - foreground and background for selected item,
  treated like fg and bg.
- **selectedBold, selectedUnderline** - character attributes for selected item,
  treated like bold and underline.
- **mouse** - whether to automatically enable mouse support for this list
  (allows clicking items).
- **keys** - use predefined keys for navigating the list.
- **vi** - use vi keys with the `keys` option.
- **items** - an array of strings which become the list's items.

##### Properties:

- inherits all from ScrollableBox.

##### Events:

- inherits all from ScrollableBox.
- **select** - received when an item is selected.
- **cancel** - list was canceled (when `esc` is pressed with the `keys` option).
- **action** - either a select or a cancel event was received.

##### Methods:

- inherits all from ScrollableBox.
- **add(text)** - add an item based on a string.
- **select(index)** - select an index of an item.
- **move(offset)** - select item based on current offset.
- **up(amount)** - select item above selected.
- **down(amount)** - select item below selected.


#### ScrollableText (from ScrollableBox)

A scrollable text box which can display and scroll text, as well as handle
pre-existing newlines and escape codes.

##### Options:

- inherits all from ScrollableBox.
- **mouse** - whether to enable automatic mouse support for this element.
- **keys** - use predefined keys for navigating the text.
- **vi** - use vi keys with the `keys` option.

##### Properties:

- inherits all from ScrollableBox.

##### Events:

- inherits all from ScrollableBox.

##### Methods:

- inherits all from ScrollableBox.

#### Input (from Box)

A form input.


#### Textbox (from Input)

A box which allows text input.

##### Options:

- inherits all from Input.

##### Properties:

- inherits all from Input.

##### Events:

- inherits all from Input.

##### Methods:

- inherits all from Input.
- **readInput(callback)** - grab key events and start reading text from the
  keyboard. takes a callback which receives the final value.
- **readEditor(callback)** - open text editor in `$EDITOR`, read the output from
  the resulting file. takes a callback which receives the final value.
- **clearInput** - clear input.


#### Textarea (from Input/ScrollableText)

A box which allows multiline text input.

##### Options:

- inherits all from Input/ScrollableText.

##### Properties:

- inherits all from Input/ScrollableText.

##### Events:

- inherits all from Input/ScrollableText.

##### Methods:

- inherits all from Input/ScrollableText.
- **readInput(callback)** - grab key events and start reading text from the
  keyboard. takes a callback which receives the final value.
- **readEditor(callback)** - open text editor in `$EDITOR`, read the output from
  the resulting file. takes a callback which receives the final value.
- **clearInput** - clear input.


#### Button (from Input)

A button which can be focused and allows key and mouse input.

##### Options:

- inherits all from Input.

##### Properties:

- inherits all from Input.

##### Events:

- inherits all from ScrollableBox.
- **press** - received when the button is clicked/pressed.

##### Methods:

- inherits all from ScrollableBox.
- **add(text)** - add an item based on a string.
- **select(index)** - select an index of an item.
- **move(offset)** - select item based on current offset.
- **up(amount)** - select item above selected.
- **down(amount)** - select item below selected.


#### ProgressBar (from Input)

A progress bar allowing various styles.

##### Options:

- inherits all from Input.
- **barFg, barBg** - (completed) bar foreground and background.
- **ch** - the character to fill the bar with (default is space).
- **filled** - the amount filled (0 - 100).

##### Properties:

- inherits all from Input.

##### Events:

- inherits all from Input.
- **reset** - bar was reset.
- **complete** - bar has completely filled.

##### Methods:

- inherits all from Input.
- **progress(amount)** - progress the bar by a fill amount.
- **reset()** - reset the bar.


### Positioning

Offsets may be a number, a percentage (e.g. `50%`), or a keyword (e.g.
`center`).

Dimensions may be a number, or a percentage (e.g. `50%`).

Positions are treated almost *exactly* the same as they are in CSS/CSSOM when
an element has the `position: absolute` CSS property.

When an element is created, it can be given coordinates in its constructor:

``` js
var box = blessed.box({
  left: 'center',
  top: 'center',
  bg: 'yellow',
  width: '50%',
  height: '50%'
});
```

This tells blessed to create a box, perfectly centered **relative to its
parent**, 50% as wide and 50% as tall as its parent.

To access the calculated offsets, relative to the parent:

``` js
console.log(box.rleft);
console.log(box.rtop);
```

To access the calculated offsets, absolute (relative to the screen):

``` js
console.log(box.left);
console.log(box.top);
```

#### Overlapping offsets and dimensions greater than parents'

This still needs to be tested a bit, but it should work.


### Content

Every element can have text content via `setContent`. If `tags: true` was
passed to the element's constructor, the content can contain tags. For example:

```
box.setContent('hello {red-fg}{green-bg}{bold}world{/bold}{/green-bg}{/red-fg}');
```

To make this more concise `{/}` cancels all character attributes.

```
box.setContent('hello {red-fg}{green-bg}{bold}world{/}');
```

Newlines and alignment are also possible in content.

``` js
box.setContent('hello\n'
  + '{right}world{/right}\n'
  + '{center}foo{/center}');
```

This will produce a box that looks like:

```
| hello                 |
|                 world |
|          foo          |
```

Content can also handle SGR escape codes. This means if you got output from a
program, say `git log` for example, you can feed it directly to an element's
content and the colors will be parsed appropriately.

This means that while `{red-fg}foo{/red-fg}` produces `^[[31mfoo^[[39m`, you
could just feed `^[[31mfoo^[[39m` directly to the content.


### Rendering

To actually render the screen buffer, you must call `render`.

``` js
box.setContent('Hello world.');
screen.render();
```

Elements are rendered with the lower elements in the children array being
painted first. In terms of the painter's algorithm, the lowest indicies in the
array are the furthest away, just like in the DOM.


### Optimization and CSR

You may notice a lot of terminal apps (e.g. mutt, irssi, vim, ncmpcpp) don't
have sidebars, and only have "elements" that take up the entire width of the
screen. The reason for this is speed (and general cleanliness). VT-like
terminals have something called a CSR (change_scroll_region) code, as well as
IL (insert_line), and DL (delete_code) codes. Using these three codes, it is
possible to create a very efficient rendering by avoiding redrawing the entire
screen when a line is inserted or removed. Since blessed is extremely dynamic,
it is hard to do this optimization automatically (blessed assumes you may
create any element of any width in any position). So, there is a solution:

``` js
var box = blessed.box(...);
box.setContent('line 1\nline 2');
box.insertBottom('line 3');
box.insertBottom('line 4');
box.insertTop('line 0');
box.insertLine(1, 'line 1.5');
```

If your element has the same width as the screen, the line insertion will be
optimized by using a combination CSR/IL/DL codes. These methods may be made
smarter in the future to detect whether any elements are being overlapped to
the sides.

Outputting:

```
| line 0            |
| line 1            |
| line 1.5          |
| line 2            |
| line 3            |
| line 4            |
```


### Testing

- For an interactive test, see `test/widget.js`.
- For a less interactive position testing, see `test/widget-pos.js`.


## License

Copyright (c) 2013, Christopher Jeffrey. (MIT License)

See LICENSE for more info.
