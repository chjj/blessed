#### Windows Compatibility

Currently there is no `mouse` or `resize` event support on Windows.

Windows users will need to explicitly set `term` when creating a screen like so
(__NOTE__: This is no longer necessary as of the latest versions of blessed.
This is now handled automatically):

``` js
var screen = blessed.screen({ terminal: 'windows-ansi' });
```


