#### Positioning

Offsets may be a number, a percentage (e.g. `50%`), or a keyword (e.g.
`center`).

Dimensions may be a number, or a percentage (e.g. `50%`).

Positions are treated almost _exactly_ the same as they are in CSS/CSSOM when
an element has the `position: absolute` CSS property.

When an element is created, it can be given coordinates in its constructor:

``` js
var box = blessed.box({
  left: 'center',
  top: 'center',
  bg: 'yellow',
  width: '50%',
  height: '50%'
});
```

This tells blessed to create a box, perfectly centered __relative to its
parent__, 50% as wide and 50% as tall as its parent.

Percentages can also have offsets applied to them:

``` js
  ...
  height: '50%-1',
  left: '45%+1',
  ...
```

To access the calculated offsets, relative to the parent:

``` js
console.log(box.left);
console.log(box.top);
```

To access the calculated offsets, absolute (relative to the screen):

``` js
console.log(box.aleft);
console.log(box.atop);
```


##### Overlapping offsets and dimensions greater than parents'

This still needs to be tested a bit, but it should work.


