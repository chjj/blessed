/**
 * Blessed
 * A curses-like library for node.js.
 * Copyright (c) 2013-2015, Christopher Jeffrey and contributors (MIT License).
 * https://github.com/chjj/blessed
 */

/**
 * Modules
 */

var program = require('./program')
  , tput = require('./tput')
  , widget = require('./widget')
  , colors = require('./colors')
  , unicode = require('./unicode');

/**
 * Blessed
 */

function blessed() {
  return program.apply(null, arguments);
}

blessed.program = blessed.Program = program;
blessed.tput = blessed.Tput = tput;
blessed.widget = widget;
blessed.colors = colors;
blessed.unicode = unicode;

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
