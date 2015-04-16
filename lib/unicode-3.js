/**
 * unicode.js - east asian width and surrogate pairs
 * Copyright (c) 2013-2015, Christopher Jeffrey and contributors (MIT License).
 * https://github.com/chjj/blessed
 * Utilizes from vangie/east-asian-width.
 */

var east_asian_width = require('../vendor/east-asian-width');

var codePointAt = String.prototype.codePointAt;
delete String.prototype.codePointAt;

exports.charWidth = function(str, i) {
  var point = typeof str === 'number' ? str : exports.codePointAt(str, i || 0);
  return east_asian_width.char_width(point);
};

/*
exports.strWidth = function(str) {
  return east_asian_width.str_width(str);
};

exports.isSurrogate = function(str, i) {
  var point = typeof str === 'number' ? str : exports.codePointAt(str, i || 0);
  return point > 0x00ffff;
};
*/

exports.codePointAt = function(str, position) {
  return codePointAt.call(str, position);
};

// NOTE: 0x20000 - 0x2fffd and 0x30000 - 0x3fffd are not necessary for this
// regex anyway. This regex is used to put a blank char after wide chars to
// be eaten, however, if this is a surrogate pair, parseContent already adds
// the extra one char because its length equals 2 instead of 1.
exports.wideChars = new RegExp('('
  // 0x20000 - 0x2fffd:
  // + '[\\ud840-\\ud87f][\\udc00-\\udffd]'
  // + '|'
  // 0x30000 - 0x3fffd:
  // + '[\\ud880-\\ud8bf][\\udc00-\\udffd]'
  // + '|'
  + '['
  + '\\u1100-\\u115f' // Hangul Jamo init. consonants
  + '\\u2329\\u232a'
  + '\\u2e80-\\u303e\\u3040-\\ua4cf' // CJK ... Yi
  + '\\uac00-\\ud7a3' // Hangul Syllables
  + '\\uf900-\\ufaff' // CJK Compatibility Ideographs
  + '\\ufe10-\\ufe19' // Vertical forms
  + '\\ufe30-\\ufe6f' // CJK Compatibility Forms
  + '\\uff00-\\uff60' // Fullwidth Forms
  + '\\uffe0-\\uffe6'
  // + '\\u20000-\\u2fffd'
  // + '\\u30000-\\u3fffd'
  + ']'
  + ')', 'g');

exports.surrogate = /[\ud800-\udbff][\udc00-\udfff]/g;

// exports.surrogateWide = /[\ud840-\ud87f][\udc00-\udffd]|[\ud880-\ud8bf][\udc00-\udffd]/g;
