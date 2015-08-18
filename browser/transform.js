/**
 * transform.js - browserify workaround for blessed
 * Copyright (c) 2013-2015, Christopher Jeffrey and contributors (MIT License).
 * https://github.com/chjj/blessed
 */

var Transform = require('stream').Transform
  , path = require('path')
  , fs = require('fs');

/**
 * Transformer
 */

function transformer(code) {
  var stream = new Transform;
  stream._transform = function(chunk, encoding, callback) {
    return callback(null, chunk);
  };
  stream._flush = function(callback) {
    if (code) {
      stream.push(code);
    }
    return callback();
  };
  return stream;
}

/**
 * Explicitly require all widgets in widget.js
 */

var widgets = fs.readdirSync(__dirname + '/../lib/widgets');

var requireWidgets = widgets.reduce(function(out, name) {
  name = path.basename(name, '.js');
  out += '\nrequire(\'./widgets/' + name + '\');';
  return out;
}, '');

/**
 * Do not make filesystem calls in tput.js for
 * terminfo or termcap, just use xterm terminfo/cap.
 */

var infoPath = path.resolve(__dirname, '..', 'usr', 'xterm-256color')
  , capPath = path.resolve(__dirname, '..', 'usr', 'xterm.termcap');

var infoPathFake = path.resolve(
  path.sep, 'usr', 'share', 'terminfo',
  path.basename(infoPath)[0],
  path.basename(infoPath)
);

function readMethods() {
  Tput._infoBuffer = new Buffer(TERMINFO, 'base64');

  Tput.prototype.readTerminfo = function() {
    this.terminal = TERMINFO_NAME;
    return this.parseTerminfo(Tput._infoBuffer, TERMINFO_PATH);
  };

  Tput.cpaths = [];
  Tput.termcap = TERMCAP;

  Tput.prototype._readTermcap = Tput.prototype.readTermcap;
  Tput.prototype.readTermcap = function() {
    this.terminal = TERMCAP_NAME;
    return this._readTermcap(this.terminal);
  };

  Tput.prototype.detectUnicode = function() {
    return true;
  };
}

readMethods = readMethods.toString().slice(24, -2)
  .replace(/^  /gm, '')
  .replace('TERMINFO', JSON.stringify(fs.readFileSync(infoPath, 'base64')))
  .replace('TERMINFO_NAME', JSON.stringify(path.basename(infoPath)))
  .replace('TERMINFO_PATH', JSON.stringify(infoPathFake))
  .replace('TERMCAP', JSON.stringify(fs.readFileSync(capPath, 'utf8')))
  .replace('TERMCAP_NAME', JSON.stringify(path.basename(capPath, '.termcap')));

/**
 * Helpers
 */

function end(file, offset) {
  return file.split(path.sep).slice(-offset).join('/');
}

/**
 * Expose
 */

module.exports = function(file) {
  if (end(file, 2) === 'lib/widget.js') {
    return transformer(requireWidgets);
  }
  if (end(file, 2) === 'lib/tput.js') {
    return transformer(readMethods);
  }
  return transformer();
};
