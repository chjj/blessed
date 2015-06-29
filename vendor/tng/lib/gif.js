/**
 * gif.js - gif reader for tng
 * Copyright (c) 2015, Christopher Jeffrey (MIT License).
 * https://github.com/chjj/tng
 */

var fs = require('fs')
  , cp = require('child_process')
  , path = require('path')
  , assert = require('assert');

/**
 * GIF
 */

function GIF(file, options) {
  var info = {}
    , p = 0
    , buf
    , i
    , total
    , sig
    , desc
    , img
    , ext
    , label
    , size;

  if (!file) throw new Error('no file');

  options = options || {};

  if (Buffer.isBuffer(file)) {
    buf = file;
    file = null;
  } else {
    file = path.resolve(process.cwd(), file);
    buf = fs.readFileSync(file);
  }

  sig = buf.slice(0, 6).toString('ascii');
  if (sig !== 'GIF87a' && sig !== 'GIF89a') {
    throw new Error('bad header: ' + sig);
  }

  info.screenWidth = buf.readUInt16LE(6);
  info.screenHeight = buf.readUInt16LE(8);

  info.flags = buf.readUInt8(10);
  info.gct = !!(info.flags & 0x80);
  info.gctsize = (info.flags & 0x07) + 1;

  info.bgIndex = buf.readUInt8(11);
  info.aspect = buf.readUInt8(12);
  p += 13;

  if (info.gct) {
    info.colors = [];
    total = 1 << info.gctsize;
    for (i = 0; i < total; i++, p += 3) {
      info.colors.push([buf[p], buf[p + 1], buf[p + 2], 255]);
    }
  }

  info.images = [];
  info.extensions = [];

  try {
    while (p < buf.length) {
      desc = buf.readUInt8(p);
      p += 1;
      if (desc === 0x2c) {
        img = {};

        img.left = buf.readUInt16LE(p);
        p += 2;
        img.top = buf.readUInt16LE(p);
        p += 2;

        img.width = buf.readUInt16LE(p);
        p += 2;
        img.height = buf.readUInt16LE(p);
        p += 2;

        img.flags = buf.readUInt8(p);
        p += 1;

        img.lct = !!(img.flags & 0x80);
        img.ilace = !!(img.flags & 0x40);
        img.lctsize = (img.flags & 0x07) + 1;

        if (img.lct) {
          img.lcolors = [];
          total = 1 << img.lctsize;
          for (i = 0; i < total; i++, p += 3) {
            img.lcolors.push([buf[p], buf[p + 1], buf[p + 2], 255]);
          }
        }

        img.codeSize = buf.readUInt8(p);
        p += 1;

        img.size = buf.readUInt8(p);
        p += 1;

        img.lzw = [buf.slice(p, p + img.size)];
        p += img.size;

        while (buf[p] !== 0x00) {
          // Some gifs screw up their size.
          // XXX Same for all subblocks?
          if (buf[p] === 0x3b) {
            p--;
            break;
          }
          size = buf.readUInt8(p);
          p += 1;
          img.lzw.push(buf.slice(p, p + size));
          p += size;
        }

        assert.equal(buf.readUInt8(p), 0x00);
        p += 1;

        info.images.push(img);
      } else if (desc === 0x21) {
        // Extensions:
        // http://www.w3.org/Graphics/GIF/spec-gif89a.txt
        ext = {};
        label = buf.readUInt8(p);
        p += 1;
        ext.label = label;
        if (label === 0xf9) {
          size = buf.readUInt8(p);
          assert.equal(size, 0x04);
          p += 1;
          ext.fields = buf.readUInt8(p);
          ext.disposeMethod = (ext.fields >> 2) & 0x07;
          ext.useTransparent = !!(ext.fields & 0x01);
          p += 1;
          ext.delay = buf.readUInt16LE(p);
          p += 2;
          ext.transparentColor = buf.readUInt8(p);
          p += 1;
          while (buf[p] !== 0x00) {
            size = buf.readUInt8(p);
            p += 1;
            p += size;
          }
          assert.equal(buf.readUInt8(p), 0x00);
          p += 1;
          info.delay = ext.delay;
          info.transparentColor = ext.transparentColor;
          info.disposeMethod = ext.disposeMethod;
          info.useTransparent = ext.useTransparent;
        } else if (label === 0xff) {
          size = buf.readUInt8(p);
          p += 1;
          ext.id = buf.slice(p, p + 8).toString('ascii');
          p += 8;
          ext.auth = buf.slice(p, p + 3).toString('ascii');
          p += 3;
          ext.data = [];
          while (buf[p] !== 0x00) {
            size = buf.readUInt8(p);
            p += 1;
            ext.data.push(buf.slice(p, p + size));
            p += size;
          }
          // http://graphcomp.com/info/specs/ani_gif.html
          if (ext.id === 'NETSCAPE' && ext.auth === '2.0') {
            assert.equal(ext.data[0].readUInt8(0), 0x01);
            ext.numPlays = ext.data[0].readUInt16LE(1);
            info.numPlays = ext.numPlays;
          }
          assert.equal(buf.readUInt8(p), 0x00);
          p += 1;
        } else {
          ext.data = [];
          while (buf[p] !== 0x00) {
            size = buf.readUInt8(p);
            p += 1;
            ext.data.push(buf.slice(p, p + size));
            p += size;
          }
          assert.equal(buf.readUInt8(p), 0x00);
          p += 1;
        }
        info.extensions.push(ext);
      } else if (desc === 0x3b) {
        break;
      } else if (p === buf.length - 1) {
        // } else if (desc === 0x00 && p === buf.length - 1) {
        break;
      } else {
        throw new Error('unknown block');
      }
    }
  } catch (e) {
    if (options.debug) {
      throw e;
    }
  }

  info.images = info.images.map(function(img) {
    img.lzw = new Buffer(img.lzw.reduce(function(out, data) {
      return out.concat(Array.prototype.slice.call(data));
    }, []));

    try {
      img.data = decompress(img.lzw, img.codeSize);
    } catch (e) {
      if (options.debug) throw e;
      return;
    }

    var interlacing = [
      [ 0, 8 ],
      [ 4, 8 ],
      [ 2, 4 ],
      [ 1, 2 ],
      [ 0, 0 ]
    ];

    var table = img.lcolors || info.colors
      , row = 0
      , col = 0
      , ilp = 0
      , p = 0
      , b
      , idx
      , i
      , y
      , x
      , line
      , pixel;

    img.samples = [];
    // Rewritten version of:
    // https://github.com/lbv/ka-cs-programs/blob/master/lib/gif-reader.js
    for (;;) {
      b = img.data[p++];
      if (b == null) break;
      idx = (row * img.width + col) * 4;
      if (!table[b]) {
        if (options.debug) throw new Error('bad samples');
        table[b] = [0, 0, 0, 0];
      }
      img.samples[idx] = table[b][0];
      img.samples[idx + 1] = table[b][1];
      img.samples[idx + 2] = table[b][2];
      img.samples[idx + 3] = table[b][3];
      if (info.useTransparent && b === info.transparentColor) {
        img.samples[idx + 3] = 0;
      }
      if (++col >= img.width) {
        col = 0;
        if (img.ilace) {
          row += interlacing[ilp][1];
          if (row >= img.height) {
            row = interlacing[++ilp][0];
          }
        } else {
          row++;
        }
      }
    }

    img.pixels = [];
    for (i = 0; i < img.samples.length; i += 4) {
      img.pixels.push(img.samples.slice(i, i + 4));
    }

    img.bmp = [];
    for (y = 0, p = 0; y < img.height; y++) {
      line = [];
      for (x = 0; x < img.width; x++) {
        pixel = img.pixels[p++];
        if (!pixel) {
          if (options.debug) throw new Error('no pixel');
          line.push({ r: 0, g: 0, b: 0, a: 0 });
          continue;
        }
        line.push({ r: pixel[0], g: pixel[1], b: pixel[2], a: pixel[3] });
      }
      img.bmp.push(line);
    }

    return img;
  }, this).filter(Boolean);

  if (!info.images.length) {
    throw new Error('no image data or bad decompress');
  }

  return info;
}

// Rewritten version of:
// https://github.com/lbv/ka-cs-programs/blob/master/lib/gif-reader.js
function decompress(input, codeSize) {
  var bitDepth = codeSize + 1
    , CC = 1 << codeSize
    , EOI = CC + 1
    , stack = []
    , table = []
    , ntable = 0
    , oldCode = null
    , buffer = 0
    , nbuffer = 0
    , p = 0
    , buf = []
    , bits
    , read
    , ans
    , n
    , code
    , i
    , K
    , b
    , maxElem;

  for (;;) {
    if (stack.length === 0) {
      bits = bitDepth;
      read = 0;
      ans = 0;
      while (read < bits) {
        if (nbuffer === 0) {
          if (p >= input.length) return buf;
          buffer = input[p++];
          nbuffer = 8;
        }
        n = Math.min(bits - read, nbuffer);
        ans |= (buffer & ((1 << n) - 1)) << read;
        read += n;
        nbuffer -= n;
        buffer >>= n;
      }
      code = ans;

      if (code === EOI) {
        break;
      }

      if (code === CC) {
        table = [];
        for (i = 0; i < CC; ++i) {
          table[i] = [i, -1, i];
        }
        bitDepth = codeSize + 1;
        maxElem = 1 << bitDepth;
        ntable = CC + 2;
        oldCode = null;
        continue;
      }

      if (oldCode === null) {
        oldCode = code;
        buf.push(table[code][0]);
        continue;
      }

      if (code < ntable) {
        for (i = code; i >= 0; i = table[i][1]) {
          stack.push(table[i][0]);
        }
        table[ntable++] = [
          table[code][2],
          oldCode,
          table[oldCode][2]
        ];
      } else {
        K = table[oldCode][2];
        table[ntable++] = [K, oldCode, K];
        for (i = code; i >= 0; i = table[i][1]) {
          stack.push(table[i][0]);
        }
      }

      oldCode = code;
      if (ntable === maxElem) {
        maxElem = 1 << (++bitDepth);
        if (bitDepth > 12) bitDepth = 12;
      }
    }
    b = stack.pop();
    if (b == null) break;
    buf.push(b);
  }

  return buf;
}

/**
 * Expose
 */

module.exports = GIF;
