var Transform = require('stream').Transform;

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
    tr.push(compile(data));
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
