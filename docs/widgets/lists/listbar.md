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


