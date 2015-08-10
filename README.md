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

## Documentation

### Widgets

- [Base Nodes](#base-nodes)
  - [Node](#node-from-eventemitter) (abstract)
  - [Screen](#screen-from-node)
  - [Element](#element-from-node) (abstract)
- [Boxes](#boxes)
  - [Box](#box-from-element)
  - [Text](#text-from-element)
  - [Line](#line-from-box)
  - [ScrollableBox](#scrollablebox-from-box) (deprecated)
  - [ScrollableText](#scrollabletext-from-scrollablebox) (deprecated)
  - [BigText](#bigtext-from-box)
- [Lists](#lists)
  - [List](#list-from-box)
  - [FileManager](#filemanager-from-list)
  - [ListTable](#listtable-from-list)
  - [Listbar](#listbar-from-box)
- [Forms](#forms)
  - [Form](#form-from-box)
  - [Input](#input-from-box) (abstract)
  - [Textarea](#textarea-from-input)
  - [Textbox](#textbox-from-textarea)
  - [Button](#button-from-input)
  - [Checkbox](#checkbox-from-input)
  - [RadioSet](#radioset-from-box)
  - [RadioButton](#radiobutton-from-checkbox)
- [Prompts](#prompts)
  - [Prompt](#prompt-from-box)
  - [Question](#question-from-box)
  - [Message](#message-from-box)
  - [Loading](#loading-from-box)
- [Data Display](#data-display)
  - [ProgressBar](#progressbar-from-input)
  - [Log](#log-from-scrollabletext)
  - [Table](#table-from-box)
- [Special Elements](#special-elements)
  - [Terminal](#terminal-from-box)
  - [Image](#image-from-box)
  - [ANSIImage](#ansiimage-from-box)
  - [OverlayImage](#overlayimage-from-box)
  - [Video](#video-from-box)
  - [Layout](#layout-from-element)

### Other

- [Helpers](#helpers)

### Mechanics

- [Content & Tags](#content--tags)
  - [Colors](#colors)
  - [Attributes](#attributes)
  - [Alignment](#alignment)
  - [Escaping](#escaping)
  - [SGR Sequences](#sgr-sequences)
- [Style](#style)
  - [Colors](#colors-1)
  - [Attributes](#attributes-1)
  - [Transparency](#transparency)
  - [Shadow](#shadow)
  - [Effects](#effects)
- [Events](#events)
  - [Event Bubbling](#event-bubbling)
- [Poisitioning](#positioning)
- [Rendering](#rendering)
- [Artificial Cursors](#artificial-cursors)
- [Multiple Screens](#multiple-screens)
- [Server Side Usage](#server-side-usage)

### Notes

- [Windows Compatibility](#windows-compatibility)
- [Low-level Usage](#low-level-usage)
- [Testing](#testing)
- [Examples](#examples)
- [FAQ](#faq)


## Widgets

Blessed comes with a number of high-level widgets so you can avoid all the
nasty low-level terminal stuff.


### Base Nodes


#### Node (from EventEmitter)

The base node which everything inherits from.

##### Options:

- __screen__ - The screen to be associated with.
- __parent__ - The desired parent.
- __children__ - An arrray of children.

##### Properties:

- Inherits all from EventEmitter.
- __type__ - Type of the node (e.g. `box`).
- __options__ - Original options object.
- __parent__ - Parent node.
- __screen__ - Parent screen.
- __children__ - Array of node's children.
- __data, _, $__ - An object for any miscellanous user data.
- __index__ - Render index (document order index) of the last render call.

##### Events:

- Inherits all from EventEmitter.
- __adopt__ - Received when node is added to a parent.
- __remove__ - Received when node is removed from it's current parent.
- __reparent__ - Received when node gains a new parent.
- __attach__ - Received when node is attached to the screen directly or
  somewhere in its ancestry.
- __detach__ - Received when node is detached from the screen directly or
  somewhere in its ancestry.

##### Methods:

- Inherits all from EventEmitter.
- __prepend(node)__ - Prepend a node to this node's children.
- __append(node)__ - Append a node to this node's children.
- __remove(node)__ - Remove child node from node.
- __insert(node, i)__ - Insert a node to this node's children at index `i`.
- __insertBefore(node, refNode)__ - Insert a node to this node's children
  before the reference node.
- __insertAfter(node, refNode)__ - Insert a node from node after the reference
  node.
- __detach()__ - Remove node from its parent.
- __emitDescendants(type, args..., [iterator])__ - Emit event for element, and
  recursively emit same event for all descendants.
- __get(name, [default])__ - Get user property with a potential default value.
- __set(name, value)__ - Set user property to value.


#### Screen (from Node)

The screen on which every other node renders.

##### Options:

- __program__ - The blessed `Program` to be associated with. Will be
  automatically instantiated if none is provided.
- __smartCSR__ - Attempt to perform CSR optimization on all possible elements
  (not just full-width ones, elements with uniform cells to their sides).
  This is known to cause flickering with elements that are not full-width,
  however, it is more optimal for terminal rendering.
- __fastCSR__ - Do CSR on any element within 20 cols of the screen edge on
  either side. Faster than `smartCSR`, but may cause flickering depending on
  what is on each side of the element.
- __useBCE__ - Attempt to perform `back_color_erase` optimizations for terminals
  that support it. It will also work with terminals that don't support it, but
  only on lines with the default background color. As it stands with the current
  implementation, it's uncertain how much terminal performance this adds at the
  cost of overhead within node.
- __resizeTimeout__ - Amount of time (in ms) to redraw the screen after the
  terminal is resized (Default: 300).
- __tabSize__ - The width of tabs within an element's content.
- __autoPadding__ - Automatically position child elements with border and
  padding in mind (__NOTE__: this is a recommended option. It may become
  default in the future).
- __cursor.artificial__ - Have blessed draw a custom cursor and hide the
  terminal cursor (__experimental__).
- __cursor.shape__ - Shape of the cursor. Can be: block, underline, or line.
- __cursor.blink__ - Whether the cursor blinks.
- __cursor.color__ - Color of the color. Accepts any valid color value (`null`
  is default).
- __log__ - Create a log file. See `log` method.
- __dump__ - Dump all output and input to desired file. Can be used together
  with `log` option if set as a boolean.
- __debug__ - Debug mode. Enables usage of the `debug` method. Also creates a
  debug console which will display when pressing F12. It will display all log
  and debug messages.
- __ignoreLocked__ - Array of keys in their full format (e.g. `C-c`) to ignore
  when keys are locked or grabbed. Useful for creating a key that will _always_
  exit no matter whether the keys are locked.
- __dockBorders__ - Automatically "dock" borders with other elements instead of
  overlapping, depending on position (__experimental__). For example:
  These border-overlapped elements:
```
┌─────────┌─────────┐
│ box1    │ box2    │
└─────────└─────────┘
```
  Become:
```
┌─────────┬─────────┐
│ box1    │ box2    │
└─────────┴─────────┘
```
- __ignoreDockContrast__ - Normally, dockable borders will not dock if the
  colors or attributes are different. This option will allow them to dock
  regardless. It may produce some odd looking multi-colored borders though.
- __fullUnicode__ - Allow for rendering of East Asian double-width characters,
  utf-16 surrogate pairs, and unicode combining characters. This allows you to
  display text above the basic multilingual plane. This is behind an option
  because it may affect performance slightly negatively. Without this option
  enabled, all double-width, surrogate pair, and combining characters will be
  replaced by `'??'`, `'?'`, `''` respectively. (NOTE: iTerm2 cannot display
  combining characters properly. Blessed simply removes them from an element's
  content if iTerm2 is detected).
- __sendFocus__ - Send focus events after mouse is enabled.
- __warnings__ - Display warnings (such as the output not being a TTY, similar
  to ncurses).
- __forceUnicode__ - Force blessed to use unicode even if it is not detected
  via terminfo, env variables, or windows code page. If value is `true` unicode
  is forced. If value is `false` non-unicode is forced (default: `null`).
- __input/output__ - Input and output streams. `process.stdin`/`process.stdout`
  by default, however, it could be a `net.Socket` if you want to make a program
  that runs over telnet or something of that nature.
- __terminal__ - `TERM` name used for terminfo parsing. The `$TERM` env variable is
  used by default.
- __title__ - Set the terminal window title if possible.

##### Properties:

- Inherits all from Node.
- __program__ - The blessed Program object.
- __tput__ - The blessed Tput object (only available if you passed `tput: true`
  to the Program constructor.)
- __focused__ - Top of the focus history stack.
- __width__ - Width of the screen (same as `program.cols`).
- __height__ - Height of the screen (same as `program.rows`).
- __cols__ - Same as `screen.width`.
- __rows__ - Same as `screen.height`.
- __left__ - Relative left offset, always zero.
- __right__ - Relative right offset, always zero.
- __top__ - Relative top offset, always zero.
- __bottom__ - Relative bottom offset, always zero.
- __aleft__ - Absolute left offset, always zero.
- __aright__ - Absolute right offset, always zero.
- __atop__ - Absolute top offset, always zero.
- __abottom__ - Absolute bottom offset, always zero.
- __grabKeys__ - Whether the focused element grabs all keypresses.
- __lockKeys__ - Prevent keypresses from being received by any element.
- __hover__ - The currently hovered element. Only set if mouse events are bound.
- __terminal__ - Set or get terminal name. `Set` calls `screen.setTerminal()`
  internally.
- __title__ - Set or get window title.

##### Events:

- Inherits all from Node.
- __resize__ - Received on screen resize.
- __mouse__ - Received on mouse events.
- __keypress__ - Received on key events.
- __element [name]__ - Global events received for all elements.
- __key [name]__ - Received on key event for [name].
- __focus, blur__ - Received when the terminal window focuses/blurs. Requires a
  terminal supporting the focus protocol and focus needs to be passed to
  program.enableMouse().
- __prerender__ - Received before render.
- __render__ - Received on render.
- __warning__ - Received when blessed notices something untoward (output is not
  a tty, terminfo not found, etc).
- __destroy__ - Received when the screen is destroyed (only useful when using
  multiple screens).

##### Methods:

- Inherits all from Node.
- __log(msg, ...)__ - Write string to the log file if one was created.
- __debug(msg, ...)__ - Same as the log method, but only gets called if the
  `debug` option was set.
- __alloc()__ - Allocate a new pending screen buffer and a new output screen
  buffer.
- __realloc()__ - Reallocate the screen buffers and clear the screen.
- __draw(start, end)__ - Draw the screen based on the contents of the screen
  buffer.
- __render()__ - Render all child elements, writing all data to the screen
  buffer and drawing the screen.
- __clearRegion(x1, x2, y1, y2)__ - Clear any region on the screen.
- __fillRegion(attr, ch, x1, x2, y1, y2)__ - Fill any region with a character
  of a certain attribute.
- __focusOffset(offset)__ - Focus element by offset of focusable elements.
- __focusPrevious()__ - Focus previous element in the index.
- __focusNext()__ - Focus next element in the index.
- __focusPush(element)__ - Push element on the focus stack (equivalent to
  `screen.focused = el`).
- __focusPop()__ - Pop element off the focus stack.
- __saveFocus()__ - Save the focused element.
- __restoreFocus()__ - Restore the saved focused element.
- __rewindFocus()__ - "Rewind" focus to the last visible and attached element.
- __key(name, listener)__ - Bind a keypress listener for a specific key.
- __onceKey(name, listener)__ - Bind a keypress listener for a specific key
  once.
- __unkey(name, listener)__ - Remove a keypress listener for a specific key.
- __spawn(file, args, options)__ - Spawn a process in the foreground, return to
  blessed app after exit.
- __exec(file, args, options, callback)__ - Spawn a process in the foreground,
  return to blessed app after exit. Executes callback on error or exit.
- __readEditor([options], callback)__ - Read data from text editor.
- __setEffects(el, fel, over, out, effects, temp)__ - Set effects based on
  two events and attributes.
- __insertLine(n, y, top, bottom)__ - Insert a line into the screen (using csr:
  this bypasses the output buffer).
- __deleteLine(n, y, top, bottom)__ - Delete a line from the screen (using csr:
  this bypasses the output buffer).
- __insertBottom(top, bottom)__ - Insert a line at the bottom of the screen.
- __insertTop(top, bottom)__ - Insert a line at the top of the screen.
- __deleteBottom(top, bottom)__ - Delete a line at the bottom of the screen.
- __deleteTop(top, bottom)__ - Delete a line at the top of the screen.
- __enableMouse([el])__ - Enable mouse events for the screen and optionally an
  element (automatically called when a form of on('mouse') is bound).
- __enableKeys([el])__ - Enable keypress events for the screen and optionally
  an element (automatically called when a form of on('keypress') is bound).
- __enableInput([el])__ - Enable key and mouse events. Calls bot enableMouse
  and enableKeys.
- __copyToClipboard(text)__ - Attempt to copy text to clipboard using iTerm2's
  proprietary sequence. Returns true if successful.
- __cursorShape(shape, blink)__ - Attempt to change cursor shape. Will not work
  in all terminals (see artificial cursors for a solution to this). Returns
  true if successful.
- __cursorColor(color)__ - Attempt to change cursor color. Returns true if
  successful.
- __cursorReset()__ - Attempt to reset cursor. Returns true if successful.
- __screenshot([xi, xl, yi, yl])__ - Take an SGR screenshot of the screen
  within the region. Returns a string containing only characters and SGR codes.
  Can be displayed by simply echoing it in a terminal.
- __destroy()__ - Destroy the screen object and remove it from the global list.
  Also remove all global events relevant to the screen object. If all screen
  objects are destroyed, the node process is essentially reset to its initial
  state.
- __setTerminal(term)__ - Reset the terminal to `term`. Reloads terminfo.


#### Element (from Node)

The base element.

##### Options:

- __fg, bg, bold, underline__ - Attributes.
- __style__ - May contain attributes in the format of:
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
- __border__ - Border object, see below.
- __content__ - Element's text content.
- __clickable__ - Element is clickable.
- __input, keyable__ - Element is focusable and can receive key input.
- __focused__ - Element is focused.
- __hidden__ - Whether the element is hidden.
- __label__ - A simple text label for the element.
- __hoverText__ - A floating text label for the element which appears on mouseover.
- __align__ - Text alignment: `left`, `center`, or `right`.
- __valign__ - Vertical text alignment: `top`, `middle`, or `bottom`.
- __shrink__ - Shrink/flex/grow to content and child elements. Width/height
  during render.
- __padding__ - Amount of padding on the inside of the element. Can be a number
  or an object containing the properties: `left`, `right`, `top`, and `bottom`.
- __width, height__ - Width/height of the element, can be a number, percentage
  (`0-100%`), or keyword (`half` or `shrink`). Percentages can also have
  offsets (`50%+1`, `50%-1`).
- __left, right, top, bottom__ - Offsets of the element __relative to its
  parent__. Can be a number, percentage (`0-100%`), or keyword (`center`).
  `right` and `bottom` do not accept keywords. Percentages can also have
  offsets (`50%+1`, `50%-1`).
- __position__ - Can contain the above options.
- __scrollable__ - Whether the element is scrollable or not.
- __ch__ - Background character (default is whitespace ` `).
- __draggable__ - Allow the element to be dragged with the mouse.
- __shadow__ - Draw a translucent offset shadow behind the element.

##### Properties:

- Inherits all from Node.
- __name__ - Name of the element. Useful for form submission.
- __border__ - Border object.
  - __type__ - Type of border (`line` or `bg`). `bg` by default.
  - __ch__ - Character to use if `bg` type, default is space.
  - __bg, fg__ - Border foreground and background, must be numbers (-1 for
    default).
  - __bold, underline__ - Border attributes.
- __style__ - Contains attributes (e.g. `fg/bg/underline`). See above.
- __position__ - Raw width, height, and offsets.
- __content__ - Raw text content.
- __hidden__ - Whether the element is hidden or not.
- __visible__ - Whether the element is visible or not.
- __detached__ - Whether the element is attached to a screen in its ancestry
  somewhere.
- __fg, bg__ - Foreground and background, must be numbers (-1 for default).
- __bold, underline__ - Attributes.
- __width__ - Calculated width.
- __height__ - Calculated height.
- __left__ - Calculated relative left offset.
- __right__ - Calculated relative right offset.
- __top__ - Calculated relative top offset.
- __bottom__ - Calculated relative bottom offset.
- __aleft__ - Calculated absolute left offset.
- __aright__ - Calculated absolute right offset.
- __atop__ - Calculated absolute top offset.
- __abottom__ - Calculated absolute bottom offset.
- __draggable__ - Whether the element is draggable. Set to true to allow
  dragging.

##### Events:

- Inherits all from Node.
- __blur, focus__ - Received when an element is focused or unfocused.
- __mouse__ - Received on mouse events for this element.
  - __mousedown, mouseup__ - Mouse button was pressed or released.
  - __wheeldown, wheelup__ - Wheel was scrolled down or up.
  - __mouseover, mouseout__ - Element was hovered or unhovered.
  - __mousemove__ - Mouse was moved somewhere on this element.
  - __click__ - Element was clicked (slightly smarter than mouseup).
- __keypress__ - Received on key events for this element.
- __move__ - Received when the element is moved.
- __resize__ - Received when the element is resized.
- __key [name]__ - Received on key event for [name].
- __prerender__ - Received before a call to render.
- __render__ - Received after a call to render.
- __hide__ - Received when element becomes hidden.
- __show__ - Received when element is shown.
- __destroy__ - Received when element is destroyed.

##### Methods:

- Inherits all from Node.
- Note: If the `scrollable` option is enabled, Element inherits all methods
  from ScrollableBox.
- __render()__ - Write content and children to the screen buffer.
- __hide()__ - Hide element.
- __show()__ - Show element.
- __toggle()__ - Toggle hidden/shown.
- __focus()__ - Focus element.
- __key(name, listener)__ - Bind a keypress listener for a specific key.
- __onceKey(name, listener)__ - Bind a keypress listener for a specific key
  once.
- __unkey(name, listener)__ - Remove a keypress listener for a specific key.
- __onScreenEvent(type, handler)__ - Same as`el.on('screen', ...)` except this
  will automatically keep track of which listeners are bound to the screen
  object. For use with `removeScreenEvent()`, `free()`, and `destroy()`.
- __removeScreenEvent(type, handler)__ - Same as`el.removeListener('screen',
  ...)` except this will automatically keep track of which listeners are bound
  to the screen object. For use with `onScreenEvent()`, `free()`, and
  `destroy()`.
- __free()__ - Free up the element. Automatically unbind all events that may
  have been bound to the screen object. This prevents memory leaks. For use
  with `onScreenEvent()`, `removeScreenEvent()`, and `destroy()`.
- __destroy()__ - Same as the `detach()` method, except this will automatically
  call `free()` and unbind any screen events to prevent memory leaks.  for use
  with `onScreenEvent()`, `removeScreenEvent()`, and `free()`.
- __setIndex(z)__ - Set the z-index of the element (changes rendering order).
- __setFront()__ - Put the element in front of its siblings.
- __setBack()__ - Put the element in back of its siblings.
- __setLabel(text/options)__ - Set the label text for the top-left corner.
  Example options: `{text:'foo',side:'left'}`
- __removeLabel()__ - Remove the label completely.
- __setHover(text/options)__ - Set a hover text box to follow the cursor.
  Similar to the "title" DOM attribute in the browser.
  Example options: `{text:'foo'}`
- __removeHover()__ - Remove the hover label completely.
- __enableMouse()__ - Enable mouse events for the element (automatically called
  when a form of on('mouse') is bound).
- __enableKeys()__ - Enable keypress events for the element (automatically
  called when a form of on('keypress') is bound).
- __enableInput()__ - Enable key and mouse events. Calls bot enableMouse and
  enableKeys.
- __enableDrag()__ - Enable dragging of the element.
- __disableDrag()__ - Disable dragging of the element.
- __screenshot([xi, xl, yi, yl])__ - Take an SGR screenshot of the element
  within the region. Returns a string containing only characters and SGR codes.
  Can be displayed by simply echoing it in a terminal.

###### Content Methods

Methods for dealing with text content, line by line. Useful for writing a
text editor, irc client, etc.

Note: All of these methods deal with pre-aligned, pre-wrapped text. If you use
deleteTop() on a box with a wrapped line at the top, it may remove 3-4 "real"
lines (rows) depending on how long the original line was.

The `lines` parameter can be a string or an array of strings. The `line`
parameter must be a string.

- __setContent(text)__ - Set the content. Note: When text is input, it will be
  stripped of all non-SGR escape codes, tabs will be replaced with 8 spaces,
  and tags will be replaced with SGR codes (if enabled).
- __getContent()__ - Return content, slightly different from `el.content`.
  Assume the above formatting.
- __setText(text)__ - Similar to `setContent`, but ignore tags and remove escape
  codes.
- __getText()__ - Similar to `getContent`, but return content with tags and
  escape codes removed.
- __insertLine(i, lines)__ - Insert a line into the box's content.
- __deleteLine(i)__ - Delete a line from the box's content.
- __getLine(i)__ - Get a line from the box's content.
- __getBaseLine(i)__ - Get a line from the box's content from the visible top.
- __setLine(i, line)__ - Set a line in the box's content.
- __setBaseLine(i, line)__ - Set a line in the box's content from the visible
  top.
- __clearLine(i)__ - Clear a line from the box's content.
- __clearBaseLine(i)__ - Clear a line from the box's content from the visible
  top.
- __insertTop(lines)__ - Insert a line at the top of the box.
- __insertBottom(lines)__ - Insert a line at the bottom of the box.
- __deleteTop()__ - Delete a line at the top of the box.
- __deleteBottom()__ - Delete a line at the bottom of the box.
- __unshiftLine(lines)__ - Unshift a line onto the top of the content.
- __shiftLine(i)__ - Shift a line off the top of the content.
- __pushLine(lines)__ - Push a line onto the bottom of the content.
- __popLine(i)__ - Pop a line off the bottom of the content.
- __getLines()__ - An array containing the content lines.
- __getScreenLines()__ - An array containing the lines as they are displayed on
  the screen.
- __strWidth(text)__ - Get a string's displayed width, taking into account
  double-width, surrogate pairs, combining characters, tags, and SGR escape
  codes.


### Boxes


#### Box (from Element)

A box element which draws a simple box containing `content` or other elements.

##### Options:

- Inherits all from Element.

##### Properties:

- Inherits all from Element.

##### Events:

- Inherits all from Element.

##### Methods:

- Inherits all from Element.


#### Text (from Element)

An element similar to Box, but geared towards rendering simple text elements.

##### Options:

- Inherits all from Element.
- __fill__ - Fill the entire line with chosen bg until parent bg ends, even if
  there is not enough text to fill the entire width. __(deprecated)__
- __align__ - Text alignment: `left`, `center`, or `right`.

Inherits all options, properties, events, and methods from Element.


#### Line (from Box)

A simple line which can be `line` or `bg` styled.

##### Options:

- Inherits all from Box.
- __orientation__ - Can be `vertical` or `horizontal`.
- __type, bg, fg, ch__ - Treated the same as a border object.
  (attributes can be contained in `style`).

Inherits all options, properties, events, and methods from Box.


#### ScrollableBox (from Box)

__DEPRECATED__ - Use Box with the `scrollable` option instead.

A box with scrollable content.

##### Options:

- Inherits all from Box.
- __baseLimit__ - A limit to the childBase. Default is `Infinity`.
- __alwaysScroll__ - A option which causes the ignoring of `childOffset`. This
  in turn causes the childBase to change every time the element is scrolled.
- __scrollbar__ - Object enabling a scrollbar.
- __scrollbar.style__ - Style of the scrollbar.
- __scrollbar.track__ - Style of the scrollbar track if present (takes regular
  style options).

##### Properties:

- Inherits all from Box.
- __childBase__ - The offset of the top of the scroll content.
- __childOffset__ - The offset of the chosen item/line.

##### Events:

- Inherits all from Box.
- __scroll__ - Received when the element is scrolled.

##### Methods:

- __scroll(offset)__ - Scroll the content by a relative offset.
- __scrollTo(index)__ - Scroll the content to an absolute index.
- __setScroll(index)__ - Same as `scrollTo`.
- __setScrollPerc(perc)__ - Set the current scroll index in percentage (0-100).
- __getScroll()__ - Get the current scroll index in lines.
- __getScrollHeight()__ - Get the actual height of the scrolling area.
- __getScrollPerc()__ - Get the current scroll index in percentage.
- __resetScroll()__ - Reset the scroll index to its initial state.


#### ScrollableText (from ScrollableBox)

__DEPRECATED__ - Use Box with the `scrollable` and `alwaysScroll` options
instead.

A scrollable text box which can display and scroll text, as well as handle
pre-existing newlines and escape codes.

##### Options:

- Inherits all from ScrollableBox.
- __mouse__ - Whether to enable automatic mouse support for this element.
- __keys__ - Use predefined keys for navigating the text.
- __vi__ - Use vi keys with the `keys` option.

##### Properties:

- Inherits all from ScrollableBox.

##### Events:

- Inherits all from ScrollableBox.

##### Methods:

- Inherits all from ScrollableBox.


#### BigText (from Box)

A box which can render content drawn as 8x14 cell characters using the terminus
font.

##### Options:

- Inherits all from Box.
- __font__ - bdf->json font file to use (see [ttystudio][ttystudio] for
  instructions on compiling BDFs to JSON).
- __fontBold__ - bdf->json bold font file to use (see [ttystudio][ttystudio]
  for instructions on compiling BDFs to JSON).
- __fch__ - foreground character. (default: `' '`)

##### Properties:

- Inherits all from Box.

##### Events:

- Inherits all from Box.

##### Methods:

- Inherits all from Box.


### Lists


#### List (from Box)

A scrollable list which can display selectable items.

##### Options:

- Inherits all from Box.
- __style.selected__ - Style for a selected item.
- __style.item__ - Style for an unselected item.
- __mouse__ - Whether to automatically enable mouse support for this list
  (allows clicking items).
- __keys__ - Use predefined keys for navigating the list.
- __vi__ - Use vi keys with the `keys` option.
- __items__ - An array of strings which become the list's items.
- __search__ - A function that is called when `vi` mode is enabled and the key
  `/` is pressed. This function accepts a callback function which should be
  called with the search string. The search string is then used to jump to an
  item that is found in `items`.
- __interactive__ - Whether the list is interactive and can have items selected
  (Default: true).
- __invertSelected__ - Whether to automatically override tags and invert fg of
  item when selected (Default: `true`).

##### Properties:

- Inherits all from Box.

##### Events:

- Inherits all from Box.
- __select__ - Received when an item is selected.
- __cancel__ - List was canceled (when `esc` is pressed with the `keys` option).
- __action__ - Either a select or a cancel event was received.

##### Methods:

- Inherits all from Box.
- __add/addItem(text)__ - Add an item based on a string.
- __removeItem(child)__ - Removes an item from the list. Child can be an
  element, index, or string.
- __pushItem(child)__ - Push an item onto the list.
- __popItem()__ - Pop an item off the list.
- __unshiftItem(child)__ - Unshift an item onto the list.
- __shiftItem()__ - Shift an item off the list.
- __insertItem(i, child)__ - Inserts an item to the list. Child can be an
  element, index, or string.
- __getItem(child)__ - Returns the item element. Child can be an element,
  index, or string.
- __setItem(child, content)__ - Set item to content.
- __spliceItem(i, n, item1, ...)__ - Remove and insert items to the list.
- __clearItems()__ - Clears all items from the list.
- __setItems(items)__ - Sets the list items to multiple strings.
- __getItemIndex(child)__ - Returns the item index from the list. Child can be
  an element, index, or string.
- __select(index)__ - Select an index of an item.
- __move(offset)__ - Select item based on current offset.
- __up(amount)__ - Select item above selected.
- __down(amount)__ - Select item below selected.
- __pick(callback)__ - Show/focus list and pick an item. The callback is
  executed with the result.
- __fuzzyFind([string/regex/callback])__ - Find an item based on its text
  content.


#### FileManager (from List)

A very simple file manager for selecting files.

##### Options:

- Inherits all from List.
- __cwd__ - Current working directory.

##### Properties:

- Inherits all from List.
- __cwd__ - Current working directory.

##### Events:

- Inherits all from List.
- __cd__ - Directory was selected and navigated to.
- __file__ - File was selected.

##### Methods:

- Inherits all from List.
- __refresh([cwd], [callback])__ - Refresh the file list (perform a `readdir` on `cwd`
  and update the list items).
- __pick([cwd], callback)__ - Pick a single file and return the path in the callback.
- __reset([cwd], [callback])__ - Reset back to original cwd.


#### ListTable (from List)

A stylized table of text elements with a list.

##### Options:

- Inherits all from List.
- __rows/data__ - Array of array of strings representing rows.
- __pad__ - Spaces to attempt to pad on the sides of each cell. `2` by default:
  one space on each side (only useful if the width is shrunken).
- __noCellBorders__ - Do not draw inner cells.
- __style.header__ - Header style.
- __style.cell__ - Cell style.

##### Properties:

- Inherits all from List.

##### Events:

- Inherits all from List.

##### Methods:

- Inherits all from List.
- __setRows/setData(rows)__ - Set rows in table. Array of arrays of strings.
``` js
  table.setData([
    [ 'Animals',  'Foods'  ],
    [ 'Elephant', 'Apple'  ],
    [ 'Bird',     'Orange' ]
  ]);
```


#### Listbar (from Box)

A horizontal list. Useful for a main menu bar.

##### Options:

- Inherits all from Box.
- __style.selected__ - Style for a selected item.
- __style.item__ - Style for an unselected item.
- __commands/items__ - Set buttons using an object with keys as titles of
  buttons, containing of objects containing keys of `keys` and `callback`.
- __autoCommandKeys__ - Automatically bind list buttons to keys 0-9.

##### Properties:

- Inherits all from Box.

##### Events:

- Inherits all from Box.

##### Methods:

- Inherits all from Box.
- __setItems(commands)__ - Set commands (see `commands` option above).
- __add/addItem/appendItem(item, callback)__ - Append an item to the bar.
- __select(offset)__ - Select an item on the bar.
- __removeItem(child)__ - Remove item from the bar.
- __move(offset)__ - Move relatively across the bar.
- __moveLeft(offset)__ - Move left relatively across the bar.
- __moveRight(offset)__ - Move right relatively across the bar.
- __selectTab(index)__ - Select button and execute its callback.


### Forms


#### Form (from Box)

A form which can contain form elements.

##### Options:

- Inherits all from Box.
- __keys__ - Allow default keys (tab, vi keys, enter).
- __vi__ - Allow vi keys.

##### Properties:

- Inherits all from Box.
- __submission__ - Last submitted data.

##### Events:

- Inherits all from Box.
- __submit__ - Form is submitted. Receives a data object.
- __cancel__ - Form is discarded.
- __reset__ - Form is cleared.

##### Methods:

- Inherits all from Box.
- __focusNext()__ - Focus next form element.
- __focusPrevious()__ - Focus previous form element.
- __submit()__ - Submit the form.
- __cancel()__ - Discard the form.
- __reset()__ - Clear the form.


#### Input (from Box)

A form input.


#### Textarea (from Input)

A box which allows multiline text input.

##### Options:

- Inherits all from Input.
- __keys__ - Use pre-defined keys (`i` or `enter` for insert, `e` for editor,
  `C-e` for editor while inserting).
- __mouse__ - Use pre-defined mouse events (right-click for editor).
- __inputOnFocus__ - Call `readInput()` when the element is focused.
  Automatically unfocus.

##### Properties:

- Inherits all from Input.
- __value__ - The input text. __read-only__.

##### Events:

- Inherits all from Input.
- __submit__ - Value is submitted (enter).
- __cancel__ - Value is discared (escape).
- __action__ - Either submit or cancel.

##### Methods:

- Inherits all from Input.
- __submit__ - Submit the textarea (emits `submit`).
- __cancel__ - Cancel the textarea (emits `cancel`).
- __readInput(callback)__ - Grab key events and start reading text from the
  keyboard. Takes a callback which receives the final value.
- __readEditor(callback)__ - Open text editor in `$EDITOR`, read the output from
  the resulting file. Takes a callback which receives the final value.
- __getValue()__ - The same as `this.value`, for now.
- __clearValue()__ - Clear input.
- __setValue(text)__ - Set value.


#### Textbox (from Textarea)

A box which allows text input.

##### Options:

- Inherits all from Textarea.
- __secret__ - Completely hide text.
- __censor__ - Replace text with asterisks (`*`).

##### Properties:

- Inherits all from Textarea.
- __secret__ - Completely hide text.
- __censor__ - Replace text with asterisks (`*`).

##### Events:

- Inherits all from Textarea.

##### Methods:

- Inherits all from Textarea.


#### Button (from Input)

A button which can be focused and allows key and mouse input.

##### Options:

- Inherits all from Input.

##### Properties:

- Inherits all from Input.

##### Events:

- Inherits all from Input.
- __press__ - Received when the button is clicked/pressed.

##### Methods:

- Inherits all from Input.
- __press()__ - Press button. Emits `press`.


#### Checkbox (from Input)

A checkbox which can be used in a form element.

##### Options:

- Inherits all from Input.
- __checked__ - Whether the element is checked or not.
- __mouse__ - Enable mouse support.

##### Properties:

- Inherits all from Input.
- __text__ - The text next to the checkbox (do not use setContent, use
  `check.text = ''`).
- __checked__ - Whether the element is checked or not.
- __value__ - Same as `checked`.

##### Events:

- Inherits all from Input.
- __check__ - Received when element is checked.
- __uncheck__ received when element is unchecked.

##### Methods:

- Inherits all from Input.
- __check()__ - Check the element.
- __uncheck()__ - Uncheck the element.
- __toggle()__ - Toggle checked state.


#### RadioSet (from Box)

An element wrapping RadioButtons. RadioButtons within this element will be
mutually exclusive with each other.

##### Options:

- Inherits all from Box.

##### Properties:

- Inherits all from Box.

##### Events:

- Inherits all from Box.

##### Methods:

- Inherits all from Box.


#### RadioButton (from Checkbox)

A radio button which can be used in a form element.

##### Options:

- Inherits all from Checkbox.

##### Properties:

- Inherits all from Checkbox.

##### Events:

- Inherits all from Checkbox.

##### Methods:

- Inherits all from Checkbox.


### Prompts


#### Prompt (from Box)

A prompt box containing a text input, okay, and cancel buttons (automatically
hidden).

##### Options:

- Inherits all from Box.

##### Properties:

- Inherits all from Box.

##### Events:

- Inherits all from Box.

##### Methods:

- Inherits all from Box.
- __input/setInput/readInput(text, value, callback)__ - Show the prompt and
  wait for the result of the textbox. Set text and initial value.


#### Question (from Box)

A question box containing okay and cancel buttons (automatically hidden).

##### Options:

- Inherits all from Box.

##### Properties:

- Inherits all from Box.

##### Events:

- Inherits all from Box.

##### Methods:

- Inherits all from Box.
- __ask(question, callback)__ - Ask a `question`. `callback` will yield the
  result.


#### Message (from Box)

A box containing a message to be displayed (automatically hidden).

##### Options:

- Inherits all from Box.

##### Properties:

- Inherits all from Box.

##### Events:

- Inherits all from Box.

##### Methods:

- Inherits all from Box.
- __log/display(text, [time], callback)__ - Display a message for a time
  (default is 3 seconds). Set time to 0 for a perpetual message that is
  dismissed on keypress.
- __error(text, [time], callback)__ - Display an error in the same way.


#### Loading (from Box)

A box with a spinning line to denote loading (automatically hidden).

##### Options:

- Inherits all from Box.

##### Properties:

- Inherits all from Box.

##### Events:

- Inherits all from Box.

##### Methods:

- Inherits all from Box.
- __load(text)__ - Display the loading box with a message. Will lock keys until
  `stop` is called.
- __stop()__ - Hide loading box. Unlock keys.


### Data Display


#### ProgressBar (from Input)

A progress bar allowing various styles. This can also be used as a form input.

##### Options:

- Inherits all from Input.
- __orientation__ - Can be `horizontal` or `vertical`.
- __style.bar__ - Style of the bar contents itself.
- __pch__ - The character to fill the bar with (default is space).
- __filled__ - The amount filled (0 - 100).
- __value__ - Same as `filled`.
- __keys__ - Enable key support.
- __mouse__ - Enable mouse support.

##### Properties:

- Inherits all from Input.

##### Events:

- Inherits all from Input.
- __reset__ - Bar was reset.
- __complete__ - Bar has completely filled.

##### Methods:

- Inherits all from Input.
- __progress(amount)__ - Progress the bar by a fill amount.
- __setProgress(amount)__ - Set progress to specific amount.
- __reset()__ - Reset the bar.


#### Log (from ScrollableText)

A log permanently scrolled to the bottom.

##### Options:

- Inherits all from ScrollableText.
- __scrollback__ - Amount of scrollback allowed. Default: Infinity.
- __scrollOnInput__ - Scroll to bottom on input even if the user has scrolled
  up. Default: false.

##### Properties:

- Inherits all from ScrollableText.
- __scrollback__ - Amount of scrollback allowed. Default: Infinity.
- __scrollOnInput__ - Scroll to bottom on input even if the user has scrolled
  up. Default: false.

##### Events:

- Inherits all from ScrollableText.
- __log__ - Emitted on a log line. Passes in line.

##### Methods:

- Inherits all from ScrollableText.
- __log/add(text)__ - Add a log line.


#### Table (from Box)

A stylized table of text elements.

##### Options:

- Inherits all from Box.
- __rows/data__ - Array of array of strings representing rows.
- __pad__ - Spaces to attempt to pad on the sides of each cell. `2` by default:
  one space on each side (only useful if the width is shrunken).
- __noCellBorders__ - Do not draw inner cells.
- __fillCellBorders__ - Fill cell borders with the adjacent background color.
- __style.header__ - Header style.
- __style.cell__ - Cell style.

##### Properties:

- Inherits all from Box.

##### Events:

- Inherits all from Box.

##### Methods:

- Inherits all from Box.
- __setRows/setData(rows)__ - Set rows in table. Array of arrays of strings.
``` js
  table.setData([
    [ 'Animals',  'Foods'  ],
    [ 'Elephant', 'Apple'  ],
    [ 'Bird',     'Orange' ]
  ]);
```


### Special Elements


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


#### Image (from Box)

Display an image in the terminal (jpeg, png, gif) using either blessed's
internal png/gif-to-terminal renderer (using a [ANSIImage element](#ansiimage-from-box)) or
using `w3mimgdisplay` (using a [OverlayImage element](#overlayimage-from-box)).

##### Options:

- Inherits all from Box.
- __file__ - Path to image.
- __type__ - `ansi` or `overlay`. Whether to render the file as ANSI art or
  using `w3m` to overlay. See the [ANSIImage element](#ansiimage-from-box) for
  more information/options. (__default__: `ansi`).

##### Properties:

- Inherits all from Box.
- See [ANSIImage element](#ansiimage-from-box)
- See [OverlayImage element](#overlayimage-from-box)

##### Events:

- Inherits all from Box.
- See [ANSIImage element](#ansiimage-from-box)
- See [OverlayImage element](#overlayimage-from-box)

##### Methods:

- Inherits all from Box.
- See [ANSIImage element](#ansiimage-from-box)
- See [OverlayImage element](#overlayimage-from-box)


#### ANSIImage (from Box)

Convert any `.png` file (or `.gif`, see below) to an ANSI image and display it
as an element. This differs from the `OverlayImage` element in that it uses
blessed's internal PNG/GIF parser and does not require external dependencies.

Blessed uses an internal from-scratch PNG/GIF reader because no other javascript
PNG reader supports Adam7 interlaced images (much less pass the png test
suite).

The blessed PNG reader supports adam7 deinterlacing, animation (APNG), all
color types, bit depths 1-32, alpha, alpha palettes, and outputs scaled bitmaps
(cellmaps) in blessed for efficient rendering to the screen buffer. It also
uses some code from libcaca/libcucul to add density ASCII characters in order
to give the image more detail in the terminal.

If a corrupt PNG or a non-PNG is passed in, blessed will display error text in
the element.

`.gif` files are also supported via a javascript implementation (they are
internally converted to bitmaps and fed to the PNG renderer). Any other image
format is support only if the user has imagemagick (`convert` and `identify`)
installed.

##### Options:

- Inherits all from Box.
- __file__ - URL or path to PNG/GIF file. Can also be a buffer.
- __scale__ - Scale cellmap down (`0-1.0`) from its original pixel width/height
  (Default: `1.0`).
- __width/height__ - This differs from other element's `width` or `height` in
  that only one of them is needed: blessed will maintain the aspect ratio of
  the image as it scales down to the proper number of cells. __NOTE__: PNG/GIF's
  are always automatically shrunken to size (based on scale) if a `width` or
  `height` is not given.
- __ascii__ - Add various "density" ASCII characters over the rendering to give
  the image more detail, similar to libcaca/libcucul (the library mplayer uses
  to display videos in the terminal).
- __animate__ - Whether to animate if the image is an APNG/animating GIF. If
  false, only display the first frame or IDAT (Default: `true`).
- __speed__ - Set the speed of animation. Slower: `0.0-1.0`. Faster: `1-1000`.
  It cannot go faster than 1 frame per millisecond, so 1000 is the fastest.
  (Default: 1.0)
- __optimization__ - `mem` or `cpu`. If optimizing for memory, animation frames
  will be rendered to bitmaps _as the animation plays_, using less memory.
  Optimizing for cpu will precompile all bitmaps beforehand, which may be
  faster, but might also OOM the process on large images. (Default: `mem`).

##### Properties:

- Inherits all from Box.
- __img__ - Image object from the png reader.
- __img.width__ - Pixel width.
- __img.height__ - Pixel height.
- __img.bmp__ - Image bitmap.
- __img.cellmap__ - Image cellmap (bitmap scaled down to cell size).

##### Events:

- Inherits all from Box.

##### Methods:

- Inherits all from Box.
- __setImage(file)__ - Set the image in the box to a new path. File can be a
  path, url, or buffer.
- __clearImage()__ - Clear the image.
- __play()__ - Play animation if it has been paused or stopped.
- __pause()__ - Pause animation.
- __stop()__ - Stop animation.


#### OverlayImage (from Box)

Display an image in the terminal (jpeg, png, gif) using w3mimgdisplay. Requires
w3m to be installed. X11 required: works in xterm, urxvt, and possibly other
terminals.

##### Options:

- Inherits all from Box.
- __file__ - Path to image.
- __ansi__ - Render the file as ANSI art instead of using `w3m` to overlay
  Internally uses the ANSIImage element. See the [ANSIImage element](#ansiimage-from-box) for
  more information/options. (Default: `true`).
- __w3m__ - Path to w3mimgdisplay. If a proper `w3mimgdisplay` path is not
  given, blessed will search the entire disk for the binary.
- __search__ - Whether to search `/usr`, `/bin`, and `/lib` for
  `w3mimgdisplay` (Default: `true`).

##### Properties:

- Inherits all from Box.

##### Events:

- Inherits all from Box.

##### Methods:

- Inherits all from Box.
- __setImage(img, [callback])__ - Set the image in the box to a new path.
- __clearImage([callback])__ - Clear the current image.
- __imageSize(img, [callback])__ - Get the size of an image file in pixels.
- __termSize([callback])__ - Get the size of the terminal in pixels.
- __getPixelRatio([callback])__ - Get the pixel to cell ratio for the terminal.
- _Note:_ All methods above can be synchronous as long as the host version of
  node supports `spawnSync`.


#### Video (from Box)

A box which spins up a pseudo terminal in order to render a video via `mplayer
-vo caca` or `mpv --vo caca`. Requires `mplayer` or `mpv` to be installed with
libcaca support.

##### Options:

- Inherits all from Box.
- __file__ - Video to play.
- __start__ - Start time in seconds.

##### Properties:

- Inherits all from Box.
- __tty__ - The terminal element running `mplayer` or `mpv`.

##### Events:

- Inherits all from Box.

##### Methods:

- Inherits all from Box.


#### Layout (from Element)

A layout which can position children automatically based on a `renderer` method
(__experimental__ - the mechanics of this element may be changed in the
future!).

By default, the Layout element automatically positions children as if they were
`display: inline-block;` in CSS.

##### Options:

- Inherits all from Element.
- __renderer__ - A callback which is called right before the children are
  iterated over to be rendered. Should return an iterator callback which is
  called on each child element: __iterator(el, i)__.
- __layout__ - Using the default renderer, it provides two layouts: inline, and
  grid. `inline` is the default and will render akin to `inline-block`. `grid`
  will create an automatic grid based on element dimensions. The grid cells'
  width and height are always determined by the largest children in the layout.

##### Properties:

- Inherits all from Element.

##### Events:

- Inherits all from Element.

##### Methods:

- Inherits all from Element.
- __renderer(coords)__ - A callback which is called right before the children
  are iterated over to be rendered. Should return an iterator callback which is
  called on each child element: __iterator(el, i)__.
- __isRendered(el)__ - Check to see if a previous child element has been
  rendered and is visible on screen. This is __only__ useful for checking child
  elements that have already been attempted to be rendered! see the example
  below.
- __getLast(i)__ - Get the last rendered and visible child element based on an
  index. This is useful for basing the position of the current child element on
  the position of the last child element.
- __getLastCoords(i)__ - Get the last rendered and visible child element coords
  based on an index. This is useful for basing the position of the current
  child element on the position of the last child element. See the example
  below.

##### Rendering a Layout for child elements

###### Notes

You must __always__ give `Layout` a width and height. This is a chicken-and-egg
problem: blessed cannot calculate the width and height dynamically _before_ the
children are positioned.

`border` and `padding` are already calculated into the `coords` object the
`renderer` receives, so there is no need to account for it in your renderer.

Try to set position for children using `el.position`. `el.position` is the most
primitive "to-be-rendered" way to set coordinates. Setting `el.left` directly
has more dynamic behavior which may interfere with rendering.

Some definitions for `coords` (otherwise known as `el.lpos`):

- `coords.xi` - the absolute x coordinate of the __left__ side of a rendered
  element. It is absolute: relative to the screen itself.
- `coords.xl` - the absolute x coordinate of the __right__ side of a rendered
  element. It is absolute: relative to the screen itself.
- `coords.yi` - the absolute y coordinate of the __top__ side of a rendered
  element. It is absolute: relative to the screen itself.
- `coords.yl` - the absolute y coordinate of the __bottom__ side of a rendered
  element. It is absolute: relative to the screen itself.

Note again: the `coords` the renderer receives for the Layout already has
border and padding subtracted, so you do not have to account for these. The
children do not.

###### Example

Here is an example of how to provide a renderer. Note that this is also the
default renderer if none is provided. This renderer will render each child as
though they were `display: inline-block;` in CSS, as if there were a
dynamically sized horizontal grid from left to right.

``` js
var layout = blessed.layout({
  parent: screen,
  top: 'center',
  left: 'center',
  width: '50%',
  height: '50%',
  border: 'line',
  style: {
    bg: 'red',
    border: {
      fg: 'blue'
    }
  },
  // NOTE: This is already the default renderer if none is provided!
  renderer: function(coords) {
    var self = this;

    // The coordinates of the layout element
    var width = coords.xl - coords.xi
      , height = coords.yl - coords.yi
      , xi = coords.xi
      , xl = coords.xl
      , yi = coords.yi
      , yl = coords.yl;

    // The current row offset in cells (which row are we on?)
    var rowOffset = 0;

    // The index of the first child in the row
    var rowIndex = 0;

    return function iterator(el, i) {
      // Make our children shrinkable. If they don't have a height, for
      // example, calculate it for them.
      el.shrink = true;

      // Find the previous rendered child's coordinates
      var last = self.getLastCoords(i);

      // If there is no previously rendered element, we are on the first child.
      if (!last) {
        el.position.left = 0;
        el.position.top = 0;
      } else {
        // Otherwise, figure out where to place this child. We'll start by
        // setting it's `left`/`x` coordinate to right after the previous
        // rendered element. This child will end up directly to the right of it.
        el.position.left = last.xl - xi;

        // If our child does not overlap the right side of the Layout, set it's
        // `top`/`y` to the current `rowOffset` (the coordinate for the current
        // row).
        if (el.position.left + el.width <= width) {
          el.position.top = rowOffset;
        } else {
          // Otherwise we need to start a new row and calculate a new
          // `rowOffset` and `rowIndex` (the index of the child on the current
          // row).
          rowOffset += self.children.slice(rowIndex, i).reduce(function(out, el) {
            if (!self.isRendered(el)) return out;
            out = Math.max(out, el.lpos.yl - el.lpos.yi);
            return out;
          }, 0);
          rowIndex = i;
          el.position.left = 0;
          el.position.top = rowOffset;
        }
      }

      // If our child overflows the Layout, do not render it!
      // Disable this feature for now.
      if (el.position.top + el.height > height) {
        // Returning false tells blessed to ignore this child.
        // return false;
      }
    };
  }
});

for (var i = 0; i < 10; i++) {
  blessed.box({
    parent: layout,
    width: i % 2 === 0 ? 10 : 20,
    height: i % 2 === 0 ? 5 : 10,
    border: 'line'
  });
}
```


### Other


#### Helpers

All helpers reside on `blessed.helpers` or `blessed`.

- __merge(a, b)__ - Merge objects `a` and `b` into object `a`.
- __asort(obj)__ - Sort array alphabetically by `name` prop.
- __hsort(obj)__ - Sort array numerically by `index` prop.
- __findFile(start, target)__ - Find a file at `start` directory with name
  `target`.
- __escape(text)__ - Escape content's tags to be passed into `el.setContent()`.
  Example: `box.setContent('escaped tag: ' + blessed.escape('{bold}{/bold}'));`
- __parseTags(text)__ - Parse tags into SGR escape codes.
- __generateTags(style, text)__ - Generate text tags based on `style` object.
- __attrToBinary(style, element)__ - Convert `style` attributes to binary
  format.
- __stripTags(text)__ - Strip text of tags and SGR sequences.
- __cleanTags(text)__ - Strip text of tags, SGR escape code, and
  leading/trailing whitespace.
- __dropUnicode(text)__ - Drop text of any >U+FFFF characters.


### Mechanics


#### Content & Tags

Every element can have text content via `setContent`. If `tags: true` was
passed to the element's constructor, the content can contain tags. For example:

``` js
box.setContent('hello {red-fg}{green-bg}{bold}world{/bold}{/green-bg}{/red-fg}');
```

To make this more concise `{/}` cancels all character attributes.

``` js
box.setContent('hello {red-fg}{green-bg}{bold}world{/}');
```


##### Colors

Blessed tags support the basic 16 colors for colors, as well as up to 256
colors.

``` js
box.setContent('hello {red-fg}{green-bg}world{/}');
```

Tags can also use hex colors (which will be reduced to the most accurate
terminal color):

``` js
box.setContent('hello {#ff0000-fg}{#00ff00-bg}world{/}');
```


##### Attributes

Blessed supports all terminal attributes, including `bold`, `underline`,
`blink`, `inverse`, and `invisible`.

``` js
box.setContent('hello {bold}world{/bold}');
```


##### Alignment

Newlines and alignment are also possible in content.

``` js
box.setContent('hello\n'
  + '{right}world{/right}\n'
  + '{center}foo{/center}\n');
  + 'left{|}right');
```

This will produce a box that looks like:

```
| hello                 |
|                 world |
|          foo          |
| left            right |
```


##### Escaping

Escaping can either be done using `blessed.escape()`

```
box.setContent('here is an escaped tag: ' + blessed.escape('{bold}{/bold}'));
```

Or with the special `{open}` and `{close}` tags:

```
box.setContent('here is an escaped tag: {open}bold{close}{open}/bold{close}');
```

Either will produce:

```
here is an escaped tag: {bold}{/bold}
```


##### SGR Sequences

Content can also handle SGR escape codes. This means if you got output from a
program, say `git log` for example, you can feed it directly to an element's
content and the colors will be parsed appropriately.

This means that while `{red-fg}foo{/red-fg}` produces `^[[31mfoo^[[39m`, you
could just feed `^[[31mfoo^[[39m` directly to the content.


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


#### Events

Events in Blessed work similar to the traditional node.js model, with one
important difference: they have a concept of a tree and event bubbling.


##### Event Bubbling

Events can bubble in blessed. For example:

Receiving all click events for `box` (a normal event listener):

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


#### Positioning

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

Percentages can also have offsets applied to them:

``` js
  ...
  height: '50%-1',
  left: '45%+1',
  ...
```

To access the calculated offsets, relative to the parent:

``` js
console.log(box.left);
console.log(box.top);
```

To access the calculated offsets, absolute (relative to the screen):

``` js
console.log(box.aleft);
console.log(box.atop);
```


##### Overlapping offsets and dimensions greater than parents'

This still needs to be tested a bit, but it should work.


#### Rendering

To actually render the screen buffer, you must call `render`.

``` js
box.setContent('Hello {#0fe1ab-fg}world{/}.');
screen.render();
```

Elements are rendered with the lower elements in the children array being
painted first. In terms of the painter's algorithm, the lowest indicies in the
array are the furthest away, just like in the DOM.


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


#### Multiple Screens

Blessed supports the ability to create multiple screens. This may not seem
useful at first, but if you're writing a program that serves terminal
interfaces over http, telnet, or any other protocol, this can be very useful.

##### Server Side Usage

A simple telnet server might look like this (see examples/blessed-telnet.js for
a full example):

``` js
var blessed = require('blessed');
var telnet = require('telnet');

telnet.createServer(function(client) {
  client.do.transmit_binary();
  client.do.terminal_type();
  client.do.window_size();

  client.on('terminal type', function(data) {
    if (data.command === 'sb' && data.name) {
      screen.terminal = data.name;
      screen.render();
    }
  });

  client.on('window size', function(data) {
    if (data.command === 'sb') {
      client.columns = data.columns;
      client.rows = data.rows;
      client.emit('resize');
    }
  });

  // Make the client look like a tty:
  client.setRawMode = function(mode) {
    client.isRaw = mode;
    if (!client.writable) return;
    if (mode) {
      client.do.suppress_go_ahead();
      client.will.suppress_go_ahead();
      client.will.echo();
    } else {
      client.dont.suppress_go_ahead();
      client.wont.suppress_go_ahead();
      client.wont.echo();
    }
  };
  client.isTTY = true;
  client.isRaw = false;
  client.columns = 80;
  client.rows = 24;

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


### Notes


#### Windows Compatibility

Currently there is no `mouse` or `resize` event support on Windows.

Windows users will need to explicitly set `term` when creating a screen like so
(__NOTE__: This is no longer necessary as of the latest versions of blessed.
This is now handled automatically):

``` js
var screen = blessed.screen({ terminal: 'windows-ansi' });
```


#### Low-level Usage

This will actually parse the xterm terminfo and compile every
string capability to a javascript function:

``` js
var blessed = require('blessed');

var tput = blessed.tput({
  terminal: 'xterm-256color',
  extended: true
});

process.stdout.write(tput.setaf(4) + 'Hello' + tput.sgr0() + '\n');
```

To play around with it on the command line, it works just like tput:

``` bash
$ tput.js setaf 2
$ tput.js sgr0
$ echo "$(tput.js setaf 2)Hello World$(tput.js sgr0)"
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


#### Testing

Most tests contained in the `test/` directory are interactive. It's up to the
programmer to determine whether the test is properly displayed. In the future
it might be better to do something similar to vttest.


#### Examples

Examples can be found in `examples/`.


#### FAQ

1. Why doesn't the Linux console render lines correctly on Ubuntu?
  - You need to install the `ncurses-base` package __and__ the `ncurses-term`
    package. (#98)
2. Why do vertical lines look chopped up in iTerm2?
  - All ACS vertical lines look this way in iTerm2 with the default font.
3. Why can't I use my mouse in Terminal.app?
  - Terminal.app does not support mouse events.
4. Why doesn't the OverlayImage element appear in my terminal?
  - The OverlayImage element uses w3m to display images. This generally only
    works on X11+xterm/urxvt, but it _may_ work on other unix terminals.
5. Why can't my mouse clicks register beyond 255 cells?
  - Older versions of VTE do not support any modern mouse protocol. On top of
    that, the old X10 protocol it _does_ implement is bugged. Through several
    workarounds we've managed to get the cell limit from `127` to `255`. If
    you're not happy with this, you may want to look into using xterm or urxvt,
    or a terminal which uses a modern VTE, like gnome-terminal.
6. Is blessed efficient?
  - Yes. Blessed implements CSR and uses the painter's algorithm to render the
    screen. It maintains two screen buffers so it only needs to render what
    has changed on the terminal screen.
7. Will blessed work with all terminals?
  - Yes. Blessed has a terminfo/termcap parser and compiler that was written
    from scratch. It should work with every terminal as long as a terminfo
    file is provided. If you notice any compatibility issues in your termial,
    do not hesitate to post an issue.
8. What is "curses" and "ncurses"?
  - ["curses"][curses] was an old library written in the early days of unix
    which allowed a programmer to easily manipulate the cursor in order to
    render the screen. ["ncurses"][ncurses] is a free reimplementation of
    curses. It improved upon it quite a bit by focusing more on terminal
    compatibility and is now the standard library for implementing terminal
    programs. Blessed uses neither of these, and instead handles terminal
    compatibility itself.
9. What is the difference between blessed and blessed-contrib?
  - blessed is a major piece of code which reimplements curses from the ground
    up. A UI API is then layered on top of this. [blessed-contrib][contrib] is
    a popular library built on top of blessed which makes clever use of modules
    to implement useful widgets like graphs, ascii art, and so on.
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
