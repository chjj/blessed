/**
 * widget.js - high-level interface for blessed
 * Copyright (c) 2013-2015, Christopher Jeffrey and contributors (MIT License).
 * https://github.com/chjj/blessed
 */

var widget = exports;

widget.classes = [
  'Node',
  'Screen',
  'Element',
  'Box',
  'Text',
  'Line',
  'ScrollableBox',
  'ScrollableText',
  'List',
  'Form',
  'Input',
  'Textarea',
  'Textbox',
  'Button',
  'ProgressBar',
  'FileManager',
  'Checkbox',
  'RadioSet',
  'RadioButton',
  'Prompt',
  'Question',
  'Message',
  'Loading',
  'Listbar',
  'Log',
  'Table',
  'ListTable',
  'Terminal',
  'Image',
  'Layout'
];

widget.classes.forEach(function(name) {
  var file = name.toLowerCase();
  widget[name] = widget[file] = require('./widgets/' + file);
});
