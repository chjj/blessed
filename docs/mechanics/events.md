#### Events

Events in Blessed work similar to the traditional node.js model, with one
important difference: they have a concept of a tree and event bubbling.


##### Event Bubbling

Events can bubble in blessed. For example:

Receiving all click events for `box` (a normal event listener):

``` js
box.on('click', function(mouse) {
  box.setContent('You clicked ' + mouse.x + ', ' + mouse.y + '.');
  screen.render();
});
```

Receiving all click events for `box`, as well as all of its children:

``` js
box.on('element click', function(el, mouse) {
  box.setContent('You clicked '
    + el.type + ' at ' + mouse.x + ', ' + mouse.y + '.');
  screen.render();
  if (el === box) {
    return false; // Cancel propagation.
  }
});
```

`el` gets passed in as the first argument. It refers to the target element the
event occurred on. Returning `false` will cancel propagation up the tree.


