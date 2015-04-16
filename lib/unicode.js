/**
 * unicode.js - east asian width and surrogate pairs
 * Copyright (c) 2013-2015, Christopher Jeffrey and contributors (MIT License).
 * https://github.com/chjj/blessed
 * Borrowed from vangie/east-asian-width, komagata/eastasianwidth,
 * and mathiasbynens/String.prototype.codePointAt. Licenses below.
 */

// east-asian-width
//
// Copyright (c) 2015 Vangie Du
// https://github.com/vangie/east-asian-width
//
// Permission is hereby granted, free of charge, to any person
// obtaining a copy of this software and associated documentation
// files (the "Software"), to deal in the Software without
// restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the
// Software is furnished to do so, subject to the following
// conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
// OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
// WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
// OTHER DEALINGS IN THE SOFTWARE.

// eastasianwidth
//
// Copyright (c) 2013, Masaki Komagata
// https://github.com/komagata/eastasianwidth
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

// String.prototype.codePointAt
//
// Copyright Mathias Bynens <https://mathiasbynens.be/>
// https://github.com/mathiasbynens/String.prototype.codePointAt
//
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

exports.charWidth = function(str, i) {
  var point = typeof str !== 'number'
    ? exports.codePointAt(str, i || 0)
    : str;

  // nul
  if (point === 0) return 0;

  // search table of non-spacing characters
  // is ucs combining or C0/C1 control character
  if (exports.isNonSpacing(point)) {
    return 0;
  }

  // check for double-wide
  // if (point >= 0x1100
  //     && (point <= 0x115f // Hangul Jamo init. consonants
  //     || point == 0x2329 || point == 0x232a
  //     || (point >= 0x2e80 && point <= 0xa4cf
  //     && point != 0x303f) // CJK ... Yi
  //     || (point >= 0xac00 && point <= 0xd7a3) // Hangul Syllables
  //     || (point >= 0xf900 && point <= 0xfaff) // CJK Compatibility Ideographs
  //     || (point >= 0xfe10 && point <= 0xfe19) // Vertical forms
  //     || (point >= 0xfe30 && point <= 0xfe6f) // CJK Compatibility Forms
  //     || (point >= 0xff00 && point <= 0xff60) // Fullwidth Forms
  //     || (point >= 0xffe0 && point <= 0xffe6)
  //     || (point >= 0x20000 && point <= 0x2fffd)
  //     || (point >= 0x30000 && point <= 0x3fffd))) {
  //   return 2;
  // }

  // check for double-wide
  if ((0x3000 == point)
      || (0xFF01 <= point && point <= 0xFF60)
      || (0xFFE0 <= point && point <= 0xFFE6)) {
    return 2;
  }

  if ((0x1100 <= point && point <= 0x115F)
      || (0x11A3 <= point && point <= 0x11A7)
      || (0x11FA <= point && point <= 0x11FF)
      || (0x2329 <= point && point <= 0x232A)
      || (0x2E80 <= point && point <= 0x2E99)
      || (0x2E9B <= point && point <= 0x2EF3)
      || (0x2F00 <= point && point <= 0x2FD5)
      || (0x2FF0 <= point && point <= 0x2FFB)
      || (0x3001 <= point && point <= 0x303E)
      || (0x3041 <= point && point <= 0x3096)
      || (0x3099 <= point && point <= 0x30FF)
      || (0x3105 <= point && point <= 0x312D)
      || (0x3131 <= point && point <= 0x318E)
      || (0x3190 <= point && point <= 0x31BA)
      || (0x31C0 <= point && point <= 0x31E3)
      || (0x31F0 <= point && point <= 0x321E)
      || (0x3220 <= point && point <= 0x3247)
      || (0x3250 <= point && point <= 0x32FE)
      || (0x3300 <= point && point <= 0x4DBF)
      || (0x4E00 <= point && point <= 0xA48C)
      || (0xA490 <= point && point <= 0xA4C6)
      || (0xA960 <= point && point <= 0xA97C)
      || (0xAC00 <= point && point <= 0xD7A3)
      || (0xD7B0 <= point && point <= 0xD7C6)
      || (0xD7CB <= point && point <= 0xD7FB)
      || (0xF900 <= point && point <= 0xFAFF)
      || (0xFE10 <= point && point <= 0xFE19)
      || (0xFE30 <= point && point <= 0xFE52)
      || (0xFE54 <= point && point <= 0xFE66)
      || (0xFE68 <= point && point <= 0xFE6B)
      || (0x1B000 <= point && point <= 0x1B001)
      || (0x1F200 <= point && point <= 0x1F202)
      || (0x1F210 <= point && point <= 0x1F23A)
      || (0x1F240 <= point && point <= 0x1F248)
      || (0x1F250 <= point && point <= 0x1F251)
      || (0x20000 <= point && point <= 0x2F73F)
      || (0x2B740 <= point && point <= 0x2FFFD)
      || (0x30000 <= point && point <= 0x3FFFD)) {
    return 2;
  }

  /*
  if ((0x00A1 == point)
      || (0x00A4 == point)
      || (0x00A7 <= point && point <= 0x00A8)
      || (0x00AA == point)
      || (0x00AD <= point && point <= 0x00AE)
      || (0x00B0 <= point && point <= 0x00B4)
      || (0x00B6 <= point && point <= 0x00BA)
      || (0x00BC <= point && point <= 0x00BF)
      || (0x00C6 == point)
      || (0x00D0 == point)
      || (0x00D7 <= point && point <= 0x00D8)
      || (0x00DE <= point && point <= 0x00E1)
      || (0x00E6 == point)
      || (0x00E8 <= point && point <= 0x00EA)
      || (0x00EC <= point && point <= 0x00ED)
      || (0x00F0 == point)
      || (0x00F2 <= point && point <= 0x00F3)
      || (0x00F7 <= point && point <= 0x00FA)
      || (0x00FC == point)
      || (0x00FE == point)
      || (0x0101 == point)
      || (0x0111 == point)
      || (0x0113 == point)
      || (0x011B == point)
      || (0x0126 <= point && point <= 0x0127)
      || (0x012B == point)
      || (0x0131 <= point && point <= 0x0133)
      || (0x0138 == point)
      || (0x013F <= point && point <= 0x0142)
      || (0x0144 == point)
      || (0x0148 <= point && point <= 0x014B)
      || (0x014D == point)
      || (0x0152 <= point && point <= 0x0153)
      || (0x0166 <= point && point <= 0x0167)
      || (0x016B == point)
      || (0x01CE == point)
      || (0x01D0 == point)
      || (0x01D2 == point)
      || (0x01D4 == point)
      || (0x01D6 == point)
      || (0x01D8 == point)
      || (0x01DA == point)
      || (0x01DC == point)
      || (0x0251 == point)
      || (0x0261 == point)
      || (0x02C4 == point)
      || (0x02C7 == point)
      || (0x02C9 <= point && point <= 0x02CB)
      || (0x02CD == point)
      || (0x02D0 == point)
      || (0x02D8 <= point && point <= 0x02DB)
      || (0x02DD == point)
      || (0x02DF == point)
      || (0x0300 <= point && point <= 0x036F)
      || (0x0391 <= point && point <= 0x03A1)
      || (0x03A3 <= point && point <= 0x03A9)
      || (0x03B1 <= point && point <= 0x03C1)
      || (0x03C3 <= point && point <= 0x03C9)
      || (0x0401 == point)
      || (0x0410 <= point && point <= 0x044F)
      || (0x0451 == point)
      || (0x2010 == point)
      || (0x2013 <= point && point <= 0x2016)
      || (0x2018 <= point && point <= 0x2019)
      || (0x201C <= point && point <= 0x201D)
      || (0x2020 <= point && point <= 0x2022)
      || (0x2024 <= point && point <= 0x2027)
      || (0x2030 == point)
      || (0x2032 <= point && point <= 0x2033)
      || (0x2035 == point)
      || (0x203B == point)
      || (0x203E == point)
      || (0x2074 == point)
      || (0x207F == point)
      || (0x2081 <= point && point <= 0x2084)
      || (0x20AC == point)
      || (0x2103 == point)
      || (0x2105 == point)
      || (0x2109 == point)
      || (0x2113 == point)
      || (0x2116 == point)
      || (0x2121 <= point && point <= 0x2122)
      || (0x2126 == point)
      || (0x212B == point)
      || (0x2153 <= point && point <= 0x2154)
      || (0x215B <= point && point <= 0x215E)
      || (0x2160 <= point && point <= 0x216B)
      || (0x2170 <= point && point <= 0x2179)
      || (0x2189 == point)
      || (0x2190 <= point && point <= 0x2199)
      || (0x21B8 <= point && point <= 0x21B9)
      || (0x21D2 == point)
      || (0x21D4 == point)
      || (0x21E7 == point)
      || (0x2200 == point)
      || (0x2202 <= point && point <= 0x2203)
      || (0x2207 <= point && point <= 0x2208)
      || (0x220B == point)
      || (0x220F == point)
      || (0x2211 == point)
      || (0x2215 == point)
      || (0x221A == point)
      || (0x221D <= point && point <= 0x2220)
      || (0x2223 == point)
      || (0x2225 == point)
      || (0x2227 <= point && point <= 0x222C)
      || (0x222E == point)
      || (0x2234 <= point && point <= 0x2237)
      || (0x223C <= point && point <= 0x223D)
      || (0x2248 == point)
      || (0x224C == point)
      || (0x2252 == point)
      || (0x2260 <= point && point <= 0x2261)
      || (0x2264 <= point && point <= 0x2267)
      || (0x226A <= point && point <= 0x226B)
      || (0x226E <= point && point <= 0x226F)
      || (0x2282 <= point && point <= 0x2283)
      || (0x2286 <= point && point <= 0x2287)
      || (0x2295 == point)
      || (0x2299 == point)
      || (0x22A5 == point)
      || (0x22BF == point)
      || (0x2312 == point)
      || (0x2460 <= point && point <= 0x24E9)
      || (0x24EB <= point && point <= 0x254B)
      || (0x2550 <= point && point <= 0x2573)
      || (0x2580 <= point && point <= 0x258F)
      || (0x2592 <= point && point <= 0x2595)
      || (0x25A0 <= point && point <= 0x25A1)
      || (0x25A3 <= point && point <= 0x25A9)
      || (0x25B2 <= point && point <= 0x25B3)
      || (0x25B6 <= point && point <= 0x25B7)
      || (0x25BC <= point && point <= 0x25BD)
      || (0x25C0 <= point && point <= 0x25C1)
      || (0x25C6 <= point && point <= 0x25C8)
      || (0x25CB == point)
      || (0x25CE <= point && point <= 0x25D1)
      || (0x25E2 <= point && point <= 0x25E5)
      || (0x25EF == point)
      || (0x2605 <= point && point <= 0x2606)
      || (0x2609 == point)
      || (0x260E <= point && point <= 0x260F)
      || (0x2614 <= point && point <= 0x2615)
      || (0x261C == point)
      || (0x261E == point)
      || (0x2640 == point)
      || (0x2642 == point)
      || (0x2660 <= point && point <= 0x2661)
      || (0x2663 <= point && point <= 0x2665)
      || (0x2667 <= point && point <= 0x266A)
      || (0x266C <= point && point <= 0x266D)
      || (0x266F == point)
      || (0x269E <= point && point <= 0x269F)
      || (0x26BE <= point && point <= 0x26BF)
      || (0x26C4 <= point && point <= 0x26CD)
      || (0x26CF <= point && point <= 0x26E1)
      || (0x26E3 == point)
      || (0x26E8 <= point && point <= 0x26FF)
      || (0x273D == point)
      || (0x2757 == point)
      || (0x2776 <= point && point <= 0x277F)
      || (0x2B55 <= point && point <= 0x2B59)
      || (0x3248 <= point && point <= 0x324F)
      || (0xE000 <= point && point <= 0xF8FF)
      || (0xFE00 <= point && point <= 0xFE0F)
      || (0xFFFD == point)
      || (0x1F100 <= point && point <= 0x1F10A)
      || (0x1F110 <= point && point <= 0x1F12D)
      || (0x1F130 <= point && point <= 0x1F169)
      || (0x1F170 <= point && point <= 0x1F19A)
      || (0xE0100 <= point && point <= 0xE01EF)
      || (0xF0000 <= point && point <= 0xFFFFD)
      || (0x100000 <= point && point <= 0x10FFFD)) {
    return 2;
  }
  */

  return 1;
};

exports.strWidth = function(str) {
  var width = 0;
  for (var i = 0; i < str.length; i++) {
    width += exports.charWidth(str, i);
    if (exports.isSurrogate(str, i)) i++;
  }
  return width;
};

exports.isSurrogate = function(str, i) {
  var point = typeof str !== 'number'
    ? exports.codePointAt(str, i || 0)
    : str;
  return point > 0x00ffff;
};

exports.combining = [
  [ 0x0300, 0x036F ], [ 0x0483, 0x0486 ], [ 0x0488, 0x0489 ],
  [ 0x0591, 0x05BD ], [ 0x05BF, 0x05BF ], [ 0x05C1, 0x05C2 ],
  [ 0x05C4, 0x05C5 ], [ 0x05C7, 0x05C7 ], [ 0x0600, 0x0603 ],
  [ 0x0610, 0x0615 ], [ 0x064B, 0x065E ], [ 0x0670, 0x0670 ],
  [ 0x06D6, 0x06E4 ], [ 0x06E7, 0x06E8 ], [ 0x06EA, 0x06ED ],
  [ 0x070F, 0x070F ], [ 0x0711, 0x0711 ], [ 0x0730, 0x074A ],
  [ 0x07A6, 0x07B0 ], [ 0x07EB, 0x07F3 ], [ 0x0901, 0x0902 ],
  [ 0x093C, 0x093C ], [ 0x0941, 0x0948 ], [ 0x094D, 0x094D ],
  [ 0x0951, 0x0954 ], [ 0x0962, 0x0963 ], [ 0x0981, 0x0981 ],
  [ 0x09BC, 0x09BC ], [ 0x09C1, 0x09C4 ], [ 0x09CD, 0x09CD ],
  [ 0x09E2, 0x09E3 ], [ 0x0A01, 0x0A02 ], [ 0x0A3C, 0x0A3C ],
  [ 0x0A41, 0x0A42 ], [ 0x0A47, 0x0A48 ], [ 0x0A4B, 0x0A4D ],
  [ 0x0A70, 0x0A71 ], [ 0x0A81, 0x0A82 ], [ 0x0ABC, 0x0ABC ],
  [ 0x0AC1, 0x0AC5 ], [ 0x0AC7, 0x0AC8 ], [ 0x0ACD, 0x0ACD ],
  [ 0x0AE2, 0x0AE3 ], [ 0x0B01, 0x0B01 ], [ 0x0B3C, 0x0B3C ],
  [ 0x0B3F, 0x0B3F ], [ 0x0B41, 0x0B43 ], [ 0x0B4D, 0x0B4D ],
  [ 0x0B56, 0x0B56 ], [ 0x0B82, 0x0B82 ], [ 0x0BC0, 0x0BC0 ],
  [ 0x0BCD, 0x0BCD ], [ 0x0C3E, 0x0C40 ], [ 0x0C46, 0x0C48 ],
  [ 0x0C4A, 0x0C4D ], [ 0x0C55, 0x0C56 ], [ 0x0CBC, 0x0CBC ],
  [ 0x0CBF, 0x0CBF ], [ 0x0CC6, 0x0CC6 ], [ 0x0CCC, 0x0CCD ],
  [ 0x0CE2, 0x0CE3 ], [ 0x0D41, 0x0D43 ], [ 0x0D4D, 0x0D4D ],
  [ 0x0DCA, 0x0DCA ], [ 0x0DD2, 0x0DD4 ], [ 0x0DD6, 0x0DD6 ],
  [ 0x0E31, 0x0E31 ], [ 0x0E34, 0x0E3A ], [ 0x0E47, 0x0E4E ],
  [ 0x0EB1, 0x0EB1 ], [ 0x0EB4, 0x0EB9 ], [ 0x0EBB, 0x0EBC ],
  [ 0x0EC8, 0x0ECD ], [ 0x0F18, 0x0F19 ], [ 0x0F35, 0x0F35 ],
  [ 0x0F37, 0x0F37 ], [ 0x0F39, 0x0F39 ], [ 0x0F71, 0x0F7E ],
  [ 0x0F80, 0x0F84 ], [ 0x0F86, 0x0F87 ], [ 0x0F90, 0x0F97 ],
  [ 0x0F99, 0x0FBC ], [ 0x0FC6, 0x0FC6 ], [ 0x102D, 0x1030 ],
  [ 0x1032, 0x1032 ], [ 0x1036, 0x1037 ], [ 0x1039, 0x1039 ],
  [ 0x1058, 0x1059 ], [ 0x1160, 0x11FF ], [ 0x135F, 0x135F ],
  [ 0x1712, 0x1714 ], [ 0x1732, 0x1734 ], [ 0x1752, 0x1753 ],
  [ 0x1772, 0x1773 ], [ 0x17B4, 0x17B5 ], [ 0x17B7, 0x17BD ],
  [ 0x17C6, 0x17C6 ], [ 0x17C9, 0x17D3 ], [ 0x17DD, 0x17DD ],
  [ 0x180B, 0x180D ], [ 0x18A9, 0x18A9 ], [ 0x1920, 0x1922 ],
  [ 0x1927, 0x1928 ], [ 0x1932, 0x1932 ], [ 0x1939, 0x193B ],
  [ 0x1A17, 0x1A18 ], [ 0x1B00, 0x1B03 ], [ 0x1B34, 0x1B34 ],
  [ 0x1B36, 0x1B3A ], [ 0x1B3C, 0x1B3C ], [ 0x1B42, 0x1B42 ],
  [ 0x1B6B, 0x1B73 ], [ 0x1DC0, 0x1DCA ], [ 0x1DFE, 0x1DFF ],
  [ 0x200B, 0x200F ], [ 0x202A, 0x202E ], [ 0x2060, 0x2063 ],
  [ 0x206A, 0x206F ], [ 0x20D0, 0x20EF ], [ 0x302A, 0x302F ],
  [ 0x3099, 0x309A ], [ 0xA806, 0xA806 ], [ 0xA80B, 0xA80B ],
  [ 0xA825, 0xA826 ], [ 0xFB1E, 0xFB1E ], [ 0xFE00, 0xFE0F ],
  [ 0xFE20, 0xFE23 ], [ 0xFEFF, 0xFEFF ], [ 0xFFF9, 0xFFFB ],
  [ 0x10A01, 0x10A03 ], [ 0x10A05, 0x10A06 ], [ 0x10A0C, 0x10A0F ],
  [ 0x10A38, 0x10A3A ], [ 0x10A3F, 0x10A3F ], [ 0x1D167, 0x1D169 ],
  [ 0x1D173, 0x1D182 ], [ 0x1D185, 0x1D18B ], [ 0x1D1AA, 0x1D1AD ],
  [ 0x1D242, 0x1D244 ], [ 0xE0001, 0xE0001 ], [ 0xE0020, 0xE007F ],
  [ 0xE0100, 0xE01EF ]
].reduce(function(out, row) {
  for (var i = row[0]; i <= row[1]; i++) {
    out[i] = true;
  }
  return out;
}, {});

exports.isNonSpacing = function(str, i) {
  var point = typeof str !== 'number'
    ? exports.codePointAt(str, i || 0)
    : str;
  return exports.combining[point] === true;
};

exports.codePointAt = function(str, position) {
  if (str == null) {
    throw TypeError();
  }
  var string = String(str);
  var size = string.length;
  // `ToInteger`
  var index = position ? Number(position) : 0;
  if (index != index) { // better `isNaN`
    index = 0;
  }
  // Account for out-of-bounds indices:
  if (index < 0 || index >= size) {
    return undefined;
  }
  // Get the first code unit
  var first = string.charCodeAt(index);
  var second;
  if ( // check if it’s the start of a surrogate pair
    first >= 0xD800 && first <= 0xDBFF && // high surrogate
    size > index + 1 // there is a next code unit
  ) {
    second = string.charCodeAt(index + 1);
    if (second >= 0xDC00 && second <= 0xDFFF) { // low surrogate
      // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
      return (first - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
    }
  }
  return first;
};

// Double width characters that are _not_ surrogate pairs.
// NOTE: 0x20000 - 0x2fffd and 0x30000 - 0x3fffd are not necessary for this
// regex anyway. This regex is used to put a blank char after wide chars to
// be eaten, however, if this is a surrogate pair, parseContent already adds
// the extra one char because its length equals 2 instead of 1.
exports.wideChars = new RegExp('(['
  + '\\u1100-\\u115f' // Hangul Jamo init. consonants
  + '\\u2329\\u232a'
  + '\\u2e80-\\u303e\\u3040-\\ua4cf' // CJK ... Yi
  + '\\uac00-\\ud7a3' // Hangul Syllables
  + '\\uf900-\\ufaff' // CJK Compatibility Ideographs
  + '\\ufe10-\\ufe19' // Vertical forms
  + '\\ufe30-\\ufe6f' // CJK Compatibility Forms
  + '\\uff00-\\uff60' // Fullwidth Forms
  + '\\uffe0-\\uffe6'
  + '])', 'g');

// Regex to detect a surrogate pair.
exports.surrogate = /[\ud800-\udbff][\udc00-\udfff]/g;
