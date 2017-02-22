#### ProgressBar (from Input)

A progress bar allowing various styles. This can also be used as a form input.

##### Options:

- Inherits all from Input.
- __orientation__ - Can be `horizontal` or `vertical`.
- __style.bar__ - Style of the bar contents itself.
- __pch__ - The character to fill the bar with (default is space).
- __filled__ - The amount filled (0 - 100).
- __value__ - Same as `filled`.
- __keys__ - Enable key support.
- __mouse__ - Enable mouse support.

##### Properties:

- Inherits all from Input.

##### Events:

- Inherits all from Input.
- __reset__ - Bar was reset.
- __complete__ - Bar has completely filled.

##### Methods:

- Inherits all from Input.
- __progress(amount)__ - Progress the bar by a fill amount.
- __setProgress(amount)__ - Set progress to specific amount.
- __reset()__ - Reset the bar.


