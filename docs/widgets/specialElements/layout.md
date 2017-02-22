#### Layout (from Element)

A layout which can position children automatically based on a `renderer` method
(__experimental__ - the mechanics of this element may be changed in the
future!).

By default, the Layout element automatically positions children as if they were
`display: inline-block;` in CSS.

##### Options:

- Inherits all from Element.
- __renderer__ - A callback which is called right before the children are
  iterated over to be rendered. Should return an iterator callback which is
  called on each child element: __iterator(el, i)__.
- __layout__ - Using the default renderer, it provides two layouts: inline, and
  grid. `inline` is the default and will render akin to `inline-block`. `grid`
  will create an automatic grid based on element dimensions. The grid cells'
  width and height are always determined by the largest children in the layout.

##### Properties:

- Inherits all from Element.

##### Events:

- Inherits all from Element.

##### Methods:

- Inherits all from Element.
- __renderer(coords)__ - A callback which is called right before the children
  are iterated over to be rendered. Should return an iterator callback which is
  called on each child element: __iterator(el, i)__.
- __isRendered(el)__ - Check to see if a previous child element has been
  rendered and is visible on screen. This is __only__ useful for checking child
  elements that have already been attempted to be rendered! see the example
  below.
- __getLast(i)__ - Get the last rendered and visible child element based on an
  index. This is useful for basing the position of the current child element on
  the position of the last child element.
- __getLastCoords(i)__ - Get the last rendered and visible child element coords
  based on an index. This is useful for basing the position of the current
  child element on the position of the last child element. See the example
  below.

##### Rendering a Layout for child elements

###### Notes

You must __always__ give `Layout` a width and height. This is a chicken-and-egg
problem: blessed cannot calculate the width and height dynamically _before_ the
children are positioned.

`border` and `padding` are already calculated into the `coords` object the
`renderer` receives, so there is no need to account for it in your renderer.

Try to set position for children using `el.position`. `el.position` is the most
primitive "to-be-rendered" way to set coordinates. Setting `el.left` directly
has more dynamic behavior which may interfere with rendering.

Some definitions for `coords` (otherwise known as `el.lpos`):

- `coords.xi` - the absolute x coordinate of the __left__ side of a rendered
  element. It is absolute: relative to the screen itself.
- `coords.xl` - the absolute x coordinate of the __right__ side of a rendered
  element. It is absolute: relative to the screen itself.
- `coords.yi` - the absolute y coordinate of the __top__ side of a rendered
  element. It is absolute: relative to the screen itself.
- `coords.yl` - the absolute y coordinate of the __bottom__ side of a rendered
  element. It is absolute: relative to the screen itself.

Note again: the `coords` the renderer receives for the Layout already has
border and padding subtracted, so you do not have to account for these. The
children do not.

###### Example

Here is an example of how to provide a renderer. Note that this is also the
default renderer if none is provided. This renderer will render each child as
though they were `display: inline-block;` in CSS, as if there were a
dynamically sized horizontal grid from left to right.

``` js
var layout = blessed.layout({
  parent: screen,
  top: 'center',
  left: 'center',
  width: '50%',
  height: '50%',
  border: 'line',
  style: {
    bg: 'red',
    border: {
      fg: 'blue'
    }
  },
  // NOTE: This is already the default renderer if none is provided!
  renderer: function(coords) {
    var self = this;

    // The coordinates of the layout element
    var width = coords.xl - coords.xi
      , height = coords.yl - coords.yi
      , xi = coords.xi
      , xl = coords.xl
      , yi = coords.yi
      , yl = coords.yl;

    // The current row offset in cells (which row are we on?)
    var rowOffset = 0;

    // The index of the first child in the row
    var rowIndex = 0;

    return function iterator(el, i) {
      // Make our children shrinkable. If they don't have a height, for
      // example, calculate it for them.
      el.shrink = true;

      // Find the previous rendered child's coordinates
      var last = self.getLastCoords(i);

      // If there is no previously rendered element, we are on the first child.
      if (!last) {
        el.position.left = 0;
        el.position.top = 0;
      } else {
        // Otherwise, figure out where to place this child. We'll start by
        // setting it's `left`/`x` coordinate to right after the previous
        // rendered element. This child will end up directly to the right of it.
        el.position.left = last.xl - xi;

        // If our child does not overlap the right side of the Layout, set it's
        // `top`/`y` to the current `rowOffset` (the coordinate for the current
        // row).
        if (el.position.left + el.width <= width) {
          el.position.top = rowOffset;
        } else {
          // Otherwise we need to start a new row and calculate a new
          // `rowOffset` and `rowIndex` (the index of the child on the current
          // row).
          rowOffset += self.children.slice(rowIndex, i).reduce(function(out, el) {
            if (!self.isRendered(el)) return out;
            out = Math.max(out, el.lpos.yl - el.lpos.yi);
            return out;
          }, 0);
          rowIndex = i;
          el.position.left = 0;
          el.position.top = rowOffset;
        }
      }

      // If our child overflows the Layout, do not render it!
      // Disable this feature for now.
      if (el.position.top + el.height > height) {
        // Returning false tells blessed to ignore this child.
        // return false;
      }
    };
  }
});

for (var i = 0; i < 10; i++) {
  blessed.box({
    parent: layout,
    width: i % 2 === 0 ? 10 : 20,
    height: i % 2 === 0 ? 5 : 10,
    border: 'line'
  });
}
