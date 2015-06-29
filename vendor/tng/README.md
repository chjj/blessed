# tng

A full-featured PNG renderer for the terminal, built for [blessed][blessed].

![tng](https://raw.githubusercontent.com/chjj/blessed/master/img/demo.png)

Convert any `.png` file (or `.gif`, see below) to an ANSI image and display it
as an element or ANSI text.

Blessed uses an internal from-scratch PNG reader because no other javascript
PNG reader supports Adam7 interlaced images (much less pass the png test
suite).

The blessed PNG reader supports adam7 deinterlacing, animation (APNG), all
color types, bit depths 1-32, alpha, alpha palettes, and outputs scaled bitmaps
(cellmaps) in blessed for efficient rendering to the screen buffer. It also
uses some code from libcaca/libcucul to add density ASCII characters in order
to give the image more detail in the terminal.

`.gif` files are also supported via a javascript implementation (they are
internally converted to bitmaps and fed to the PNG renderer). Any other image
format is support only if the user has imagemagick (`convert` and `identify`)
installed.


## Contribution and License Agreement

If you contribute code to this project, you are implicitly allowing your code
to be distributed under the MIT license. You are also implicitly verifying that
all code is your original work. `</legalese>`


## License

Copyright (c) 2015, Christopher Jeffrey. (MIT License)

See LICENSE for more info.

[blessed]: https://github.com/chjj/blessed
