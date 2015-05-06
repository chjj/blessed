/**
 * filemanager.js - file manager element for blessed
 * Copyright (c) 2013-2015, Christopher Jeffrey and contributors (MIT License).
 * https://github.com/chjj/blessed
 */

/**
 * Modules
 */

var path = require('path')
  , fs = require('fs');

var helpers = require('../helpers');

var Node = require('./node');
var List = require('./list');

/**
 * FileManager
 */

function FileManager(options) {
  var self = this;

  if (!(this instanceof Node)) {
    return new FileManager(options);
  }

  options = options || {};
  options.parseTags = true;
  // options.label = ' {blue-fg}%path{/blue-fg} ';

  List.call(this, options);

  this.cwd = options.cwd || process.cwd();
  this.file = this.cwd;
  this.value = this.cwd;

  if (options.label && ~options.label.indexOf('%path')) {
    this._label.setContent(options.label.replace('%path', this.cwd));
  }

  this.on('select', function(item) {
    var value = item.content.replace(/\{[^{}]+\}/g, '').replace(/@$/, '')
      , file = path.resolve(self.cwd, value);

    return fs.stat(file, function(err, stat) {
      if (err) {
        return self.emit('error', err, file);
      }
      self.file = file;
      self.value = file;
      if (stat.isDirectory()) {
        self.emit('cd', file, self.cwd);
        self.cwd = file;
        if (options.label && ~options.label.indexOf('%path')) {
          self._label.setContent(options.label.replace('%path', file));
        }
        self.refresh();
      } else {
        self.emit('file', file);
      }
    });
  });
}

FileManager.prototype.__proto__ = List.prototype;

FileManager.prototype.type = 'file-manager';

FileManager.prototype.refresh = function(cwd, callback) {
  if (!callback) {
    callback = cwd;
    cwd = null;
  }

  var self = this;

  if (cwd) this.cwd = cwd;
  else cwd = this.cwd;

  return fs.readdir(cwd, function(err, list) {
    if (err && err.code === 'ENOENT') {
      self.cwd = cwd !== process.env.HOME
        ? process.env.HOME
        : '/';
      return self.refresh(callback);
    }

    if (err) {
      if (callback) return callback(err);
      return self.emit('error', err, cwd);
    }

    var dirs = []
      , files = [];

    list.unshift('..');

    list.forEach(function(name) {
      var f = path.resolve(cwd, name)
        , stat;

      try {
        stat = fs.lstatSync(f);
      } catch (e) {
        ;
      }

      if ((stat && stat.isDirectory()) || name === '..') {
        dirs.push({
          name: name,
          text: '{light-blue-fg}' + name + '{/light-blue-fg}/',
          dir: true
        });
      } else if (stat && stat.isSymbolicLink()) {
        files.push({
          name: name,
          text: '{light-cyan-fg}' + name + '{/light-cyan-fg}@',
          dir: false
        });
      } else {
        files.push({
          name: name,
          text: name,
          dir: false
        });
      }
    });

    dirs = helpers.asort(dirs);
    files = helpers.asort(files);

    list = dirs.concat(files).map(function(data) {
      return data.text;
    });

    self.setItems(list);
    self.select(0);
    self.screen.render();

    self.emit('refresh');

    if (callback) callback();
  });
};

FileManager.prototype.pick = function(cwd, callback) {
  if (!callback) {
    callback = cwd;
    cwd = null;
  }

  var self = this
    , focused = this.screen.focused === this
    , hidden = this.hidden
    , onfile
    , oncancel;

  function resume() {
    self.removeListener('file', onfile);
    self.removeListener('cancel', oncancel);
    if (hidden) {
      self.hide();
    }
    if (!focused) {
      self.screen.restoreFocus();
    }
    self.screen.render();
  }

  this.on('file', onfile = function(file) {
    resume();
    return callback(null, file);
  });

  this.on('cancel', oncancel = function() {
    resume();
    return callback();
  });

  this.refresh(cwd, function(err) {
    if (err) return callback(err);

    if (hidden) {
      self.show();
    }

    if (!focused) {
      self.screen.saveFocus();
      self.focus();
    }

    self.screen.render();
  });
};

FileManager.prototype.reset = function(cwd, callback) {
  if (!callback) {
    callback = cwd;
    cwd = null;
  }
  this.cwd = cwd || this.options.cwd;
  this.refresh(callback);
};

/**
 * Expose
 */

module.exports = FileManager;
