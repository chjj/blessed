/**
 * textarea.js - textarea element for blessed
 * Copyright (c) 2013-2015, Christopher Jeffrey and contributors (MIT License).
 * https://github.com/chjj/blessed
 */

/**
 * Modules
 */

var unicode = require('../unicode');

var nextTick = global.setImmediate || process.nextTick.bind(process);

var Node = require('./node');
var Input = require('./input');

/**
 * Textarea
 */

function Textarea(options) {
  var self = this;

  if (!(this instanceof Node)) {
    return new Textarea(options);
  }

  options = options || {};

  options.scrollable = options.scrollable !== false;

  Input.call(this, options);

  this.screen._listenKeys(this);

  this.offsetY = 0;
  this.offsetX = 0;

  this.value = options.value || '';

  this.__updateCursor = this._updateCursor.bind(this);
  this.on('resize', this.__updateCursor);
  this.on('move', this.__updateCursor);

  if (options.inputOnFocus) {
    this.on('focus', this.readInput.bind(this, null));
  }

  if (!options.inputOnFocus && options.keys) {
    this.on('keypress', function(ch, key) {
      if (self._reading) return;
      if (key.name === 'enter' || (options.vi && key.name === 'i')) {
        return self.readInput();
      }
      if (key.name === 'e') {
        return self.readEditor();
      }
    });
  }

  if (options.mouse) {
    this.on('click', function(data) {
      if (self._reading) return;
      if (data.button !== 'right') return;
      self.readEditor();
    });
  }
}

Textarea.prototype.__proto__ = Input.prototype;

Textarea.prototype.type = 'textarea';

Textarea.prototype.getCursor = function(){
  return {x: this.offsetX, y: this.offsetY};
}

Textarea.prototype.setCursor = function(x, y){
  this.offsetX = x;
  this.offsetY = y;
}

Textarea.prototype.moveCursor = function(x, y){
  var prevLine = (this._clines.length - 1) + this.offsetY;
  let sync = false;
  if (y <= 0 && y > (this._clines.length * -1)){
    sync = this.offsetY !== y;
    this.offsetY = y;
  }
  var currentLine = (this._clines.length - 1) + this.offsetY;
  var currentText = this._clines[currentLine];

  if (sync){
    var prevText = this._clines[prevLine];
    var positionFromBegin = Math.max(this.strWidth(prevText) + this.offsetX, 0);
    x = (Math.max(0, this.strWidth(currentText) - positionFromBegin)) * -1;
  }
  if (x <= 0 && x >= (this.strWidth(currentText) * -1)){
    this.offsetX = x;
  }
  this._updateCursor(true);
  this.screen.render();
}

Textarea.prototype._updateCursor = function(get) {
  if (this.screen.focused !== this) {
    return;
  }

  var lpos = get ? this.lpos : this._getCoords();

  if (!lpos) return;

  const currentLine = (this._clines.length - 1) + this.offsetY
  var currentText = this._clines[currentLine]
    , program = this.screen.program
    , line
    , cx
    , cy;

  // Stop a situation where the textarea begins scrolling
  // and the last cline appears to always be empty from the
  // _typeScroll `+ '\n'` thing.
  // Maybe not necessary anymore?
  if (currentText === '' && this.value[this.value.length - 1] !== '\n') {
    //currentText = this._clines[currentLine - 1] || '';
  }

  line = Math.min(
    currentLine - (this.childBase || 0),
    (lpos.yl - lpos.yi) - this.iheight - 1);

  // When calling clearValue() on a full textarea with a border, the first
  // argument in the above Math.min call ends up being -2. Make sure we stay
  // positive.
  line = Math.max(0, line);

  cy = lpos.yi + this.itop + line;
  cx = this.offsetX + lpos.xi + this.ileft + this.strWidth(currentText);

  // XXX Not sure, but this may still sometimes
  // cause problems when leaving editor.
  if (cy === program.y && cx === program.x) {
    return;
  }

  if (cy === program.y) {
    if (cx > program.x) {
      program.cuf(cx - program.x);
    } else if (cx < program.x) {
      program.cub(program.x - cx);
    }
  } else if (cx === program.x) {
    if (cy > program.y) {
      program.cud(cy - program.y);
    } else if (cy < program.y) {
      program.cuu(program.y - cy);
    }
  } else {
    program.cup(cy, cx);
  }
};

Textarea.prototype.input =
Textarea.prototype.setInput =
Textarea.prototype.readInput = function(callback) {
  var self = this
    , focused = this.screen.focused === this;

  if (this._reading) return;
  this._reading = true;

  this._callback = callback;

  if (!focused) {
    this.screen.saveFocus();
    this.focus();
  }

  this.screen.grabKeys = true;

  this._updateCursor();
  this.screen.program.showCursor();
  //this.screen.program.sgr('normal');

  this._done = function fn(err, value) {
    if (!self._reading) return;

    if (fn.done) return;
    fn.done = true;

    self._reading = false;

    delete self._callback;
    delete self._done;

    self.removeListener('keypress', self.__listener);
    delete self.__listener;

    self.removeListener('blur', self.__done);
    delete self.__done;

    self.screen.program.hideCursor();
    self.screen.grabKeys = false;

    if (!focused) {
      self.screen.restoreFocus();
    }

    if (self.options.inputOnFocus) {
      self.screen.rewindFocus();
    }

    // Ugly
    if (err === 'stop') return;

    if (err) {
      self.emit('error', err);
    } else if (value != null) {
      self.emit('submit', value);
    } else {
      self.emit('cancel', value);
    }
    self.emit('action', value);

    if (!callback) return;

    return err
      ? callback(err)
      : callback(null, value);
  };

  // Put this in a nextTick so the current
  // key event doesn't trigger any keys input.
  nextTick(function() {
    self.__listener = self._listener.bind(self);
    self.on('keypress', self.__listener);
  });

  this.__done = this._done.bind(this, null, null);
  this.on('blur', this.__done);
};

Textarea.prototype._listener = function(ch, key) {
  var done = this._done
    , value = this.value;

  if (key.name === 'return') return;
  if (key.name === 'enter') {
    ch = '\n';
  }
  const cursor = this.getCursor();

  // TODO: Handle directional keys.
  if (key.name === 'left' || key.name === 'right'
      || key.name === 'up' || key.name === 'down'
      || key.name === 'end'|| key.name === 'home') {
      
        if (key.name === "left") {
          cursor.x--;
        } else if (key.name === "right") {
          cursor.x++;
        }
        if (key.name === "up") {
          cursor.y--;
        } else if (key.name === "down") {
          cursor.y++;
        }

        if (key.name === "end") {
          cursor.x = 0;
        } else if (key.name === "home") {
          const currentLine = (this._clines.length - 1) + this.offsetY
          const currentLineLength = this.strWidth(this._clines[currentLine] ?? '')
          cursor.x = -currentLineLength;
        }
      
        this.moveCursor(cursor.x, cursor.y);
  }

  if (this.options.keys && key.ctrl && key.name === 'e') {
    return this.readEditor();
  }

  // TODO: Optimize typing by writing directly
  // to the screen and screen buffer here.
  if (key.name === 'escape') {
    done(null, null);
  } else if (key.name === 'backspace') {
    if (this.value.length) {
      if (this.screen.fullUnicode) {
      } else {
        if (cursor.x === 0 && cursor.y === 0){
          this.value = this.value.slice(0, -1);
        } else {          

          const realLines = this._clines.real.slice();
          const fakeLines = this._clines.fake.slice();
          const mapper = this._clines.rtof;

          const currentLine = (realLines.length - 1) + cursor.y;

          const fakeLineIndex = mapper[currentLine];

          let fakeCursorPosition = 0; 
          for (let i = 0; i <= currentLine; i++) { 
            if (mapper[i] === fakeLineIndex) { 
              fakeCursorPosition += this.strWidth(realLines[i]); 
            } 
          } 
          fakeCursorPosition += cursor.x;
          
          let realCursorPosition =  this.strWidth(realLines[currentLine]) + cursor.x;

          if (fakeLines[fakeLineIndex] === ''){
            fakeLines.splice(fakeLineIndex, 1);
          } else if (cursor.x === -this.strWidth(realLines[currentLine])) {
            if (currentLine > 0){
              const lineLengthBefore = this.strWidth(realLines[currentLine - 1] ?? '')

              if (mapper[currentLine] !== mapper[currentLine - 1]){
                const currentLineString = fakeLines.splice(fakeLineIndex, 1);
                fakeLines[fakeLineIndex - 1] += currentLineString;
              } else {

              }

              const predict = this._wrapContent(fakeLines.join('\n'), this.width - this.iwidth)

              cursor.x = -(this.strWidth(predict[currentLine - 1] ?? '') - lineLengthBefore);
              if (predict.real.length === realLines.length){
                cursor.y--;
              }
            }
          } else {
            fakeLines[fakeLineIndex] = fakeLines[fakeLineIndex].slice(0, fakeCursorPosition - 1) + fakeLines[fakeLineIndex].slice(fakeCursorPosition);
            const predict = this._wrapContent(fakeLines.join('\n'), this.width - this.iwidth)
            cursor.x = -(this.strWidth(predict.real[currentLine]) - realCursorPosition + 1);
            if (predict.real.length !== realLines.length){
              cursor.y++;
            }
           
          }
          this.value = fakeLines.join('\n');
          this.setCursor(cursor.x, cursor.y);
        }
      }
    }
  } else if (key.name === 'delete') {
    if (this.value.length) {
      if (this.screen.fullUnicode) {
      } else {
        const currentLine = (this._clines.length - 1) + cursor.y
        if (cursor.x === 0 && cursor.y === 0){

        } else {
          const realLines = this._clines.real.slice();
          const fakeLines = this._clines.fake.slice();
          const mapper = this._clines.rtof;

          const currentLine = (realLines.length - 1) + cursor.y
          
          const fakeLineIndex = mapper[currentLine];
          
          let fakeCursorPosition = 0; 
          for (let i = 0; i <= currentLine; i++) { 
            if (mapper[i] === fakeLineIndex) { 
              fakeCursorPosition += this.strWidth(realLines[i]); 
            } 
          } 
          fakeCursorPosition += cursor.x;
          
          let realCursorPosition =  this.strWidth(realLines[currentLine]) + cursor.x;
          
          if (fakeLines[fakeLineIndex] === ''){
            const nextLineLength = this.strWidth(fakeLines[fakeLineIndex + 1] ?? '')
            fakeLines.splice(fakeLineIndex, 1);
            cursor.y++;
            cursor.x = -nextLineLength;
          } else {
            if (fakeLineIndex < fakeLines.length - 1){
              if (cursor.x === -this.strWidth(realLines[currentLine])) {
                fakeLines[fakeLineIndex] = fakeLines[fakeLineIndex].substring(1);
              } else{
                fakeLines[fakeLineIndex] = fakeLines[fakeLineIndex].slice(0, fakeCursorPosition) + fakeLines[fakeLineIndex].slice(fakeCursorPosition + 1);
              }
              const predict = this._wrapContent(fakeLines.join('\n'), this.width - this.iwidth)
              cursor.x = -(this.strWidth(predict.real[currentLine]) - realCursorPosition);
              if (predict.real.length !== realLines.length){
                cursor.y++;
              }
            }
          }
          this.value = fakeLines.join('\n');
          this.setCursor(cursor.x, cursor.y);          
        }
      }
    }
  } else if (ch) {
    if (!/^[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]$/.test(ch)) {
      if (cursor.x === 0 && cursor.y === 0){
        this.value += ch;
      } else if (cursor.x >= (this.value.length * -1)) {
        const realLines = this._clines.real.slice();
        const fakeLines = this._clines.fake.slice();
        const mapper = this._clines.rtof;

        const currentLine = (realLines.length - 1) + cursor.y
        
        const fakeLineIndex = mapper[currentLine];
        let fakeCursorPosition = 0; 
        for (let i = 0; i <= currentLine; i++) { 
          if (mapper[i] === fakeLineIndex) { 
            fakeCursorPosition += this.strWidth(realLines[i]); 
          } 
        } 
        fakeCursorPosition += cursor.x;
        
        fakeLines[fakeLineIndex] = fakeLines[fakeLineIndex].slice(0, fakeCursorPosition) + ch + fakeLines[fakeLineIndex].slice(fakeCursorPosition);

        const predict = this._wrapContent(fakeLines.join('\n'), this.width - this.iwidth)
        if (ch === '\n'){
          if (predict.real.length === realLines.length){
          cursor.y++;
          }
          cursor.x = -this.strWidth(predict[predict.length - 1 + cursor.y]);
        }
        
        this.value = fakeLines.join('\n');     
        this.setCursor(cursor.x, cursor.y);
      }
    }
  }

  if (this.value !== value) {
    this.screen.render();
  }
};

Textarea.prototype._typeScroll = function() {
  // XXX Workaround
  //var height = this.height - this.iheight;
  //if (this._clines.length - this.childBase > height) {
    const currentLine = (this._clines.length - 1) + this.offsetY;
    this.setScroll(currentLine);
  //}
};

Textarea.prototype.getValue = function() {
  return this.value;
};

Textarea.prototype.setValue = function(value) {
  if (value == null) {
    value = this.value;
  }
  if (this._value !== value) {
    this.value = value;
    this._value = value;
    this.setContent(this.value);
    this._typeScroll();
    this._updateCursor();
  }
};

Textarea.prototype.clearInput =
Textarea.prototype.clearValue = function() {
  return this.setValue('');
};

Textarea.prototype.submit = function() {
  if (!this.__listener) return;
  return this.__listener('\x1b', { name: 'escape' });
};

Textarea.prototype.cancel = function() {
  if (!this.__listener) return;
  return this.__listener('\x1b', { name: 'escape' });
};

Textarea.prototype.render = function() {
  this.setValue();
  return this._render();
};

Textarea.prototype.editor =
Textarea.prototype.setEditor =
Textarea.prototype.readEditor = function(callback) {
  var self = this;

  if (this._reading) {
    var _cb = this._callback
      , cb = callback;

    this._done('stop');

    callback = function(err, value) {
      if (_cb) _cb(err, value);
      if (cb) cb(err, value);
    };
  }

  if (!callback) {
    callback = function() {};
  }

  return this.screen.readEditor({ value: this.value }, function(err, value) {
    if (err) {
      if (err.message === 'Unsuccessful.') {
        self.screen.render();
        return self.readInput(callback);
      }
      self.screen.render();
      self.readInput(callback);
      return callback(err);
    }
    self.setValue(value);
    self.screen.render();
    return self.readInput(callback);
  });
};

/**
 * Expose
 */

module.exports = Textarea;
