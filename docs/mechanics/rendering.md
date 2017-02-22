
#### Rendering

To actually render the screen buffer, you must call `render`.

``` js
box.setContent('Hello {#0fe1ab-fg}world{/}.');
screen.render();
```

Elements are rendered with the lower elements in the children array being
painted first. In terms of the painter's algorithm, the lowest indicies in the
array are the furthest away, just like in the DOM.



