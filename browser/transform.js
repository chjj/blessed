/**
 * transform.js - browserify workaround for blessed
 * Copyright (c) 2013-2015, Christopher Jeffrey and contributors (MIT License).
 * https://github.com/chjj/blessed
 */

var Transform = require('stream').Transform
  , path = require('path')
  , fs = require('fs');

var requireList = (function() {
  var out = '';
  fs.readdirSync(__dirname + '/../lib/widgets').forEach(function(name) {
    name = path.basename(name, '.js');
    out += '\nrequire(\'./widgets/' + name + '\');';
  });
  return out;
})();

function transform(target) {
  var data = '';
  var tr = new Transform;
  tr._transform = function(chunk, encoding, callback) {
    if (!target) {
      return callback(null, chunk);
    }
    data += chunk;
    return callback(null, chunk);
  };
  tr._flush = function(callback) {
    if (!target) {
      return callback();
    }
    // tr.push(compile(data));
    tr.push(requireList);
    return callback();
  };
  return tr;
}

function compile(data) {
  var out = '';
  var names = /widget\.classes = (\[[^\]]+\]);/.exec(data)[1];
  names = JSON.parse(names.replace(/'/g, '"')).forEach(function(name) {
    name = name.toLowerCase();
    out += '\nrequire(\'./widgets/' + name + '\');';
  });
  return out;
}

module.exports = function(file) {
  if (!~file.indexOf('widget.js')) {
    return transform();
  }
  return transform(true);
};
