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


