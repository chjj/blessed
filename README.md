# blessed

A curses-like library with a high level terminal interface API for node.js.

![blessed](https://raw.github.com/chjj/blessed/master/img/screenshot.png)

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
`blessed.screen` option. `autoPadding` is also recommended; it will
automatically offset box content within borders instead of on top of them when
coords are `0`. non-`autoPadding` _may_ be deprecated in the future. See the
API documentation for further explanation of these options.

``` js
var blessed = require('blessed');

// Create a screen object.
var screen = blessed.screen({
  autoPadding: true,
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

// Add a PNG icon to the box (X11 only)
var icon = blessed.image({
  parent: box,
  top: 0,
  left: 0,
  width: 'shrink',
  height: 'shrink',
  file: __dirname + '/my-program-icon.png'
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


## High-level Documentation

### Widgets

Blessed comes with a number of high-level widgets so you can avoid all the
nasty low-level terminal stuff.


#### Node (from EventEmitter)

The base node which everything inherits from.

##### Options:

- __screen__ - the screen to be associated with.
- __parent__ - the desired parent.
- __children__ - an arrray of children.

##### Properties:

- inherits all from EventEmitter.
- __type__ - type of the node (e.g. `box`).
- __options__ - original options object.
- __parent__ - parent node.
- __screen__ - parent screen.
- __children__ - array of node's children.
- __data, _, $__ - an object for any miscellanous user data.
- __index__ - render index (document order index) of the last render call.

##### Events:

- inherits all from EventEmitter.
- __adopt__ - received when node is added to a parent.
- __remove__ - received when node is removed from it's current parent.
- __reparent__ - received when node gains a new parent.
- __attach__ - received when node is attached to the screen directly or
  somewhere in its ancestry.
- __detach__ - received when node is detached from the screen directly or
  somewhere in its ancestry.

##### Methods:

- inherits all from EventEmitter.
- __prepend(node)__ - prepend a node to this node's children.
- __append(node)__ - append a node to this node's children.
- __remove(node)__ - remove child node from node.
- __insert(node, i)__ - insert a node to this node's children at index `i`.
- __insertBefore(node, refNode)__ - insert a node to this node's children
  before the reference node.
- __insertAfter(node, refNode)__ - insert a node from node after the reference
  node.
- __detach()__ - remove node from its parent.
- __emitDescendants(type, args..., [iterator])__ - emit event for element, and
  recursively emit same event for all descendants.
- __get(name, [default])__ - get user property with a potential default value.
- __set(name, value)__ - set user property to value.


#### Screen (from Node)

The screen on which every other node renders.

##### Options:

- __program__ - the blessed `Program` to be associated with. will be
  automatically instantiated if none is provided.
- __smartCSR__ - attempt to perform CSR optimization on all possible elements
  (not just full-width ones, elements with uniform cells to their sides).
  this is known to cause flickering with elements that are not full-width,
  however, it is more optimal for terminal rendering.
- __fastCSR__ - do CSR on any element within 20 cols of the screen edge on
  either side. faster than `smartCSR`, but may cause flickering depending on
  what is on each side of the element.
- __useBCE__ - attempt to perform `back_color_erase` optimizations for terminals
  that support it. it will also work with terminals that don't support it, but
  only on lines with the default background color. as it stands with the current
  implementation, it's uncertain how much terminal performance this adds at the
  cost of overhead within node.
- __resizeTimeout__ - amount of time (in ms) to redraw the screen after the
  terminal is resized (default: 300).
- __tabSize__ - the width of tabs within an element's content.
- __autoPadding__ - automatically position child elements with border and
  padding in mind (__NOTE__: this is a recommended option. it may become
  default in the future).
- __artificialCursor__ - have blessed draw a custom cursor and hide the
  terminal cursor (__experimental__).
- __cursorShape__ - shape of the artificial cursor. can be: block, underline,
  or line.
- __cursorBlink__ - whether the artificial cursor blinks.
- __cursorColor__ - color of the artificial color. accepts any valid color
  value (`null` is default).
- __log__ - create a log file. see `log` method.
- __dump__ - dump all output and input to desired file. can be used together
  with `log` option if set as a boolean.
- __debug__ - debug mode. enables usage of the `debug` method.
- __ignoreLocked__ - Array of keys in their full format (e.g. `C-c`) to ignore
  when keys are locked. Useful for creating a key that will _always_ exit no
  matter whether the keys are locked.

##### Properties:

- inherits all from Node.
- __program__ - the blessed Program object.
- __tput__ - the blessed Tput object (only available if you passed `tput: true`
  to the Program constructor.)
- __focused__ - top of the focus history stack.
- __width__ - width of the screen (same as `program.cols`).
- __height__ - height of the screen (same as `program.rows`).
- __cols__ - same as `screen.width`.
- __rows__ - same as `screen.height`.
- __left__ - relative left offset, always zero.
- __right__ - relative right offset, always zero.
- __top__ - relative top offset, always zero.
- __bottom__ - relative bottom offset, always zero.
- __aleft__ - absolute left offset, always zero.
- __aright__ - absolute right offset, always zero.
- __atop__ - absolute top offset, always zero.
- __abottom__ - absolute bottom offset, always zero.
- __grabKeys__ - whether the focused element grabs all keypresses.
- __lockKeys__ - prevent keypresses from being received by any element.
- __hover__ - the currently hovered element. only set if mouse events are bound.
- __title__ - set or get window title.

##### Events:

- inherits all from Node.
- __resize__ - received on screen resize.
- __mouse__ - received on mouse events.
- __keypress__ - received on key events.
- __element [name]__ - global events received for all elements.
- __key [name]__ - received on key event for [name].
- __focus, blur__ - received when the terminal window focuses/blurs. requires a
  terminal supporting the focus protocol and focus needs to be passed to
  program.enableMouse().
- __prerender__ - received before render.
- __render__ - received on render.

##### Methods:

- inherits all from Node.
- __log(msg, ...)__ - write string to the log file if one was created.
- __debug(msg, ...)__ - same as the log method, but only gets called if the
  `debug` option was set.
- __alloc()__ - allocate a new pending screen buffer and a new output screen
  buffer.
- __draw(start, end)__ - draw the screen based on the contents of the screen
  buffer.
- __render()__ - render all child elements, writing all data to the screen
  buffer and drawing the screen.
- __clearRegion(x1, x2, y1, y2)__ - clear any region on the screen.
- __fillRegion(attr, ch, x1, x2, y1, y2)__ - fill any region with a character
  of a certain attribute.
- __focusOffset(offset)__ - focus element by offset of focusable elements.
- __focusPrevious()__ - focus previous element in the index.
- __focusNext()__ - focus next element in the index.
- __focusPush(element)__ - push element on the focus stack (equivalent to
  `screen.focused = el`).
- __focusPop()__ - pop element off the focus stack.
- __saveFocus()__ - save the focused element.
- __restoreFocus()__ - restore the saved focused element.
- __rewindFocus()__ - "rewind" focus to the last visible and attached element.
- __key(name, listener)__ - bind a keypress listener for a specific key.
- __onceKey(name, listener)__ - bind a keypress listener for a specific key
  once.
- __unkey(name, listener)__ - remove a keypress listener for a specific key.
- __spawn(file, args, options)__ - spawn a process in the foreground, return to
  blessed app after exit.
- __exec(file, args, options, callback)__ - spawn a process in the foreground,
  return to blessed app after exit. executes callback on error or exit.
- __readEditor([options], callback)__ - read data from text editor.
- __setEffects(el, fel, over, out, effects, temp)__ - set effects based on
  two events and attributes.
- __insertLine(n, y, top, bottom)__ - insert a line into the screen (using csr:
  this bypasses the output buffer).
- __deleteLine(n, y, top, bottom)__ - delete a line from the screen (using csr:
  this bypasses the output buffer).
- __insertBottom(top, bottom)__ - insert a line at the bottom of the screen.
- __insertTop(top, bottom)__ - insert a line at the top of the screen.
- __deleteBottom(top, bottom)__ - delete a line at the bottom of the screen.
- __deleteTop(top, bottom)__ - delete a line at the top of the screen.
- __enableMouse([el])__ - enable mouse events for the screen and optionally an element (automatically called when a form of on('mouse') is bound).
- __enableKeys([el])__ - enable keypress events for the screen and optionally an element (automatically called when a form of on('keypress') is bound).
- __enableInput([el])__ - enable key and mouse events. calls bot enableMouse and enableKeys.
- __copyToClipboard(text)__ - attempt to copy text to clipboard using iTerm2's
  proprietary sequence. returns true if successful.
- __cursorShape(shape, blink)__ - attempt to change cursor shape. will not work
  in all terminals (see artificial cursors for a solution to this). returns
  true if successful.
- __cursorColor(color)__ - attempt to change cursor color. returns true if
  successful.
- __cursorReset()__ - attempt to reset cursor. returns true if successful.


#### Element (from Node)

The base element.

##### Options:

- __fg, bg, bold, underline__ - attributes.
- __style__ - may contain attributes in the format of:
``` js
  {
    fg: 'blue',
    bg: 'black',
    border: {
      fg: 'blue'
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
- __border__ - border object, see below.
- __content__ - element's text content.
- __clickable__ - element is clickable.
- __input__ - element is focusable and can receive key input.
- __focused__ - element is focused.
- __hidden__ - whether the element is hidden.
- __label__ - a simple text label for the element.
- __hoverText__ - a floating text label for the element which appears on mouseover.
- __align__ - text alignment: `left`, `center`, or `right`.
- __valign__ - vertical text alignment: `top`, `middle`, or `bottom`.
- __shrink__ - shrink/flex/grow to content and child elements. width/height
  during render.
- __padding__ - amount of padding on the inside of the element. can be a number
  or an object containing the properties: `left`, `right`, `top`, and `bottom`.
- __width, height__ - width/height of the element, can be a number, percentage
  (`0-100%`), or keyword (`half` or `shrink`).
- __left, right, top, bottom__ - offsets of the element __relative to its
  parent__. can be a number, percentage (`0-100%`), or keyword (`center`).
  `right` and `bottom` do not accept keywords.
- __position__ - can contain the above options.
- __scrollable__ - whether the element is scrollable or not.
- __ch__ - background character (default is whitespace ` `).

##### Properties:

- inherits all from Node.
- __name__ - name of the element. useful for form submission.
- __border__ - border object.
  - __type__ - type of border (`line` or `bg`). `bg` by default.
  - __ch__ - character to use if `bg` type, default is space.
  - __bg, fg__ - border foreground and background, must be numbers (-1 for
    default).
  - __bold, underline__ - border attributes.
- __style__ - contains attributes (e.g. `fg/bg/underline`). see above.
- __position__ - raw width, height, and offsets.
- __content__ - raw text content.
- __hidden__ - whether the element is hidden or not.
- __visible__ - whether the element is visible or not.
- __detached__ - whether the element is attached to a screen in its ancestry
  somewhere.
- __fg, bg__ - foreground and background, must be numbers (-1 for default).
- __bold, underline__ - attributes.
- __width__ - calculated width.
- __height__ - calculated height.
- __left__ - calculated relative left offset.
- __right__ - calculated relative right offset.
- __top__ - calculated relative top offset.
- __bottom__ - calculated relative bottom offset.
- __aleft__ - calculated absolute left offset.
- __aright__ - calculated absolute right offset.
- __atop__ - calculated absolute top offset.
- __abottom__ - calculated absolute bottom offset.

##### Events:

- inherits all from Node.
- __blur, focus__ - received when an element is focused or unfocused.
- __mouse__ - received on mouse events for this element.
  - __mousedown, mouseup__ - mouse button was pressed or released.
  - __wheeldown, wheelup__ - wheel was scrolled down or up.
  - __mouseover, mouseout__ - element was hovered or unhovered.
  - __mousemove__ - mouse was moved somewhere on this element.
  - __click__ - element was clicked (slightly smarter than mouseup).
- __keypress__ - received on key events for this element.
- __move__ - received when the element is moved.
- __resize__ - received when the element is resized.
- __key [name]__ - received on key event for [name].
- __prerender__ - received before a call to render.
- __render__ - received after a call to render.

##### Methods:

- inherits all from Node.
- note: if the `scrollable` option is enabled, Element inherits all methods
  from ScrollableBox.
- __render()__ - write content and children to the screen buffer.
- __hide()__ - hide element.
- __show()__ - show element.
- __toggle()__ - toggle hidden/shown.
- __focus()__ - focus element.
- __key(name, listener)__ - bind a keypress listener for a specific key.
- __onceKey(name, listener)__ - bind a keypress listener for a specific key
  once.
- __unkey(name, listener)__ - remove a keypress listener for a specific key.
- __onScreenEvent(type, listener)__ - same as`el.on('screen', ...)` except this
  will automatically cleanup listeners after the element is detached.
- __setIndex(z)__ - set the z-index of the element (changes rendering order).
- __setFront()__ - put the element in front of its siblings.
- __setBack()__ - put the element in back of its siblings.
- __setLabel(text/options)__ - set the label text for the top-left corner.
  example options: `{text:'foo',side:'left'}`
- __removeLabel()__ - remove the label completely.
- __setHover(text/options)__ - set the hover text for the bottom-right corner.
  example options: `{text:'foo'}`
- __removeHover()__ - remove the hover label completely.
- __enableMouse()__ - enable mouse events for the element (automatically called when a form of on('mouse') is bound).
- __enableKeys()__ - enable keypress events for the element (automatically called when a form of on('keypress') is bound).
- __enableInput()__ - enable key and mouse events. calls bot enableMouse and enableKeys.

###### Content Methods

Methods for dealing with text content, line by line. Useful for writing a
text editor, irc client, etc.

Note: all of these methods deal with pre-aligned, pre-wrapped text. If you use
deleteTop() on a box with a wrapped line at the top, it may remove 3-4 "real"
lines (rows) depending on how long the original line was.

The `lines` parameter can be a string or an array of strings. The `line`
parameter must be a string.

- __setContent(text)__ - set the content. note: when text is input, it will be
  stripped of all non-SGR escape codes, tabs will be replaced with 8 spaces,
  and tags will be replaced with SGR codes (if enabled).
- __getContent()__ - return content, slightly different from `el.content`.
  assume the above formatting.
- __setText(text)__ - similar to `setContent`, but ignore tags and remove escape
  codes.
- __getText()__ - similar to `getContent`, but return content with tags and
  escape codes removed.
- __insertLine(i, lines)__ - insert a line into the box's content.
- __deleteLine(i)__ - delete a line from the box's content.
- __getLine(i)__ - get a line from the box's content.
- __getBaseLine(i)__ - get a line from the box's content from the visible top.
- __setLine(i, line)__ - set a line in the box's content.
- __setBaseLine(i, line)__ - set a line in the box's content from the visible
  top.
- __clearLine(i)__ - clear a line from the box's content.
- __clearBaseLine(i)__ - clear a line from the box's content from the visible
  top.
- __insertTop(lines)__ - insert a line at the top of the box.
- __insertBottom(lines)__ - insert a line at the bottom of the box.
- __deleteTop()__ - delete a line at the top of the box.
- __deleteBottom()__ - delete a line at the bottom of the box.
- __unshiftLine(lines)__ - unshift a line onto the top of the content.
- __shiftLine(i)__ - shift a line off the top of the content.
- __pushLine(lines)__ - push a line onto the bottom of the content.
- __popLine(i)__ - pop a line off the bottom of the content.
- __getLines()__ - an array containing the content lines.
- __getScreenLines()__ - an array containing the lines as they are displayed on
  the screen.


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


#### Text (from Element)

An element similar to Box, but geared towards rendering simple text elements.

##### Options:

- inherits all from Element.
- __fill__ - fill the entire line with chosen bg until parent bg ends, even if
  there is not enough text to fill the entire width. __(deprecated)__
- __align__ - text alignment: `left`, `center`, or `right`.

Inherits all options, properties, events, and methods from Element.


#### Line (from Box)

A simple line which can be `line` or `bg` styled.

##### Options:

- inherits all from Box.
- __orientation__ - can be `vertical` or `horizontal`.
- __type, bg, fg, ch__ - treated the same as a border object.
  (attributes can be contained in `style`).

Inherits all options, properties, events, and methods from Box.


#### ScrollableBox (from Box)

__DEPRECATED__ - Use Box with the `scrollable` option instead.

A box with scrollable content.

##### Options:

- inherits all from Box.
- __baseLimit__ - a limit to the childBase. default is `Infinity`.
- __alwaysScroll__ - a option which causes the ignoring of `childOffset`. this
  in turn causes the childBase to change every time the element is scrolled.
- __scrollbar__ - object enabling a scrollbar.
- __scrollbar.style__ - style of the scrollbar.
- __scrollbar.track__ - style of the scrollbar track if present (takes regular
  style options).

##### Properties:

- inherits all from Box.
- __childBase__ - the offset of the top of the scroll content.
- __childOffset__ - the offset of the chosen item/line.

##### Events:

- inherits all from Box.
- __scroll__ - received when the element is scrolled.

##### Methods:

- __scroll(offset)__ - scroll the content by a relative offset.
- __scrollTo(index)__ - scroll the content to an absolute index.
- __setScroll(index)__ - same as `scrollTo`.
- __setScrollPerc(perc)__ - set the current scroll index in percentage (0-100).
- __getScroll()__ - get the current scroll index in lines.
- __getScrollHeight()__ - get the actual height of the scrolling area.
- __getScrollPerc()__ - get the current scroll index in percentage.
- __resetScroll()__ - reset the scroll index to its initial state.


#### ScrollableText (from ScrollableBox)

__DEPRECATED__ - Use Box with the `scrollable` and `alwaysScroll` options
instead.

A scrollable text box which can display and scroll text, as well as handle
pre-existing newlines and escape codes.

##### Options:

- inherits all from ScrollableBox.
- __mouse__ - whether to enable automatic mouse support for this element.
- __keys__ - use predefined keys for navigating the text.
- __vi__ - use vi keys with the `keys` option.

##### Properties:

- inherits all from ScrollableBox.

##### Events:

- inherits all from ScrollableBox.

##### Methods:

- inherits all from ScrollableBox.


#### List (from Box)

A scrollable list which can display selectable items.

##### Options:

- inherits all from Box.
- __style.selected__ - style for a selected item.
- __style.item__ - style for an unselected item.
- __mouse__ - whether to automatically enable mouse support for this list
  (allows clicking items).
- __keys__ - use predefined keys for navigating the list.
- __vi__ - use vi keys with the `keys` option.
- __items__ - an array of strings which become the list's items.
- __search__ - a function that is called when `vi` mode is enabled and the key
  `/` is pressed. This function accepts a callback function which should be
  called with the search string. The search string is then used to jump to an
  item that is found in `items`.
- __interactive__ - whether the list is interactive and can have items selected
  (default: true).

##### Properties:

- inherits all from Box.

##### Events:

- inherits all from Box.
- __select__ - received when an item is selected.
- __cancel__ - list was canceled (when `esc` is pressed with the `keys` option).
- __action__ - either a select or a cancel event was received.

##### Methods:

- inherits all from Box.
- __add/addItem(text)__ - add an item based on a string.
- __getItemIndex(child)__ - returns the item index from the list. child can be
  an element, index, or string.
- __getItem(child)__ - returns the item element. child can be an element,
  index, or string.
- __removeItem(child)__ - removes an item from the list. child can be an
  element, index, or string.
- __clearItems()__ - clears all items from the list.
- __setItems(items)__ - sets the list items to multiple strings.
- __select(index)__ - select an index of an item.
- __move(offset)__ - select item based on current offset.
- __up(amount)__ - select item above selected.
- __down(amount)__ - select item below selected.
- __pick(callback)__ - show/focus list and pick an item. the callback is
  executed with the result.


#### Form (from Box)

A form which can contain form elements.

##### Options:

- inherits all from Box.
- __keys__ - allow default keys (tab, vi keys, enter).
- __vi__ - allow vi keys.

##### Properties:

- inherits all from Box.
- __submission__ - last submitted data.

##### Events:

- inherits all from Box.
- __submit__ - form is submitted. receives a data object.
- __cancel__ - form is discarded.
- __reset__ - form is cleared.

##### Methods:

- inherits all from Box.
- __focusNext()__ - focus next form element.
- __focusPrevious()__ - focus previous form element.
- __submit()__ - submit the form.
- __cancel()__ - discard the form.
- __reset()__ - clear the form.


#### Input (from Box)

A form input.


#### Textarea (from Input)

A box which allows multiline text input.

##### Options:

- inherits all from Input.
- __keys__ - use pre-defined keys (`i` or `enter` for insert, `e` for editor,
  `C-e` for editor while inserting).
- __mouse__ - use pre-defined mouse events (right-click for editor).
- __inputOnFocus__ - call `readInput()` when the element is focused.
  automatically unfocus.

##### Properties:

- inherits all from Input.
- __value__ - the input text. __read-only__.

##### Events:

- inherits all from Input.
- __submit__ - value is submitted (enter).
- __cancel__ - value is discared (escape).
- __action__ - either submit or cancel.

##### Methods:

- inherits all from Input.
- __submit__ - submit the textarea (emits `submit`).
- __cancel__ - cancel the textarea (emits `cancel`).
- __readInput(callback)__ - grab key events and start reading text from the
  keyboard. takes a callback which receives the final value.
- __readEditor(callback)__ - open text editor in `$EDITOR`, read the output from
  the resulting file. takes a callback which receives the final value.
- __getValue()__ - the same as `this.value`, for now.
- __clearValue()__ - clear input.
- __setValue(text)__ - set value.


#### Textbox (from Textarea)

A box which allows text input.

##### Options:

- inherits all from Textarea.
- __secret__ - completely hide text.
- __censor__ - replace text with asterisks (`*`).

##### Properties:

- inherits all from Textarea.
- __secret__ - completely hide text.
- __censor__ - replace text with asterisks (`*`).

##### Events:

- inherits all from Textarea.

##### Methods:

- inherits all from Textarea.


#### Button (from Input)

A button which can be focused and allows key and mouse input.

##### Options:

- inherits all from Input.

##### Properties:

- inherits all from Input.

##### Events:

- inherits all from Input.
- __press__ - received when the button is clicked/pressed.

##### Methods:

- inherits all from Input.
- __press()__ - press button. emits `press`.


#### ProgressBar (from Input)

A progress bar allowing various styles. This can also be used as a form input.

##### Options:

- inherits all from Input.
- __orientation__ - can be `horizontal` or `vertical`.
- __style.bar__ - style of the bar contents itself.
- __pch__ - the character to fill the bar with (default is space).
- __filled__ - the amount filled (0 - 100).
- __value__ - same as `filled`.
- __keys__ - enable key support.
- __mouse__ - enable mouse support.

##### Properties:

- inherits all from Input.

##### Events:

- inherits all from Input.
- __reset__ - bar was reset.
- __complete__ - bar has completely filled.

##### Methods:

- inherits all from Input.
- __progress(amount)__ - progress the bar by a fill amount.
- __setProgress(amount)__ - set progress to specific amount.
- __reset()__ - reset the bar.


#### FileManager (from List)

A very simple file manager for selecting files.

##### Options:

- inherits all from List.
- __cwd__ - current working directory.

##### Properties:

- inherits all from List.
- __cwd__ - current working directory.

##### Events:

- inherits all from List.
- __cd__ - directory was selected and navigated to.
- __file__ - file was selected.

##### Methods:

- inherits all from List.
- __refresh([cwd], [callback])__ - refresh the file list (perform a `readdir` on `cwd`
  and update the list items).
- __pick([cwd], callback)__ - pick a single file and return the path in the callback.
- __reset([cwd], [callback])__ - reset back to original cwd.


#### Checkbox (from Input)

A checkbox which can be used in a form element.

##### Options:

- inherits all from Input.
- __checked__ - whether the element is checked or not.
- __mouse__ - enable mouse support.

##### Properties:

- inherits all from Input.
- __text__ - the text next to the checkbox (do not use setContent, use
  `check.text = ''`).
- __checked__ - whether the element is checked or not.
- __value__ - same as `checked`.

##### Events:

- inherits all from Input.
- __check__ - received when element is checked.
- __uncheck__ received when element is unchecked.

##### Methods:

- inherits all from Input.
- __check()__ - check the element.
- __uncheck()__ - uncheck the element.
- __toggle()__ - toggle checked state.


#### RadioSet (from Box)

An element wrapping RadioButtons. RadioButtons within this element will be
mutually exclusive with each other.

##### Options:

- inherits all from Box.

##### Properties:

- inherits all from Box.

##### Events:

- inherits all from Box.

##### Methods:

- inherits all from Box.


#### RadioButton (from Checkbox)

A radio button which can be used in a form element.

##### Options:

- inherits all from Checkbox.

##### Properties:

- inherits all from Checkbox.

##### Events:

- inherits all from Checkbox.

##### Methods:

- inherits all from Checkbox.


#### Prompt (from Box)

A prompt box containing a text input, okay, and cancel buttons.

##### Options:

- inherits all from Box.

##### Properties:

- inherits all from Box.

##### Events:

- inherits all from Box.

##### Methods:

- inherits all from Box.


#### Question (from Box)

A question box containing okay and cancel buttons.

##### Options:

- inherits all from Box.

##### Properties:

- inherits all from Box.

##### Events:

- inherits all from Box.

##### Methods:

- inherits all from Box.


#### Message (from Box)

A box containing a message to be displayed.

##### Options:

- inherits all from Box.

##### Properties:

- inherits all from Box.

##### Events:

- inherits all from Box.

##### Methods:

- inherits all from Box.


#### Loading (from Box)

A box with a spinning line to denote loading.

##### Options:

- inherits all from Box.

##### Properties:

- inherits all from Box.

##### Events:

- inherits all from Box.

##### Methods:

- inherits all from Box.


#### Listbar (from Box)

A horizontal list. Useful for a main menu bar.

##### Options:

- inherits all from Box.
- __style.selected__ - style for a selected item.
- __style.item__ - style for an unselected item.

##### Properties:

- inherits all from Box.

##### Events:

- inherits all from Box.

##### Methods:

- inherits all from Box.


#### Log (from ScrollableText)

A log permanently scrolled to the bottom.

##### Options:

- inherits all from ScrollableText.

##### Properties:

- inherits all from ScrollableText.

##### Events:

- inherits all from ScrollableText.
- __line__ - emitted on a log line. passes in line.

##### Methods:

- inherits all from ScrollableText.
- __log/add(text)__ - add a log line.


#### Table (from Box)

A stylized table of text elements.

##### Options:

- inherits all from Box.
- __rows/data__ - array of array of strings representing rows.
- __pad__ - spaces to attempt to pad on the sides of each cell. `2` by default:
  one space on each side.
- __style.header__ - header style.
- __style.cell__ - cell style.

##### Properties:

- inherits all from Box.

##### Events:

- inherits all from Box.

##### Methods:

- inherits all from Box.
- __setRows/setData(rows)__ - set rows in table. array of arrays of strings.
  ```
    table.setData([
      [ 'Animals',  'Foods'  ],
      [ 'Elephant', 'Apple'  ],
      [ 'Bird',     'Orange' ]
    ]);
  ```

#### Terminal (from Box)

A box which spins up a pseudo terminal and renders the output. Useful for
writing a terminal multiplexer, or something similar to an mc-like file
manager. Requires term.js and pty.js to be installed. See
`example/multiplex.js` for an example terminal multiplexer.

##### Options:

- inherits all from Box.
- __handler__ - handler for input data.
- __shell__ - name of shell. `$SHELL` by default.
- __args__ - args for shell.
- __cursor__ - can be `line`, `underline`, and `block`.
- Other options similar to term.js'.

##### Properties:

- inherits all from Box.
- __term__ - reference to the headless term.js terminal.
- __pty__ - reference to the pty.js pseudo terminal.

##### Events:

- inherits all from Box.
- __title__ - window title from terminal.
- Other events similar to ScrollableBox.

##### Methods:

- inherits all from Box.
- __write(data)__ - write data to the terminal.
- Other methods similar to ScrollableBox.


#### Image (from Box)

Display an image in the terminal (jpeg, png, gif) using w3mimgdisplay. Requires
w3m to be installed. X11 required: works in xterm, urxvt, and possibly other
terminals.

##### Options:

- inherits all from Box.
- __file__ - path to image.
- __w3m__ - path to w3mimgdisplay. if a proper w3mimgdisplay path is not given,
  blessed will search the entire disk for the binary.

##### Properties:

- inherits all from Box.

##### Events:

- inherits all from Box.

##### Methods:

- inherits all from Box.
- __setImage(img, callback)__ - set the image in the box to a new path.
- __clearImage(callback)__ - clear the current image.
- __imageSize(img, callback)__ - get the size of an image file in pixels.
- __termSize(callback)__ - get the size of the terminal in pixels.
- __getPixelRatio(callback)__ - get the pixel to cell ratio for the terminal.


### Artificial Cursors

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


### Positioning

Offsets may be a number, a percentage (e.g. `50%`), or a keyword (e.g.
`center`).

Dimensions may be a number, or a percentage (e.g. `50%`).

Positions are treated almost _exactly_ the same as they are in CSS/CSSOM when
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

This tells blessed to create a box, perfectly centered __relative to its
parent__, 50% as wide and 50% as tall as its parent.

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


### Event Bubbling

Events can bubble in blessed. For example:

Receiving all click events for `box`:

``` js
box.on('click', function(mouse) {
  box.setContent('You clicked ' + mouse.x + ', ' + mouse.y + '.');
  screen.render();
});
```

Receiving all click events for `box`, as well as all of its children:

``` js
box.on('element click', function(el, mouse) {
  box.setContent('You clicked '
    + el.type + ' at ' + mouse.x + ', ' + mouse.y + '.');
  screen.render();
  if (el === box) {
    return false; // Cancel propagation.
  }
});
```

`el` gets passed in as the first argument. It refers to the target element the
event occurred on. Returning `false` will cancel propagation up the tree.


### Rendering

To actually render the screen buffer, you must call `render`.

``` js
box.setContent('Hello world.');
screen.render();
```

Elements are rendered with the lower elements in the children array being
painted first. In terms of the painter's algorithm, the lowest indicies in the
array are the furthest away, just like in the DOM.


### Windows compatibility

Currently there is no `mouse` or `resize` event support on Windows.

Windows users will need to explicitly set `term` when creating a screen like so
(__NOTE__: This is no longer necessary as of the latest versions of blessed.
This is now handled automatically):

``` js
var screen = blessed.screen({ term: 'windows-ansi' });
```


### Testing

Most tests contained in the `test/` directory are interactive. It's up to the
programmer to determine whether the test is properly displayed. In the future
it might be better to do something similar to vttest.


## Lower-Level Usage

This will actually parse the xterm terminfo and compile every
string capability to a javascript function:

``` js
var blessed = require('blessed')
  , tput = blessed.tput('xterm-256color');

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
  , program = blessed.program();

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


## FAQ

1. Why doesn't the Linux console render lines correctly on Ubuntu?
  - You need to install the `ncurses-base` package __and__ the `ncurses-term`
    package. (#98)
2. Why do vertical lines look chopped up in iTerm2?
  - All ACS vertical lines look this way in iTerm2.
3. Why can't I use my mouse in Terminal.app?
  - Terminal.app does not support mouse events.
4. Why doesn't the Image element appear in my terminal?
  - The Image element uses w3m to display images. This generally only works on
    X11+xterm/urxvt, but it _may_ work on other unix terminals.
5. Why can't my mouse clicks register beyond 255-287 cells?
  - Older versions of VTE do not support any modern mouse protocol. On top of
    that, the old x10 protocol it does implement is bugged. Through several
    workarounds we've managed to get the cell limit from 127 to 255/287. If
    you're not happy with this, you may want to look into using xterm or
    urxvt, or a terminal which uses a modern VTE, like gnome-terminal.
6. Is blessed efficient?
  - Yes. Blessed implements CSR and uses the painter's algorithm to render the
    screen. It maintains two screen buffers so it only needs to render what
    has changed on the terminal screen.
7. Will blessed work with all terminals?
  - Yes. blessed has a terminfo/termcap parser and compiler that was written
    from scratch. It should work with every terminal as long as a terminfo
    file is provided. If you notice any compatibility issues in your termial,
    do not hesitate to post an issue.
8. What is "curses" and "ncurses"?
  - ["curses"][curses] was an old library written in the early days of unix
    which allowed a programmer to not have to worry about terminal
    compatibility. ["ncurses"][ncurses] is a free reimplementation of curses.
    It improved upon it quite a bit and is now the standard library for
    implementing terminal programs. Blessed uses neither of these, and instead
    handles terminal compatibility itself.
9. What is the difference between blessed and blessed-contrib?
  - blessed is a major piece of code which reimplements curses from the ground
    up. A UI API is then layered on top of this. blessed-contrib is a popular
    library built on top of blessed which makes clever use of modules to
    implement useful widgets like graphs, ascii art, and so on.
10. Are there blessed-like solutions for non-javascript platforms?
  - Yes. There are some fantastic solutions out there.
    - Perl: [Curses::UI][curses-ui]
    - Python: [Urwid][urwid]
    - Go: [termui][termui] & [termbox-go][termbox]


## Contribution and License Agreement

If you contribute code to this project, you are implicitly allowing your code
to be distributed under the MIT license. You are also implicitly verifying that
all code is your original work. `</legalese>`


## License

Copyright (c) 2013, Christopher Jeffrey. (MIT License)

See LICENSE for more info.

[slap]: https://github.com/slap-editor/slap
[contrib]: https://github.com/yaronn/blessed-contrib
[termui]: https://github.com/gizak/termui
[curses]: https://en.wikipedia.org/wiki/Curses_(programming_library)
[ncurses]: https://en.wikipedia.org/wiki/Ncurses
[urwid]: http://urwid.org/reference/index.html
[curses-ui]: http://search.cpan.org/~mdxi/Curses-UI-0.9609/lib/Curses/UI.pm
[termbox]: https://github.com/nsf/termbox-go
