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


