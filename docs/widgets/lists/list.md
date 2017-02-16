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


