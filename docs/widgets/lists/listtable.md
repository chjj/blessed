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

