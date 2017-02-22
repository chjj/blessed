#### OverlayImage (from Box)

Display an image in the terminal (jpeg, png, gif) using w3mimgdisplay. Requires
w3m to be installed. X11 required: works in xterm, urxvt, and possibly other
terminals.

##### Options:

- Inherits all from Box.
- __file__ - Path to image.
- __ansi__ - Render the file as ANSI art instead of using `w3m` to overlay
  Internally uses the ANSIImage element. See the [ANSIImage element](#ansiimage-from-box) for
  more information/options. (Default: `true`).
- __w3m__ - Path to w3mimgdisplay. If a proper `w3mimgdisplay` path is not
  given, blessed will search the entire disk for the binary.
- __search__ - Whether to search `/usr`, `/bin`, and `/lib` for
  `w3mimgdisplay` (Default: `true`).

##### Properties:

- Inherits all from Box.

##### Events:

- Inherits all from Box.

##### Methods:

- Inherits all from Box.
- __setImage(img, [callback])__ - Set the image in the box to a new path.
- __clearImage([callback])__ - Clear the current image.
- __imageSize(img, [callback])__ - Get the size of an image file in pixels.
- __termSize([callback])__ - Get the size of the terminal in pixels.
- __getPixelRatio([callback])__ - Get the pixel to cell ratio for the terminal.
- _Note:_ All methods above can be synchronous as long as the host version of
  node supports `spawnSync`.



