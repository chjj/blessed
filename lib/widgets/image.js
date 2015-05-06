/**
 * image.js - w3m image element for blessed
 * Copyright (c) 2013-2015, Christopher Jeffrey and contributors (MIT License).
 * https://github.com/chjj/blessed
 */

/**
 * Modules
 */

var fs = require('fs')
  , cp = require('child_process');

var helpers = require('../helpers');

var Node = require('./node');
var Box = require('./box');

/**
 * Image
 * Good example of w3mimgdisplay commands:
 * https://github.com/hut/ranger/blob/master/ranger/ext/img_display.py
 */

function Image(options) {
  var self = this;

  if (!(this instanceof Node)) {
    return new Image(options);
  }

  options = options || {};

  Box.call(this, options);

  if (options.w3m) {
    Image.w3mdisplay = options.w3m;
  }

  if (Image.hasW3MDisplay == null) {
    if (fs.existsSync(Image.w3mdisplay)) {
      Image.hasW3MDisplay = true;
    } else if (options.search !== false) {
      var file = helpers.findFile('/usr', 'w3mimgdisplay')
              || helpers.findFile('/lib', 'w3mimgdisplay')
              || helpers.findFile('/bin', 'w3mimgdisplay');
      if (file) {
        Image.hasW3MDisplay = true;
        Image.w3mdisplay = file;
      } else {
        Image.hasW3MDisplay = false;
      }
    }
  }

  this.on('hide', function() {
    self._lastFile = self.file;
    self.clearImage();
  });

  this.on('show', function() {
    if (!self._lastFile) return;
    self.setImage(self._lastFile);
  });

  this.on('detach', function() {
    self._lastFile = self.file;
    self.clearImage();
  });

  this.on('attach', function() {
    if (!self._lastFile) return;
    self.setImage(self._lastFile);
  });

  this.onScreenEvent('resize', function() {
    self._needsRatio = true;
  });

  // Get images to overlap properly. Maybe not worth it:
  // this.onScreenEvent('render', function() {
  //   self.screen.program.flush();
  //   if (!self._noImage) return;
  //   function display(el, next) {
  //     if (el.type === 'image' && el.file) {
  //       el.setImage(el.file, next);
  //     } else {
  //       next();
  //     }
  //   }
  //   function done(el) {
  //     el.children.forEach(recurse);
  //   }
  //   function recurse(el) {
  //     display(el, function() {
  //       var pending = el.children.length;
  //       el.children.forEach(function(el) {
  //         display(el, function() {
  //           if (!--pending) done(el);
  //         });
  //       });
  //     });
  //   }
  //   recurse(self.screen);
  // });

  this.onScreenEvent('render', function() {
    self.screen.program.flush();
    if (!self._noImage) {
      self.setImage(self.file);
    }
  });

  if (this.options.file || this.options.img) {
    this.setImage(this.options.file || this.options.img);
  }
}

Image.prototype.__proto__ = Box.prototype;

Image.prototype.type = 'image';

Image.w3mdisplay = '/usr/lib/w3m/w3mimgdisplay';

Image.prototype.spawn = function(file, args, opt, callback) {
  var screen = this.screen
    , opt = opt || {}
    , spawn = require('child_process').spawn
    , ps;

  ps = spawn(file, args, opt);

  ps.on('error', function(err) {
    if (!callback) return;
    return callback(err);
  });

  ps.on('exit', function(code) {
    if (!callback) return;
    if (code !== 0) return callback(new Error('Exit Code: ' + code));
    return callback(null, code === 0);
  });

  return ps;
};

Image.prototype.setImage = function(img, callback) {
  var self = this;

  if (this._settingImage) {
    this._queue = this._queue || [];
    this._queue.push([img, callback]);
    return;
  }
  this._settingImage = true;

  var reset = function(err, success) {
    self._settingImage = false;
    self._queue = self._queue || [];
    var item = self._queue.shift();
    if (item) {
      self.setImage(item[0], item[1]);
    }
  };

  if (Image.hasW3MDisplay === false) {
    reset();
    if (!callback) return;
    return callback(new Error('W3M Image Display not available.'));
  }

  if (!img) {
    reset();
    if (!callback) return;
    return callback(new Error('No image.'));
  }

  this.file = img;

  return this.getPixelRatio(function(err, ratio) {
    if (err) {
      reset();
      if (!callback) return;
      return callback(err);
    }

    return self.renderImage(img, ratio, function(err, success) {
      if (err) {
        reset();
        if (!callback) return;
        return callback(err);
      }

      if (self.shrink || self.options.autofit) {
        delete self.shrink;
        delete self.options.shrink;
        self.options.autofit = true;
        return self.imageSize(function(err, size) {
          if (err) {
            reset();
            if (!callback) return;
            return callback(err);
          }

          if (self._lastSize
              && ratio.tw === self._lastSize.tw
              && ratio.th === self._lastSize.th
              && size.width === self._lastSize.width
              && size.height === self._lastSize.height
              && self.aleft === self._lastSize.aleft
              && self.atop === self._lastSize.atop) {
            reset();
            if (!callback) return;
            return callback(null, success);
          }

          self._lastSize = {
            tw: ratio.tw,
            th: ratio.th,
            width: size.width,
            height: size.height,
            aleft: self.aleft,
            atop: self.atop
          };

          self.position.width = size.width / ratio.tw | 0;
          self.position.height = size.height / ratio.th | 0;

          self._noImage = true;
          self.screen.render();
          self._noImage = false;

          reset();
          return self.renderImage(img, ratio, callback);
        });
      }

      reset();
      if (!callback) return;
      return callback(null, success);
    });
  });
};

Image.prototype.renderImage = function(img, ratio, callback) {
  var self = this;

  if (cp.execSync) {
    callback = callback || function(err, result) { return result; };
    try {
      return callback(null, this.renderImageSync(img, ratio));
    } catch (e) {
      return callback(e);
    }
  }

  if (Image.hasW3MDisplay === false) {
    if (!callback) return;
    return callback(new Error('W3M Image Display not available.'));
  }

  if (!ratio) {
    if (!callback) return;
    return callback(new Error('No ratio.'));
  }

  // clearImage unsets these:
  var _file = self.file;
  var _lastSize = self._lastSize;
  return self.clearImage(function(err) {
    if (err) return callback(err);

    self.file = _file;
    self._lastSize = _lastSize;

    var opt = {
      stdio: 'pipe',
      env: process.env,
      cwd: process.env.HOME
    };

    var ps = self.spawn(Image.w3mdisplay, [], opt, function(err, success) {
      if (!callback) return;
      return err
        ? callback(err)
        : callback(null, success);
    });

    var width = self.width * ratio.tw | 0
      , height = self.height * ratio.th | 0
      , aleft = self.aleft * ratio.tw | 0
      , atop = self.atop * ratio.th | 0;

    var input = '0;1;'
      + aleft + ';'
      + atop + ';'
      + width + ';'
      + height + ';;;;;'
      + img
      + '\n4;\n3;\n';

    self._props = {
      aleft: aleft,
      atop: atop,
      width: width,
      height: height
    };

    ps.stdin.write(input);
    ps.stdin.end();
  });
};

Image.prototype.clearImage = function(callback) {
  var self = this;

  if (cp.execSync) {
    callback = callback || function(err, result) { return result; };
    try {
      return callback(null, this.clearImageSync());
    } catch (e) {
      return callback(e);
    }
  }

  if (Image.hasW3MDisplay === false) {
    if (!callback) return;
    return callback(new Error('W3M Image Display not available.'));
  }

  if (!this._props) {
    if (!callback) return;
    return callback(null);
  }

  var opt = {
    stdio: 'pipe',
    env: process.env,
    cwd: process.env.HOME
  };

  var ps = this.spawn(Image.w3mdisplay, [], opt, function(err, success) {
    if (!callback) return;
    return err
      ? callback(err)
      : callback(null, success);
  });

  var width = this._props.width + 2
    , height = this._props.height + 2
    , aleft = this._props.aleft
    , atop = this._props.atop;

  if (this._drag) {
    aleft -= 10;
    atop -= 10;
    width += 10;
    height += 10;
  }

  var input = '6;'
   + aleft + ';'
   + atop + ';'
   + width + ';'
   + height
   + '\n4;\n3;\n';

  delete this.file;
  delete this._props;
  delete this._lastSize;

  ps.stdin.write(input);
  ps.stdin.end();
};

Image.prototype.imageSize = function(callback) {
  var self = this;
  var img = this.file;

  if (cp.execSync) {
    callback = callback || function(err, result) { return result; };
    try {
      return callback(null, this.imageSizeSync());
    } catch (e) {
      return callback(e);
    }
  }

  if (Image.hasW3MDisplay === false) {
    if (!callback) return;
    return callback(new Error('W3M Image Display not available.'));
  }

  if (!img) {
    if (!callback) return;
    return callback(new Error('No image.'));
  }

  var opt = {
    stdio: 'pipe',
    env: process.env,
    cwd: process.env.HOME
  };

  var ps = this.spawn(Image.w3mdisplay, [], opt);

  var buf = '';

  ps.stdout.setEncoding('utf8');

  ps.stdout.on('data', function(data) {
    buf += data;
  });

  ps.on('error', function(err) {
    if (!callback) return;
    return callback(err);
  });

  ps.on('exit', function() {
    if (!callback) return;
    var size = buf.trim().split(/\s+/);
    return callback(null, {
      raw: buf.trim(),
      width: +size[0],
      height: +size[1]
    });
  });

  var input = '5;' + img + '\n';

  ps.stdin.write(input);
  ps.stdin.end();
};

Image.prototype.termSize = function(callback) {
  var self = this;

  if (cp.execSync) {
    callback = callback || function(err, result) { return result; };
    try {
      return callback(null, this.termSizeSync());
    } catch (e) {
      return callback(e);
    }
  }

  if (Image.hasW3MDisplay === false) {
    if (!callback) return;
    return callback(new Error('W3M Image Display not available.'));
  }

  var opt = {
    stdio: 'pipe',
    env: process.env,
    cwd: process.env.HOME
  };

  var ps = this.spawn(Image.w3mdisplay, ['-test'], opt);

  var buf = '';

  ps.stdout.setEncoding('utf8');

  ps.stdout.on('data', function(data) {
    buf += data;
  });

  ps.on('error', function(err) {
    if (!callback) return;
    return callback(err);
  });

  ps.on('exit', function() {
    if (!callback) return;

    if (!buf.trim()) {
      // Bug: w3mimgdisplay will sometimes
      // output nothing. Try again:
      return self.termSize(callback);
    }

    var size = buf.trim().split(/\s+/);

    return callback(null, {
      raw: buf.trim(),
      width: +size[0],
      height: +size[1]
    });
  });

  ps.stdin.end();
};

Image.prototype.getPixelRatio = function(callback) {
  var self = this;

  if (cp.execSync) {
    callback = callback || function(err, result) { return result; };
    try {
      return callback(null, this.getPixelRatioSync());
    } catch (e) {
      return callback(e);
    }
  }

  // XXX We could cache this, but sometimes it's better
  // to recalculate to be pixel perfect.
  if (this._ratio && !this._needsRatio) {
    return callback(null, this._ratio);
  }

  return this.termSize(function(err, dimensions) {
    if (err) return callback(err);

    self._ratio = {
      tw: dimensions.width / self.screen.width,
      th: dimensions.height / self.screen.height
    };

    self._needsRatio = false;

    return callback(null, self._ratio);
  });
};

Image.prototype.renderImageSync = function(img, ratio) {
  var self = this;

  if (Image.hasW3MDisplay === false) {
    throw new Error('W3M Image Display not available.');
  }

  if (!ratio) {
    throw new Error('No ratio.');
  }

  // clearImage unsets these:
  var _file = this.file;
  var _lastSize = this._lastSize;

  this.clearImageSync();

  this.file = _file;
  this._lastSize = _lastSize;

  var width = this.width * ratio.tw | 0
    , height = this.height * ratio.th | 0
    , aleft = this.aleft * ratio.tw | 0
    , atop = this.atop * ratio.th | 0;

  var input = '0;1;'
    + aleft + ';'
    + atop + ';'
    + width + ';'
    + height + ';;;;;'
    + img
    + '\n4;\n3;\n';

  this._props = {
    aleft: aleft,
    atop: atop,
    width: width,
    height: height
  };

  try {
    cp.execFileSync(Image.w3mdisplay, [], {
      env: process.env,
      encoding: 'utf8',
      input: input,
      timeout: 1000
    });
  } catch (e) {
    ;
  }

  return true;
};

Image.prototype.clearImageSync = function() {
  if (Image.hasW3MDisplay === false) {
    throw new Error('W3M Image Display not available.');
  }

  if (!this._props) {
    return false;
  }

  var width = this._props.width + 2
    , height = this._props.height + 2
    , aleft = this._props.aleft
    , atop = this._props.atop;

  if (this._drag) {
    aleft -= 10;
    atop -= 10;
    width += 10;
    height += 10;
  }

  var input = '6;'
   + aleft + ';'
   + atop + ';'
   + width + ';'
   + height
   + '\n4;\n3;\n';

  delete this.file;
  delete this._props;
  delete this._lastSize;

  try {
    cp.execFileSync(Image.w3mdisplay, [], {
      env: process.env,
      encoding: 'utf8',
      input: input,
      timeout: 1000
    });
  } catch (e) {
    ;
  }

  return true;
};

Image.prototype.imageSizeSync = function() {
  var img = this.file;

  if (Image.hasW3MDisplay === false) {
    throw new Error('W3M Image Display not available.');
  }

  if (!img) {
    throw new Error('No image.');
  }

  var buf = '';
  var input = '5;' + img + '\n';

  try {
    buf = cp.execFileSync(Image.w3mdisplay, [], {
      env: process.env,
      encoding: 'utf8',
      input: input,
      timeout: 1000
    });
  } catch (e) {
    ;
  }

  var size = buf.trim().split(/\s+/);

  return {
    raw: buf.trim(),
    width: +size[0],
    height: +size[1]
  };
};

Image.prototype.termSizeSync = function(_, recurse) {
  if (Image.hasW3MDisplay === false) {
    throw new Error('W3M Image Display not available.');
  }

  var buf = '';

  try {
    buf = cp.execFileSync(Image.w3mdisplay, ['-test'], {
      env: process.env,
      encoding: 'utf8',
      timeout: 1000
    });
  } catch (e) {
    ;
  }

  if (!buf.trim()) {
    // Bug: w3mimgdisplay will sometimes
    // output nothing. Try again:
    recurse = recurse || 0;
    if (++recurse === 5) {
      throw new Error('Term size not determined.');
    }
    return this.termSizeSync(_, recurse);
  }

  var size = buf.trim().split(/\s+/);

  return {
    raw: buf.trim(),
    width: +size[0],
    height: +size[1]
  };
};

Image.prototype.getPixelRatioSync = function() {
  var self = this;

  // XXX We could cache this, but sometimes it's better
  // to recalculate to be pixel perfect.
  if (this._ratio && !this._needsRatio) {
    return this._ratio;
  }
  this._needsRatio = false;

  var dimensions = this.termSizeSync();

  this._ratio = {
    tw: dimensions.width / this.screen.width,
    th: dimensions.height / this.screen.height
  };

  return this._ratio;
};

Image.prototype.displayImage = function(callback) {
  return this.screen.displayImage(this.file, callback);
};

/**
 * Expose
 */

module.exports = Image;
