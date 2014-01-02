/**
 * Blessed
 * A curses-like library for node.js.
 * Copyright (c) 2013, Christopher Jeffrey (MIT License).
 * https://github.com/chjj/blessed
 */

/**
 * Modules
 */

function define(names, callback) {
  if (!Array.isArray(names)) names = [names];
  names.forEach(function(name) {
    blessed.__defineGetter__(name, callback);
  });
}

function load(name) {
  load.modules = load.modules || {};
  if (load.modules[name]) return load.modules[name];
  return load.modules[name] = require(name);
}

function unload(names) {
  if (!Array.isArray(names)) names = [names];
  names.forEach(function(name) {
    delete load.modules[name];
    delete require.cache[require.resolve(name)];
  });
}

/**
 * Blessed
 */

function blessed() {
  return blessed.program.apply(null, arguments);
}

define(['program', 'Program'], function() {
  return load('./program');
});

define(['tput', 'Tput'], function() {
  return load('./tput');
});

define('colors', function() {
  return load('./colors');
});

define('widget', function() {
  return load('./widget');
});

var widgets = [
  'Node',
  'Screen',
  'Element',
  'Box',
  'Text',
  'Line',
  'ScrollableBox',
  'List',
  'ScrollableText',
  'Form',
  'Input',
  'Textbox',
  'Textarea',
  'Button',
  'ProgressBar',
  'FileManager',

  'Checkbox',
  'RadioSet',
  'RadioButton',

  'Prompt',
  'Question',
  'Message',
  'Info',
  'Loading',
  'PickList',
  'Listbar',
  'DirManager',
  'Passbox'
];

widgets = widgets.concat(widgets.map(function(name) {
  return name.toLowerCase();
}));

widgets.forEach(function(name) {
  define(name, function() {
    return blessed.widget[name];
  });
});

// Maybe just:
// define(['screen', 'Screen'], function() {
//   Object.keys(blessed.widget).forEach(function(name) {
//     blessed.__defineGetter__(name, function() {
//       return blessed.widget[name];
//     });
//   });
//   return blessed.widget.screen;
// });

// Or:
// Object.keys(blessed.widget).forEach(function(name) {
//   blessed.__defineGetter__(name, function() {
//     return blessed.widget[name];
//   });
// });
// unload(['./alias', './colors', './events', './program', './tput', './widget']);

blessed.helpers = {
  get sprintf() {
    return blessed.tput.sprintf;
  },
  get merge() {
    return blessed.tput.merge;
  },
  get tryRead() {
    return blessed.tput.tryRead;
  }
};

/**
 * Expose
 */

module.exports = blessed;
