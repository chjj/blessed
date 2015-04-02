// `tail -f` a file.
module.exports = function(file) {
  var self = this
    , fs = require('fs')
    , StringDecoder = require('string_decoder').StringDecoder
    , decode = new StringDecoder('utf8')
    , buffer = new Buffer(64 * 1024)
    , Stream = require('stream').Stream
    , s = new Stream
    , buff = ''
    , pos = 0;

  s.readable = true;
  s.destroy = function() {
    s.destroyed = true;
    s.emit('end');
    s.emit('close');
  };

  fs.open(file, 'a+', 0644, function(err, fd) {
    if (err) {
      s.emit('error', err);
      s.destroy();
      return;
    }

    (function read() {
      if (s.destroyed) {
        fs.close(fd);
        return;
      }

      return fs.read(fd, buffer, 0, buffer.length, pos, function(err, bytes) {
        if (err) {
          s.emit('error', err);
          s.destroy();
          return;
        }

        if (!bytes) {
          if (buff) {
            stream.emit('line', buff);
            buff = '';
          }
          return setTimeout(read, 1000);
        }

        var data = decode.write(buffer.slice(0, bytes));

        s.emit('data', data);

        var data = (buff + data).split(/\n+/)
          , l = data.length - 1
          , i = 0;

        for (; i < l; i++) {
          s.emit('line', data[i]);
        }

        buff = data[l];

        pos += bytes;

        return read();
      });
    })();
  });

  return s;
};
