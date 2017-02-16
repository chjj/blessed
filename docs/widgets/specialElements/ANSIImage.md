#### ANSIImage (from Box)

Convert any `.png` file (or `.gif`, see below) to an ANSI image and display it
as an element. This differs from the `OverlayImage` element in that it uses
blessed's internal PNG/GIF parser and does not require external dependencies.

Blessed uses an internal from-scratch PNG/GIF reader because no other javascript
PNG reader supports Adam7 interlaced images (much less pass the png test
suite).

The blessed PNG reader supports adam7 deinterlacing, animation (APNG), all
color types, bit depths 1-32, alpha, alpha palettes, and outputs scaled bitmaps
(cellmaps) in blessed for efficient rendering to the screen buffer. It also
uses some code from libcaca/libcucul to add density ASCII characters in order
to give the image more detail in the terminal.

If a corrupt PNG or a non-PNG is passed in, blessed will display error text in
the element.

`.gif` files are also supported via a javascript implementation (they are
internally converted to bitmaps and fed to the PNG renderer). Any other image
format is support only if the user has imagemagick (`convert` and `identify`)
installed.

##### Options:

- Inherits all from Box.
- __file__ - URL or path to PNG/GIF file. Can also be a buffer.
- __scale__ - Scale cellmap down (`0-1.0`) from its original pixel width/height
  (Default: `1.0`).
- __width/height__ - This differs from other element's `width` or `height` in
  that only one of them is needed: blessed will maintain the aspect ratio of
  the image as it scales down to the proper number of cells. __NOTE__: PNG/GIF's
  are always automatically shrunken to size (based on scale) if a `width` or
  `height` is not given.
- __ascii__ - Add various "density" ASCII characters over the rendering to give
  the image more detail, similar to libcaca/libcucul (the library mplayer uses
  to display videos in the terminal).
- __animate__ - Whether to animate if the image is an APNG/animating GIF. If
  false, only display the first frame or IDAT (Default: `true`).
- __speed__ - Set the speed of animation. Slower: `0.0-1.0`. Faster: `1-1000`.
  It cannot go faster than 1 frame per millisecond, so 1000 is the fastest.
  (Default: 1.0)
- __optimization__ - `mem` or `cpu`. If optimizing for memory, animation frames
  will be rendered to bitmaps _as the animation plays_, using less memory.
  Optimizing for cpu will precompile all bitmaps beforehand, which may be
  faster, but might also OOM the process on large images. (Default: `mem`).

##### Properties:

- Inherits all from Box.
- __img__ - Image object from the png reader.
- __img.width__ - Pixel width.
- __img.height__ - Pixel height.
- __img.bmp__ - Image bitmap.
- __img.cellmap__ - Image cellmap (bitmap scaled down to cell size).

##### Events:

- Inherits all from Box.

##### Methods:

- Inherits all from Box.
- __setImage(file)__ - Set the image in the box to a new path. File can be a
  path, url, or buffer.
- __clearImage()__ - Clear the image.
- __play()__ - Play animation if it has been paused or stopped.
- __pause()__ - Pause animation.
- __stop()__ - Stop animation.



