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


