/**
 * tng.js - png reader
 * Copyright (c) 2015, Christopher Jeffrey (MIT License).
 * https://github.com/chjj/tng
 */

var fs = require('fs')
  , util = require('util')
  , path = require('path')
  , zlib = require('zlib')
  , assert = require('assert')
  , cp = require('child_process')
  , exec = cp.execFileSync;

/**
 * PNG
 */

function PNG(file, options) {
  var buf
    , chunks
    , idat
    , pixels;

  if (!(this instanceof PNG)) {
    return new PNG(file, options);
  }

  if (!file) throw new Error('no file');

  this.options = options || {};
  this.colors = options.colors || require('blessed/lib/colors');
  this.optimization = this.options.optimization || 'mem';
  this.speed = this.options.speed || 1;

  if (Buffer.isBuffer(file)) {
    this.file = this.options.filename || null;
    buf = file;
  } else {
    this.options.filename = file;
    this.file = path.resolve(process.cwd(), file);
    buf = fs.readFileSync(this.file);
  }

  this.format = buf.readUInt32BE(0) === 0x89504e47 ? 'png'
    : buf.slice(0, 3).toString('ascii') === 'GIF' ? 'gif'
    : buf.readUInt16BE(0) === 0xffd8 ? 'jpg'
    : path.extname(this.file).slice(1).toLowerCase() || 'png';

  if (this.format !== 'png') {
    try {
      return this.toPNG(buf);
    } catch (e) {
      throw e;
    }
  }

  chunks = this.parseRaw(buf);
  idat = this.parseChunks(chunks);
  pixels = this.parseLines(idat);

  this.bmp = this.createBitmap(pixels);
  this.cellmap = this.createCellmap(this.bmp);
  this.frames = this.compileFrames(this.frames);
}

PNG.prototype.parseRaw = function(buf) {
  var chunks = []
    , index = 0
    , i = 0
    , buf
    , len
    , type
    , name
    , data
    , crc
    , check
    , critical
    , public_
    , conforming
    , copysafe
    , pos;

  this._debug(this.file);

  if (buf.readUInt32BE(0) !== 0x89504e47
      || buf.readUInt32BE(4) !== 0x0d0a1a0a) {
    throw new Error('bad header');
  }

  i += 8;

  while (i < buf.length) {
    try {
      len = buf.readUInt32BE(i);
      i += 4;
      pos = i;
      type = buf.slice(i, i + 4);
      name = type.toString('ascii');
      i += 4;
      data = buf.slice(i, i + len);
      i += len;
      check = this.crc32(buf.slice(pos, i));
      crc = buf.readInt32BE(i);
      i += 4;
      critical = !!(~type[0] & 32);
      public_ = !!(~type[1] & 32);
      conforming = !!(~type[2] & 32);
      copysafe = !!(~type[3] & 32);
      if (crc !== check) {
        throw new Error(name + ': bad crc');
      }
    } catch (e) {
      if (this.options.debug) throw e;
      break;
    }
    chunks.push({
      index: index++,
      id: name.toLowerCase(),
      len: len,
      pos: pos,
      end: i,
      type: type,
      name: name,
      data: data,
      crc: crc,
      check: check,
      raw: buf.slice(pos, i),
      flags: {
        critical: critical,
        public_: public_,
        conforming: conforming,
        copysafe: copysafe
      }
    });
  }

  return chunks;
};

PNG.prototype.parseChunks = function(chunks) {
  var i
    , chunk
    , name
    , data
    , p
    , idat
    , info;

  for (i = 0; i < chunks.length; i++) {
    chunk = chunks[i];
    name = chunk.id;
    data = chunk.data;
    info = {};
    switch (name) {
      case 'ihdr': {
        this.width = info.width = data.readUInt32BE(0);
        this.height = info.height = data.readUInt32BE(4);
        this.bitDepth = info.bitDepth = data.readUInt8(8);
        this.colorType = info.colorType = data.readUInt8(9);
        this.compression = info.compression = data.readUInt8(10);
        this.filter = info.filter = data.readUInt8(11);
        this.interlace = info.interlace = data.readUInt8(12);
        switch (this.bitDepth) {
          case 1: case 2: case 4: case 8: case 16: case 24: case 32: break;
          default: throw new Error('bad bit depth: ' + this.bitDepth);
        }
        switch (this.colorType) {
          case 0: case 2: case 3: case 4: case 6: break;
          default: throw new Error('bad color: ' + this.colorType);
        }
        switch (this.compression) {
          case 0: break;
          default: throw new Error('bad compression: ' + this.compression);
        }
        switch (this.filter) {
          case 0: case 1: case 2: case 3: case 4: break;
          default: throw new Error('bad filter: ' + this.filter);
        }
        switch (this.interlace) {
          case 0: case 1: break;
          default: throw new Error('bad interlace: ' + this.interlace);
        }
        break;
      }
      case 'plte': {
        this.palette = info.palette = [];
        for (p = 0; p < data.length; p += 3) {
          this.palette.push({
            r: data[p + 0],
            g: data[p + 1],
            b: data[p + 2],
            a: 255
          });
        }
        break;
      }
      case 'idat': {
        this.size = this.size || 0;
        this.size += data.length;
        this.idat = this.idat || [];
        this.idat.push(data);
        info.size = data.length;
        break;
      }
      case 'iend': {
        this.end = true;
        break;
      }
      case 'trns': {
        this.alpha = info.alpha = Array.prototype.slice.call(data);
        if (this.palette) {
          for (p = 0; p < data.length; p++) {
            if (!this.palette[p]) break;
            this.palette[p].a = data[p];
          }
        }
        break;
      }
      // https://wiki.mozilla.org/APNG_Specification
      case 'actl': {
        this.actl = info = {};
        this.frames = [];
        this.actl.numFrames = data.readUInt32BE(0);
        this.actl.numPlays = data.readUInt32BE(4);
        break;
      }
      case 'fctl': {
        // IDAT is the first frame depending on the order:
        // IDAT is a frame: acTL->fcTL->IDAT->[fcTL]->fdAT
        // IDAT is not a frame: acTL->IDAT->[fcTL]->fdAT
        if (!this.idat) {
          this.idat = [];
          this.frames.push({
            idat: true,
            fctl: info,
            fdat: this.idat
          });
        } else {
          this.frames.push({
            fctl: info,
            fdat: []
          });
        }
        info.sequenceNumber = data.readUInt32BE(0);
        info.width = data.readUInt32BE(4);
        info.height = data.readUInt32BE(8);
        info.xOffset = data.readUInt32BE(12);
        info.yOffset = data.readUInt32BE(16);
        info.delayNum = data.readUInt16BE(20);
        info.delayDen = data.readUInt16BE(22);
        info.disposeOp = data.readUInt8(24);
        info.blendOp = data.readUInt8(25);
        break;
      }
      case 'fdat': {
        info.sequenceNumber = data.readUInt32BE(0);
        info.data = data.slice(4);
        this.frames[this.frames.length - 1].fdat.push(info.data);
        break;
      }
    }
    chunk.info = info;
  }

  this._debug(chunks);

  if (this.frames) {
    this.frames = this.frames.map(function(frame, i) {
      frame.fdat = this.decompress(frame.fdat);
      if (!frame.fdat.length) throw new Error('no data');
      return frame;
    }, this);
  }

  idat = this.decompress(this.idat);
  if (!idat.length) throw new Error('no data');

  return idat;
};

PNG.prototype.parseLines = function(data) {
  var pixels = []
    , x
    , p
    , prior
    , line
    , filter
    , samples
    , pendingSamples
    , ch
    , shiftStart
    , i
    , toShift
    , sample;

  this.sampleDepth =
    this.colorType === 0 ? 1
    : this.colorType === 2 ? 3
    : this.colorType === 3 ? 1
    : this.colorType === 4 ? 2
    : this.colorType === 6 ? 4
    : 1;
  this.bitsPerPixel = this.bitDepth * this.sampleDepth;
  this.bytesPerPixel = Math.ceil(this.bitsPerPixel / 8);
  this.wastedBits = ((this.width * this.bitsPerPixel) / 8) - ((this.width * this.bitsPerPixel / 8) | 0);
  this.byteWidth = Math.ceil(this.width * (this.bitsPerPixel / 8));

  this.shiftStart = ((this.bitDepth + (8 / this.bitDepth - this.bitDepth)) - 1) | 0;
  this.shiftMult = this.bitDepth >= 8 ? 0 : this.bitDepth;
  this.mask = this.bitDepth === 32 ? 0xffffffff : (1 << this.bitDepth) - 1;

  if (this.interlace === 1) {
    samples = this.sampleInterlacedLines(data);
    for (i = 0; i < samples.length; i += this.sampleDepth) {
      pixels.push(samples.slice(i, i + this.sampleDepth));
    }
    return pixels;
  }

  for (p = 0; p < data.length; p += this.byteWidth) {
    prior = line || [];
    filter = data[p++];
    line = data.slice(p, p + this.byteWidth);
    line = this.unfilterLine(filter, line, prior);
    samples = this.sampleLine(line);
    for (i = 0; i < samples.length; i += this.sampleDepth) {
      pixels.push(samples.slice(i, i + this.sampleDepth));
    }
  }

  return pixels;
};

PNG.prototype.unfilterLine = function(filter, line, prior) {
  for (var x = 0; x < line.length; x++) {
    if (filter === 0) {
      break;
    } else if (filter === 1) {
      line[x] = this.filters.sub(x, line, prior, this.bytesPerPixel);
    } else if (filter === 2) {
      line[x] = this.filters.up(x, line, prior, this.bytesPerPixel);
    } else if (filter === 3) {
      line[x] = this.filters.average(x, line, prior, this.bytesPerPixel);
    } else if (filter === 4) {
      line[x] = this.filters.paeth(x, line, prior, this.bytesPerPixel);
    }
  }
  return line;
};

PNG.prototype.sampleLine = function(line, width) {
  var samples = []
    , x = 0
    , pendingSamples
    , ch
    , i
    , sample
    , shiftStart
    , toShift;

  while (x < line.length) {
    pendingSamples = this.sampleDepth;
    while (pendingSamples--) {
      ch = line[x];
      if (this.bitDepth === 16) {
        ch = (ch << 8) | line[++x];
      } else if (this.bitDepth === 24) {
        ch = (ch << 16) | (line[++x] << 8) | line[++x];
      } else if (this.bitDepth === 32) {
        ch = (ch << 24) | (line[++x] << 16) | (line[++x] << 8) | line[++x];
      } else if (this.bitDepth > 32) {
        throw new Error('bitDepth ' + this.bitDepth + ' unsupported.');
      }
      shiftStart = this.shiftStart;
      toShift = shiftStart - (x === line.length - 1 ? this.wastedBits : 0);
      for (i = 0; i <= toShift; i++) {
        sample = (ch >> (this.shiftMult * shiftStart)) & this.mask;
        if (this.colorType !== 3) {
          if (this.bitDepth < 8) { // <= 8 would work too, doesn't matter
            // sample = sample * (0xff / this.mask) | 0; // would work too
            sample *= 0xff / this.mask;
            sample |= 0;
          } else if (this.bitDepth > 8) {
            sample = (sample / this.mask) * 255 | 0;
          }
        }
        samples.push(sample);
        shiftStart--;
      }
      x++;
    }
  }

  // Needed for deinterlacing?
  if (width != null) {
    samples = samples.slice(0, width * this.sampleDepth);
  }

  return samples;
};

// http://www.w3.org/TR/PNG-Filters.html
PNG.prototype.filters = {
  sub: function Sub(x, line, prior, bpp) {
    if (x < bpp) return line[x];
    return (line[x] + line[x - bpp]) % 256;
  },
  up: function Up(x, line, prior, bpp) {
    return (line[x] + (prior[x] || 0)) % 256;
  },
  average: function Average(x, line, prior, bpp) {
    if (x < bpp) return Math.floor((prior[x] || 0) / 2);
    // if (x < bpp) return (prior[x] || 0) >> 1;
    return (line[x]
      + Math.floor((line[x - bpp] + prior[x]) / 2)
      // + ((line[x - bpp] + prior[x]) >> 1)
    ) % 256;
  },
  paeth: function Paeth(x, line, prior, bpp) {
    if (x < bpp) return prior[x] || 0;
    return (line[x] + this._predictor(
      line[x - bpp], prior[x] || 0, prior[x - bpp] || 0
    )) % 256;
  },
  _predictor: function PaethPredictor(a, b, c) {
    // a = left, b = above, c = upper left
    var p = a + b - c
      , pa = Math.abs(p - a)
      , pb = Math.abs(p - b)
      , pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  }
};

/**
 * Adam7 deinterlacing ported to javascript from PyPNG:
 * pypng - Pure Python library for PNG image encoding/decoding
 * Copyright (c) 2009-2015, David Jones (MIT License).
 * https://github.com/drj11/pypng
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation files
 * (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
 * BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

PNG.prototype.sampleInterlacedLines = function(raw) {
  var psize
    , vpr
    , samples
    , source_offset
    , i
    , pass
    , xstart
    , ystart
    , xstep
    , ystep
    , recon
    , ppr
    , row_size
    , y
    , filter_type
    , scanline
    , flat
    , offset
    , k
    , end_offset
    , skip
    , j
    , k
    , f;

  var adam7 = [
    [0, 0, 8, 8],
    [4, 0, 8, 8],
    [0, 4, 4, 8],
    [2, 0, 4, 4],
    [0, 2, 2, 4],
    [1, 0, 2, 2],
    [0, 1, 1, 2]
  ];

  // Fractional bytes per pixel
  psize = (this.bitDepth / 8) * this.sampleDepth;

  // Values per row (of the target image)
  vpr = this.width * this.sampleDepth;

  // Make a result array, and make it big enough. Interleaving
  // writes to the output array randomly (well, not quite), so the
  // entire output array must be in memory.
  samples = new Buffer(vpr * this.height);
  samples.fill(0);

  source_offset = 0;

  for (i = 0; i < adam7.length; i++) {
    pass = adam7[i];
    xstart = pass[0];
    ystart = pass[1];
    xstep = pass[2];
    ystep = pass[3];
    if (xstart >= this.width) continue;
    // The previous (reconstructed) scanline. Empty array at the
    // beginning of a pass to indicate that there is no previous
    // line.
    recon = [];
    // Pixels per row (reduced pass image)
    ppr = Math.ceil((this.width - xstart) / xstep);
    // Row size in bytes for this pass.
    row_size = Math.ceil(psize * ppr);
    for (y = ystart; y < this.height; y += ystep) {
      filter_type = raw[source_offset];
      source_offset += 1;
      scanline = raw.slice(source_offset, source_offset + row_size);
      source_offset += row_size;
      recon = this.unfilterLine(filter_type, scanline, recon);
      // Convert so that there is one element per pixel value
      flat = this.sampleLine(recon, ppr);
      if (xstep === 1) {
        assert.equal(xstart, 0);
        offset = y * vpr;
        for (k = offset, f = 0; k < offset + vpr; k++, f++) {
          samples[k] = flat[f];
        }
      } else {
        offset = y * vpr + xstart * this.sampleDepth;
        end_offset = (y + 1) * vpr;
        skip = this.sampleDepth * xstep;
        for (j = 0; j < this.sampleDepth; j++) {
          for (k = offset + j, f = j; k < end_offset; k += skip, f += this.sampleDepth) {
            samples[k] = flat[f];
          }
        }
      }
    }
  }

  return samples;
};

PNG.prototype.createBitmap = function(pixels) {
  var bmp = []
    , i;

  if (this.colorType === 0) {
    pixels = pixels.map(function(sample) {
      return { r: sample[0], g: sample[0], b: sample[0], a: 255 };
    });
  } else if (this.colorType === 2) {
    pixels = pixels.map(function(sample) {
      return { r: sample[0], g: sample[1], b: sample[2], a: 255 };
    });
  } else if (this.colorType === 3) {
    pixels = pixels.map(function(sample) {
      if (!this.palette[sample[0]]) throw new Error('bad palette index');
      return this.palette[sample[0]];
    }, this);
  } else if (this.colorType === 4) {
    pixels = pixels.map(function(sample) {
      return { r: sample[0], g: sample[0], b: sample[0], a: sample[1] };
    });
  } else if (this.colorType === 6) {
    pixels = pixels.map(function(sample) {
      return { r: sample[0], g: sample[1], b: sample[2], a: sample[3] };
    });
  }

  for (i = 0; i < pixels.length; i += this.width) {
    bmp.push(pixels.slice(i, i + this.width));
  }

  return bmp;
};

PNG.prototype.createCellmap = function(bmp, options) {
  var bmp = bmp || this.bmp
    , options = options || this.options
    , cellmap = []
    , scale = options.scale || 0.20
    , height = bmp.length
    , width = bmp[0].length
    , cmwidth = options.width
    , cmheight = options.height
    , line
    , x
    , y
    , xx
    , yy
    , scale
    , xs
    , ys;

  if (cmwidth) {
    scale = cmwidth / width;
  } else if (cmheight) {
    scale = cmheight / height;
  }

  if (!cmheight) {
    cmheight = Math.round(height * scale);
  }

  if (!cmwidth) {
    cmwidth = Math.round(width * scale);
  }

  ys = height / cmheight;
  xs = width / cmwidth;

  for (y = 0; y < bmp.length; y += ys) {
    line = [];
    yy = Math.round(y);
    if (!bmp[yy]) break;
    for (x = 0; x < bmp[yy].length; x += xs) {
      xx = Math.round(x);
      if (!bmp[yy][xx]) break;
      line.push(bmp[yy][xx]);
    }
    cellmap.push(line);
  }

  return cellmap;
};

PNG.prototype.renderANSI = function(bmp) {
  var self = this
    , out = '';

  bmp.forEach(function(line, y) {
    line.forEach(function(pixel, x) {
      var outch = self.getOutch(x, y, line, pixel);
      out += self.pixelToSGR(pixel, outch);
    });
    out += '\n';
  });

  return out;
};

PNG.prototype.renderContent = function(bmp, el) {
  var self = this
    , out = '';

  bmp.forEach(function(line, y) {
    line.forEach(function(pixel, x) {
      var outch = self.getOutch(x, y, line, pixel);
      out += self.pixelToTags(pixel, outch);
    });
    out += '\n';
  });

  el.setContent(out);

  return out;
};

PNG.prototype.renderScreen = function(bmp, screen, xi, xl, yi, yl) {
  var self = this
    , lines = screen.lines
    , cellLines
    , y
    , yy
    , x
    , xx
    , alpha
    , attr
    , ch;

  cellLines = bmp.reduce(function(cellLines, line, y) {
    var cellLine = [];
    line.forEach(function(pixel, x) {
      var outch = self.getOutch(x, y, line, pixel)
        , cell = self.pixelToCell(pixel, outch);
      cellLine.push(cell);
    });
    cellLines.push(cellLine);
    return cellLines;
  }, []);

  for (y = yi; y < yl; y++) {
    yy = y - yi;
    for (x = xi; x < xl; x++) {
      xx = x - xi;
      if (lines[y] && lines[y][x] && cellLines[yy] && cellLines[yy][xx]) {
        alpha = cellLines[yy][xx].pop();
        // completely transparent
        if (alpha === 0.0) {
          continue;
        }
        // translucency / blending
        if (alpha < 1.0) {
          attr = cellLines[yy][xx][0];
          ch = cellLines[yy][xx][1];
          lines[y][x][0] = this.colors.blend(lines[y][x][0], attr, alpha);
          if (ch !== ' ') lines[y][x][1] = ch;
          lines[y].dirty = true;
          continue;
        }
        // completely opaque
        lines[y][x] = cellLines[yy][xx];
        lines[y].dirty = true;
      }
    }
  }
};

PNG.prototype.renderElement = function(bmp, el) {
  var xi = el.aleft + el.ileft
    , xl = el.aleft + el.width - el.iright
    , yi = el.atop + el.itop
    , yl = el.atop + el.height - el.ibottom;

  return this.renderScreen(bmp, el.screen, xi, xl, yi, yl);
};

PNG.prototype.pixelToSGR = function(pixel, ch) {
  var bga = 1.0
    , fga = 0.5
    , a = pixel.a / 255
    , bg
    , fg;

  bg = this.colors.match(
    pixel.r * a * bga | 0,
    pixel.g * a * bga | 0,
    pixel.b * a * bga | 0);

  if (ch && this.options.ascii) {
    fg = this.colors.match(
      pixel.r * a * fga | 0,
      pixel.g * a * fga | 0,
      pixel.b * a * fga | 0);
    if (a === 0) {
      return '\x1b[38;5;' + fg + 'm' + ch + '\x1b[m';
    }
    return '\x1b[38;5;' + fg + 'm\x1b[48;5;' + bg + 'm' + ch + '\x1b[m';
  }

  if (a === 0) return ' ';

  return '\x1b[48;5;' + bg + 'm \x1b[m';
};

PNG.prototype.pixelToTags = function(pixel, ch) {
  var bga = 1.0
    , fga = 0.5
    , a = pixel.a / 255
    , bg
    , fg;

  bg = this.colors.RGBtoHex(
    pixel.r * a * bga | 0,
    pixel.g * a * bga | 0,
    pixel.b * a * bga | 0);

  if (ch && this.options.ascii) {
    fg = this.colors.RGBtoHex(
      pixel.r * a * fga | 0,
      pixel.g * a * fga | 0,
      pixel.b * a * fga | 0);
    if (a === 0) {
      return '{' + fg + '-fg}' + ch + '{/}';
    }
    return '{' + fg + '-fg}{' + bg + '-bg}' + ch + '{/}';
  }

  if (a === 0) return ' ';

  return '{' + bg + '-bg} {/' + bg + '-bg}';
};

PNG.prototype.pixelToCell = function(pixel, ch) {
  var bga = 1.0
    , fga = 0.5
    , a = pixel.a / 255
    , bg
    , fg;

  bg = this.colors.match(
    pixel.r * bga | 0,
    pixel.g * bga | 0,
    pixel.b * bga | 0);

  if (ch && this.options.ascii) {
    fg = this.colors.match(
      pixel.r * fga | 0,
      pixel.g * fga | 0,
      pixel.b * fga | 0);
  } else {
    fg = 0x1ff;
    ch = null;
  }

  // if (a === 0) bg = 0x1ff;

  return [(0 << 18) | (fg << 9) | (bg << 0), ch || ' ', a];
};

// Taken from libcaca:
PNG.prototype.getOutch = (function() {
  var dchars = '????8@8@#8@8##8#MKXWwz$&%x><\\/xo;+=|^-:i\'.`,  `.        ';

  var luminance = function(pixel) {
    var a = pixel.a / 255
      , r = pixel.r * a
      , g = pixel.g * a
      , b = pixel.b * a
      , l = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    return l / 255;
  };

  return function(x, y, line, pixel) {
    var lumi = luminance(pixel)
      , outch = dchars[lumi * (dchars.length - 1) | 0];

    return outch;
  };
})();

PNG.prototype.compileFrames = function(frames) {
  return this.optimization === 'mem'
    ? this.compileFrames_lomem(frames)
    : this.compileFrames_locpu(frames);
};

PNG.prototype.compileFrames_lomem = function(frames) {
  if (!this.actl) return;
  return frames.map(function(frame, i) {
    this.width = frame.fctl.width;
    this.height = frame.fctl.height;

    var pixels = frame._pixels || this.parseLines(frame.fdat)
      , bmp = frame._bmp || this.createBitmap(pixels)
      , fc = frame.fctl;

    return {
      actl: this.actl,
      fctl: frame.fctl,
      delay: (fc.delayNum / (fc.delayDen || 100)) * 1000 | 0,
      bmp: bmp
    };
  }, this);
};

PNG.prototype.compileFrames_locpu = function(frames) {
  if (!this.actl) return;

  this._curBmp = null;
  this._lastBmp = null;

  return frames.map(function(frame, i) {
    this.width = frame.fctl.width;
    this.height = frame.fctl.height;

    var pixels = frame._pixels || this.parseLines(frame.fdat)
      , bmp = frame._bmp || this.createBitmap(pixels)
      , renderBmp = this.renderFrame(bmp, frame, i)
      , cellmap = this.createCellmap(renderBmp)
      , fc = frame.fctl;

    return {
      actl: this.actl,
      fctl: frame.fctl,
      delay: (fc.delayNum / (fc.delayDen || 100)) * 1000 | 0,
      bmp: renderBmp,
      cellmap: cellmap
    };
  }, this);
};

PNG.prototype.renderFrame = function(bmp, frame, i) {
  var first = this.frames[0]
    , last = this.frames[i - 1]
    , fc = frame.fctl
    , xo = fc.xOffset
    , yo = fc.yOffset
    , lxo
    , lyo
    , x
    , y
    , line
    , p;

  if (!this._curBmp) {
    this._curBmp = [];
    for (y = 0; y < first.fctl.height; y++) {
      line = [];
      for (x = 0; x < first.fctl.width; x++) {
        p = bmp[y][x];
        line.push({ r: p.r, g: p.g, b: p.b, a: p.a });
      }
      this._curBmp.push(line);
    }
  }

  if (last && last.fctl.disposeOp !== 0) {
    lxo = last.fctl.xOffset;
    lyo = last.fctl.yOffset;
    for (y = 0; y < last.fctl.height; y++) {
      for (x = 0; x < last.fctl.width; x++) {
        if (last.fctl.disposeOp === 0) {
          // none / keep
        } else if (last.fctl.disposeOp === 1) {
          // background / clear
          this._curBmp[lyo + y][lxo + x] = { r: 0, g: 0, b: 0, a: 0 };
        } else if (last.fctl.disposeOp === 2) {
          // previous / restore
          p = this._lastBmp[y][x];
          this._curBmp[lyo + y][lxo + x] = { r: p.r, g: p.g, b: p.b, a: p.a };
        }
      }
    }
  }

  if (frame.fctl.disposeOp === 2) {
    this._lastBmp = [];
    for (y = 0; y < frame.fctl.height; y++) {
      line = [];
      for (x = 0; x < frame.fctl.width; x++) {
        p = this._curBmp[yo + y][xo + x];
        line.push({ r: p.r, g: p.g, b: p.b, a: p.a });
      }
      this._lastBmp.push(line);
    }
  } else {
    this._lastBmp = null;
  }

  for (y = 0; y < frame.fctl.height; y++) {
    for (x = 0; x < frame.fctl.width; x++) {
      p = bmp[y][x];
      if (fc.blendOp === 0) {
        // source
        this._curBmp[yo + y][xo + x] = { r: p.r, g: p.g, b: p.b, a: p.a };
      } else if (fc.blendOp === 1) {
        // over
        if (p.a !== 0) {
          this._curBmp[yo + y][xo + x] = { r: p.r, g: p.g, b: p.b, a: p.a };
        }
      }
    }
  }

  return this._curBmp;
};

PNG.prototype._animate = function(callback) {
  if (!this.frames) {
    return callback(this.bmp, this.cellmap);
  }

  var self = this
    , numPlays = this.actl.numPlays || Infinity
    , running = 0
    , i = -1;

  this._curBmp = null;
  this._lastBmp = null;

  var next_lomem = function() {
    if (!running) return;

    var frame = self.frames[++i];
    if (!frame) {
      if (!--numPlays) return callback();
      i = -1;
      // XXX may be able to optimize by only setting the self._curBmp once???
      self._curBmp = null;
      self._lastBmp = null;
      return setImmediate(next);
    }

    var bmp = frame.bmp
      , renderBmp = self.renderFrame(bmp, frame, i)
      , cellmap = self.createCellmap(renderBmp);

    callback(renderBmp, cellmap);
    return setTimeout(next, frame.delay / self.speed | 0);
  };

  var next_locpu = function() {
    if (!running) return;
    var frame = self.frames[++i];
    if (!frame) {
      if (!--numPlays) return callback();
      i = -1;
      return setImmediate(next);
    }
    callback(frame.bmp, frame.cellmap);
    return setTimeout(next, frame.delay / self.speed | 0);
  };

  var next = this.optimization === 'mem'
    ? next_lomem
    : next_locpu;

  this._control = function(state) {
    if (state === -1) {
      i = -1;
      self._curBmp = null;
      self._lastBmp = null;
      running = 0;
      callback(self.frames[0].bmp,
        self.frames[0].cellmap || self.createCellmap(self.frames[0].bmp));
      return;
    }
    if (state === running) return;
    running = state;
    return next();
  };

  this._control(1);
};

PNG.prototype.play = function(callback) {
  if (!this._control || callback) {
    this.stop();
    return this._animate(callback);
  }
  this._control(1);
};

PNG.prototype.pause = function() {
  if (!this._control) return;
  this._control(0);
};

PNG.prototype.stop = function() {
  if (!this._control) return;
  this._control(-1);
};

PNG.prototype.toPNG = function(input) {
  var options = this.options
    , file = this.file
    , format = this.format
    , buf
    , img
    , gif
    , i
    , control
    , disposeOp;

  if (format !== 'gif') {
    buf = exec('convert', [format + ':-', 'png:-'],
      { stdio: ['pipe', 'pipe', 'ignore'], input: input });
    img = PNG(buf, options);
    img.file = file;
    return img;
  }

  gif = GIF(input, options);

  this.width = gif.width;
  this.height = gif.height;
  this.frames = [];

  for (i = 0; i < gif.images.length; i++) {
    img = gif.images[i];
    // Convert from gif disposal to png disposal. See:
    // http://www.w3.org/Graphics/GIF/spec-gif89a.txt
    control = img.control || gif;
    disposeOp = Math.max(0, (control.disposeMethod || 0) - 1);
    if (disposeOp > 2) disposeOp = 0;
    this.frames.push({
      fctl: {
        sequenceNumber: i,
        width: img.width,
        height: img.height,
        xOffset: img.left,
        yOffset: img.top,
        delayNum: control.delay,
        delayDen: 100,
        disposeOp: disposeOp,
        blendOp: 1
      },
      fdat: [],
      _pixels: [],
      _bmp: img.bmp
    });
  }

  this.bmp = this.frames[0]._bmp;
  this.cellmap = this.createCellmap(this.bmp);

  if (this.frames.length > 1) {
    this.actl = { numFrames: gif.images.length, numPlays: gif.numPlays || 0 };
    this.frames = this.compileFrames(this.frames);
  } else {
    this.frames = undefined;
  }

  return this;
};

// Convert a gif to an apng using imagemagick. Unfortunately imagemagick
// doesn't support apngs, so we coalesce the gif frames into one image and then
// slice them into frames.
PNG.prototype.gifMagick = function(input) {
  var options = this.options
    , file = this.file
    , format = this.format
    , buf
    , fmt
    , img
    , frames
    , frame
    , width
    , height
    , iwidth
    , twidth
    , i
    , lines
    , line
    , x
    , y;

  buf = exec('convert',
    [format + ':-', '-coalesce', '+append', 'png:-'],
    { stdio: ['pipe', 'pipe', 'ignore'], input: input });

  fmt = '{"W":%W,"H":%H,"w":%w,"h":%h,"d":%T,"x":"%X","y":"%Y"},'
  frames = exec('identify', ['-format', fmt, format + ':-'],
    { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], input: input });
  frames = JSON.parse('[' + frames.trim().slice(0, -1) + ']');

  img = PNG(buf, options);
  img.file = file;
  Object.keys(img).forEach(function(key) {
    this[key] = img[key];
  }, this);

  width = frames[0].W;
  height = frames[0].H;
  iwidth = 0;
  twidth = 0;

  this.width = width;
  this.height = height;

  this.frames = [];

  for (i = 0; i < frames.length; i++) {
    frame = frames[i];
    frame.x = +frame.x;
    frame.y = +frame.y;

    iwidth = twidth;
    twidth += width;

    lines = [];
    for (y = frame.y; y < height; y++) {
      line = [];
      for (x = iwidth + frame.x; x < twidth; x++) {
        line.push(img.bmp[y][x]);
      }
      lines.push(line);
    }

    this.frames.push({
      fctl: {
        sequenceNumber: i,
        width: frame.w,
        height: frame.h,
        xOffset: frame.x,
        yOffset: frame.y,
        delayNum: frame.d,
        delayDen: 100,
        disposeOp: 0,
        blendOp: 0
      },
      fdat: [],
      _pixels: [],
      _bmp: lines
    });
  }

  this.bmp = this.frames[0]._bmp;
  this.cellmap = this.createCellmap(this.bmp);

  if (this.frames.length > 1) {
    this.actl = { numFrames: frames.length, numPlays: 0 };
    this.frames = this.compileFrames(this.frames);
  } else {
    this.frames = undefined;
  }

  return this;
};

PNG.prototype.decompress = function(buffers) {
  return zlib.inflateSync(new Buffer(buffers.reduce(function(out, data) {
    return out.concat(Array.prototype.slice.call(data));
  }, [])));
};

/**
 * node-crc
 * https://github.com/alexgorbatchev/node-crc
 * https://github.com/alexgorbatchev/node-crc/blob/master/LICENSE
 *
 * The MIT License (MIT)
 *
 * Copyright 2014 Alex Gorbatchev
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

PNG.prototype.crc32 = (function() {
  var crcTable = [
    0x00000000, 0x77073096, 0xee0e612c, 0x990951ba, 0x076dc419, 0x706af48f,
    0xe963a535, 0x9e6495a3, 0x0edb8832, 0x79dcb8a4, 0xe0d5e91e, 0x97d2d988,
    0x09b64c2b, 0x7eb17cbd, 0xe7b82d07, 0x90bf1d91, 0x1db71064, 0x6ab020f2,
    0xf3b97148, 0x84be41de, 0x1adad47d, 0x6ddde4eb, 0xf4d4b551, 0x83d385c7,
    0x136c9856, 0x646ba8c0, 0xfd62f97a, 0x8a65c9ec, 0x14015c4f, 0x63066cd9,
    0xfa0f3d63, 0x8d080df5, 0x3b6e20c8, 0x4c69105e, 0xd56041e4, 0xa2677172,
    0x3c03e4d1, 0x4b04d447, 0xd20d85fd, 0xa50ab56b, 0x35b5a8fa, 0x42b2986c,
    0xdbbbc9d6, 0xacbcf940, 0x32d86ce3, 0x45df5c75, 0xdcd60dcf, 0xabd13d59,
    0x26d930ac, 0x51de003a, 0xc8d75180, 0xbfd06116, 0x21b4f4b5, 0x56b3c423,
    0xcfba9599, 0xb8bda50f, 0x2802b89e, 0x5f058808, 0xc60cd9b2, 0xb10be924,
    0x2f6f7c87, 0x58684c11, 0xc1611dab, 0xb6662d3d, 0x76dc4190, 0x01db7106,
    0x98d220bc, 0xefd5102a, 0x71b18589, 0x06b6b51f, 0x9fbfe4a5, 0xe8b8d433,
    0x7807c9a2, 0x0f00f934, 0x9609a88e, 0xe10e9818, 0x7f6a0dbb, 0x086d3d2d,
    0x91646c97, 0xe6635c01, 0x6b6b51f4, 0x1c6c6162, 0x856530d8, 0xf262004e,
    0x6c0695ed, 0x1b01a57b, 0x8208f4c1, 0xf50fc457, 0x65b0d9c6, 0x12b7e950,
    0x8bbeb8ea, 0xfcb9887c, 0x62dd1ddf, 0x15da2d49, 0x8cd37cf3, 0xfbd44c65,
    0x4db26158, 0x3ab551ce, 0xa3bc0074, 0xd4bb30e2, 0x4adfa541, 0x3dd895d7,
    0xa4d1c46d, 0xd3d6f4fb, 0x4369e96a, 0x346ed9fc, 0xad678846, 0xda60b8d0,
    0x44042d73, 0x33031de5, 0xaa0a4c5f, 0xdd0d7cc9, 0x5005713c, 0x270241aa,
    0xbe0b1010, 0xc90c2086, 0x5768b525, 0x206f85b3, 0xb966d409, 0xce61e49f,
    0x5edef90e, 0x29d9c998, 0xb0d09822, 0xc7d7a8b4, 0x59b33d17, 0x2eb40d81,
    0xb7bd5c3b, 0xc0ba6cad, 0xedb88320, 0x9abfb3b6, 0x03b6e20c, 0x74b1d29a,
    0xead54739, 0x9dd277af, 0x04db2615, 0x73dc1683, 0xe3630b12, 0x94643b84,
    0x0d6d6a3e, 0x7a6a5aa8, 0xe40ecf0b, 0x9309ff9d, 0x0a00ae27, 0x7d079eb1,
    0xf00f9344, 0x8708a3d2, 0x1e01f268, 0x6906c2fe, 0xf762575d, 0x806567cb,
    0x196c3671, 0x6e6b06e7, 0xfed41b76, 0x89d32be0, 0x10da7a5a, 0x67dd4acc,
    0xf9b9df6f, 0x8ebeeff9, 0x17b7be43, 0x60b08ed5, 0xd6d6a3e8, 0xa1d1937e,
    0x38d8c2c4, 0x4fdff252, 0xd1bb67f1, 0xa6bc5767, 0x3fb506dd, 0x48b2364b,
    0xd80d2bda, 0xaf0a1b4c, 0x36034af6, 0x41047a60, 0xdf60efc3, 0xa867df55,
    0x316e8eef, 0x4669be79, 0xcb61b38c, 0xbc66831a, 0x256fd2a0, 0x5268e236,
    0xcc0c7795, 0xbb0b4703, 0x220216b9, 0x5505262f, 0xc5ba3bbe, 0xb2bd0b28,
    0x2bb45a92, 0x5cb36a04, 0xc2d7ffa7, 0xb5d0cf31, 0x2cd99e8b, 0x5bdeae1d,
    0x9b64c2b0, 0xec63f226, 0x756aa39c, 0x026d930a, 0x9c0906a9, 0xeb0e363f,
    0x72076785, 0x05005713, 0x95bf4a82, 0xe2b87a14, 0x7bb12bae, 0x0cb61b38,
    0x92d28e9b, 0xe5d5be0d, 0x7cdcefb7, 0x0bdbdf21, 0x86d3d2d4, 0xf1d4e242,
    0x68ddb3f8, 0x1fda836e, 0x81be16cd, 0xf6b9265b, 0x6fb077e1, 0x18b74777,
    0x88085ae6, 0xff0f6a70, 0x66063bca, 0x11010b5c, 0x8f659eff, 0xf862ae69,
    0x616bffd3, 0x166ccf45, 0xa00ae278, 0xd70dd2ee, 0x4e048354, 0x3903b3c2,
    0xa7672661, 0xd06016f7, 0x4969474d, 0x3e6e77db, 0xaed16a4a, 0xd9d65adc,
    0x40df0b66, 0x37d83bf0, 0xa9bcae53, 0xdebb9ec5, 0x47b2cf7f, 0x30b5ffe9,
    0xbdbdf21c, 0xcabac28a, 0x53b39330, 0x24b4a3a6, 0xbad03605, 0xcdd70693,
    0x54de5729, 0x23d967bf, 0xb3667a2e, 0xc4614ab8, 0x5d681b02, 0x2a6f2b94,
    0xb40bbe37, 0xc30c8ea1, 0x5a05df1b, 0x2d02ef8d
  ];

  return function crc32(buf) {
    //var crc = previous === 0 ? 0 : ~~previous ^ -1;
    var crc = -1;
    for (var i = 0, len = buf.length; i < len; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return crc ^ -1;
  };
})();

PNG.prototype._debug = function() {
  if (!this.options.log) return;
  return this.options.log.apply(null, arguments);
};

/**
 * GIF
 */

function GIF(file, options) {
  var self = this;

  if (!(this instanceof GIF)) {
    return new GIF(file, options);
  }

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

  this.options = options;

  // XXX If the gif is not optimized enough
  // it may OOM the process with too many frames.
  // TODO: Implement in PNG reader.
  this.pixelLimit = this.options.pixelLimit || 7622550;
  this.totalPixels = 0;

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

  this.width = buf.readUInt16LE(6);
  this.height = buf.readUInt16LE(8);

  this.flags = buf.readUInt8(10);
  this.gct = !!(this.flags & 0x80);
  this.gctsize = (this.flags & 0x07) + 1;

  this.bgIndex = buf.readUInt8(11);
  this.aspect = buf.readUInt8(12);
  p += 13;

  if (this.gct) {
    this.colors = [];
    total = 1 << this.gctsize;
    for (i = 0; i < total; i++, p += 3) {
      this.colors.push([buf[p], buf[p + 1], buf[p + 2], 255]);
    }
  }

  this.images = [];
  this.extensions = [];

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
          if (buf[p] === 0x3b && p === buf.length - 1) {
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

        if (ext && ext.label === 0xf9) {
          img.control = ext;
        }

        this.totalPixels += img.width * img.height;

        this.images.push(img);

        if (this.totalPixels >= this.pixelLimit) {
          break;
        }
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
          this.delay = ext.delay;
          this.transparentColor = ext.transparentColor;
          this.disposeMethod = ext.disposeMethod;
          this.useTransparent = ext.useTransparent;
        } else if (label === 0xff) {
          // https://wiki.whatwg.org/wiki/GIF#Specifications
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
          ext.data = new Buffer(ext.data.reduce(function(out, data) {
            return out.concat(Array.prototype.slice.call(data));
          }, []));
          // AnimExts looping extension (identical to netscape)
          if (ext.id === 'ANIMEXTS' && ext.auth === '1.0') {
            ext.id = 'NETSCAPE';
            ext.auth = '2.0';
            ext.animexts = true;
          }
          // Netscape extensions
          if (ext.id === 'NETSCAPE' && ext.auth === '2.0') {
            if (ext.data.readUInt8(0) === 0x01) {
              // Netscape looping extension
              // http://graphcomp.com/info/specs/ani_gif.html
              ext.numPlays = ext.data.readUInt16LE(1);
              this.numPlays = ext.numPlays;
            } else if (ext.data.readUInt8(0) === 0x02) {
              // Netscape buffering extension
              this.minBuffer = ext.data;
            }
          }
          // Adobe XMP extension
          if (ext.id === 'XMP Data' && ext.auth === 'XMP') {
            ext.xmp = ext.data.toString('utf8');
            this.xmp = ext.xmp;
          }
          // ICC extension
          if (ext.id === 'ICCRGBG1' && ext.auth === '012') {
            // NOTE: Says size is 4 bytes, not 1? Maybe just buffer size?
            this.icc = ext.data;
          }
          // fractint extension
          if (ext.id === 'fractint' && /^00[1-7]$/.test(ext.auth)) {
            // NOTE: Says size is 4 bytes, not 1? Maybe just buffer size?
            // Size: '!\377\013' == [0x00, 0x15, 0xff, 0x0b]
            this.fractint = ext.data;
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
        this.extensions.push(ext);
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

  this.images = this.images.map(function(img, imageIndex) {
    var control = img.control || this;

    img.lzw = new Buffer(img.lzw.reduce(function(out, data) {
      return out.concat(Array.prototype.slice.call(data));
    }, []));

    try {
      img.data = this.decompress(img.lzw, img.codeSize);
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

    var table = img.lcolors || this.colors
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
      if (control.useTransparent && b === control.transparentColor) {
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

  if (!this.images.length) {
    throw new Error('no image data or bad decompress');
  }
}

// Rewritten version of:
// https://github.com/lbv/ka-cs-programs/blob/master/lib/gif-reader.js
GIF.prototype.decompress = function(input, codeSize) {
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
};

/**
 * Expose
 */

exports = PNG;
exports.png = PNG;
exports.gif = GIF;

module.exports = exports;
