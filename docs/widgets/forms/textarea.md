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



