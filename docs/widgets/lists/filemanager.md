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


