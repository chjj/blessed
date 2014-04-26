/**
 * Blessed
 * A curses-like library for node.js.
 * Copyright (c) 2013, Christopher Jeffrey (MIT License).
 * https://github.com/chjj/blessed
 */

/**
 * Modules
 */

var program = require('./program')
  , tput = require('./tput')
  , widget = require('./widget')
  , colors = require('./colors');

/**
 * Blessed
 */

function blessed() {
  return program.apply(null, arguments);
}

blessed.program = blessed.Program = program;
blessed.tput = blessed.Tput = tput;
blessed.colors = colors;
blessed.widget = widget;

Object.keys(blessed.widget).forEach(function(name) {
  blessed[name] = blessed.widget[name];
});

blessed.helpers = {
  sprintf: blessed.tput.sprintf,
  merge: blessed.tput.merge,
  tryRead: blessed.tput.tryRead
};

Object.keys(widget.helpers).forEach(function(key) {
  blessed.helpers[key] = widget.helpers[key];
  blessed[key] = widget.helpers[key];
});

/**
 * Expose
 */

module.exports = blessed;
