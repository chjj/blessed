/**
 * transform.js - browserify workaround for blessed
 * Copyright (c) 2013-2015, Christopher Jeffrey and contributors (MIT License).
 * https://github.com/chjj/blessed
 */

var Transform = require('stream').Transform
  , path = require('path')
  , fs = require('fs');

var widgets = fs.readdirSync(__dirname + '/../lib/widgets');

var requires = widgets.reduce(function(out, name) {
  name = path.basename(name, '.js');
  out += '\nrequire(\'./widgets/' + name + '\');';
  return out;
}, '');

function transform(target) {
  var tr = new Transform;
  tr._transform = function(chunk, encoding, callback) {
    return callback(null, chunk);
  };
  tr._flush = function(callback) {
    if (target) {
      tr.push(requires);
    }
    return callback();
  };
  return tr;
}

module.exports = function(file) {
  if (!~file.indexOf('widget.js')) {
    return transform();
  }
  return transform(true);
};
