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


