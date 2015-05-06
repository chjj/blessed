/**
 * textbox.js - textbox element for blessed
 * Copyright (c) 2013-2015, Christopher Jeffrey and contributors (MIT License).
 * https://github.com/chjj/blessed
 */

/**
 * Modules
 */

var helpers = require('../helpers');

var Node = require('./node');
var Textarea = require('./textarea');

/**
 * Textbox
 */

function Textbox(options) {
  var self = this;

  if (!(this instanceof Node)) {
    return new Textbox(options);
  }

  options = options || {};

  options.scrollable = false;

  Textarea.call(this, options);

  this.secret = options.secret;
  this.censor = options.censor;
}

Textbox.prototype.__proto__ = Textarea.prototype;

Textbox.prototype.type = 'textbox';

Textbox.prototype.__olistener = Textbox.prototype._listener;
Textbox.prototype._listener = function(ch, key) {
  if (key.name === 'enter') {
    this._done(null, this.value);
    return;
  }
  return this.__olistener(ch, key);
};

Textbox.prototype.setValue = function(value) {
  var visible, val;
  if (value == null) {
    value = this.value;
  }
  if (this._value !== value) {
    value = value.replace(/\n/g, '');
    this.value = value;
    this._value = value;
    if (this.secret) {
      this.setContent('');
    } else if (this.censor) {
      this.setContent(Array(this.value.length + 1).join('*'));
    } else {
      visible = -(this.width - this.iwidth - 1);
      val = this.value.replace(/\t/g, this.screen.tabc);
      this.setContent(val.slice(visible));
    }
    this._updateCursor();
  }
};

Textbox.prototype.submit = function() {
  if (!this.__listener) return;
  return this.__listener('\r', { name: 'enter' });
};

/**
 * Expose
 */

module.exports = Textbox;
