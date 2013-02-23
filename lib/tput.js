/**
 * Tput for node.js
 * Copyright (c) 2013, Christopher Jeffrey (MIT License)
 * https://github.com/chjj/blessed
 */

// Resources:
//   $ man term
//   $ man terminfo
//   http://invisible-island.net/ncurses/man/term.5.html
//   https://en.wikipedia.org/wiki/Terminfo

/**
 * Modules
 */

var assert = require('assert')
  , path = require('path')
  , fs = require('fs');

/**
 * Tput
 */

function Tput(term, debug) {
  if (!(this instanceof Tput)) {
    return new Tput(term);
  }

  this.term = term;
  this.data = null;
  this.info = {};
  this.debug = debug;

  this.readTerminfo();
  this.compile();
}

Tput.prototype.readTerminfo = function() {
  if (this.data) return;

  var file = path.resolve(
    '/usr/share/terminfo',
    path.basename(this.term[0]),
    path.basename(this.term)
  );

  this.data = fs.readFileSync(file);
  this.info = this.parseTerminfo(this.data);

  return this.info;
};

/**
 * Terminfo Parser
 * All shorts are little-endian
 */

Tput.prototype.parseTerminfo = function(data) {
  var info = {}
    , l = data.length
    , i = 0;

  var h = info.header = {
    dataSize: data.length,
    headerSize: 12,
    magicNumber: (data[1] << 8) | data[0],
    namesSize: (data[3] << 8) | data[2],
    boolCount: (data[5] << 8) | data[4],
    numCount: (data[7] << 8) | data[6],
    strCount: (data[9] << 8) | data[8],
    strTableSize: (data[11] << 8) | data[10]
  };

  h.total = h.headerSize
    + h.namesSize
    + h.boolCount
    + h.numCount * 2
    + h.strCount * 2
    + h.strTableSize;

  i = h.headerSize;

  // Names Section
  var names = data.toString('ascii', i, i + h.namesSize - 1)
    , parts = names.split('|')
    , name = parts[0]
    , desc = parts.slice(1).join('|');

  info.name = name;
  info.desc = desc;

  i += h.namesSize - 1;

  // Names is nul-terminated.
  assert.equal(data[i], 0);
  i++;

  // Booleans Section
  // One byte for each flag
  // Same order as <term.h>
  info.bools = {};
  l = i + h.boolCount;
  var o = 0, b;
  for (; i < l; i++) {
    b = Tput.bools[o++] || 'OFFSET: ' + (o - 1);
    info.bools[b] = !!data[i];
  }

  // Null byte in between to make sure numbers begin on an even byte.
  if (i % 2) {
    assert.equal(data[i], 0);
    i++;
  }

  // Numbers Section
  info.numbers = {};
  l = i + h.numCount * 2;
  var o = 0, n;
  for (; i < l; i += 2) {
    n = Tput.numbers[o++] || 'OFFSET: ' + (o - 1);
    if (data[i + 1] === 0377 && data[i] === 0377) {
      info.numbers[n] = -1;
    } else {
      info.numbers[n] = (data[i + 1] << 8) | data[i];
    }
  }

  // Strings Section
  info.strings = {};
  l = i + h.strCount * 2;
  var o = 0, s;
  for (; i < l; i += 2) {
    s = Tput.strings[o++] || 'OFFSET: ' + (o - 1);
    if (data[i + 1] === 0377 && data[i] === 0377) {
      info.strings[s] = -1;
    } else {
      info.strings[s] = (data[i + 1] << 8) | data[i];
    }
  }

  // String Table
  Object.keys(info.strings).forEach(function(key) {
    if (info.strings[key] === -1) {
      delete info.strings[key];
      return;
    }

    var s = i + info.strings[key]
      , j = s;

    while (data[j]) j++;

    if (s >= data.length || j > data.length) {
      delete info.strings[key];
      return;
    }

    info.strings[key] = data.toString('ascii', s, j);
  });

  // Extended Header
  if (this.extended) {
    i += h.strTableSize + 1; // offset?
    l = data.length;
    if (i < l) {
      info.extended = this.parseExtended(data.slice(i));
      Object.keys(info.extended).forEach(function(key) {
        info[key].extended = info.extended[key];
      });
      delete info.extended;
    }
  }

  return info;
};

Tput.prototype.parseExtended = function(data) {
  var info = {}
    , l = data.length
    , i = 0;

  var h = info.header = {
    dataSize: data.length,
    headerSize: 10,
    boolCount: (data[i + 1] << 8) | data[i + 0],
    numCount: (data[i + 3] << 8) | data[i + 2],
    strCount: (data[i + 5] << 8) | data[i + 4],
    strTableSize: (data[i + 7] << 8) | data[i + 6],
    lastStrTableOffset: (data[i + 9] << 8) | data[i + 8]
  };

  h.total = h.headerSize
    + h.boolCount
    + h.numCount * 2
    + h.strCount * 2
    + h.strTableSize;

  i = h.headerSize;

  // Booleans Section
  // One byte for each flag
  // Same order as <term.h>
  info.bools = {};
  l = i + h.boolCount;
  var o = 36 + 1, b;
  for (; i < l; i++) {
    b = Tput.bools[o++] || 'OFFSET: ' + (o - 1);
    info.bools[b] = !!data[i];
  }

  // Null byte in between to make sure numbers begin on an even byte.
  if (i % 2) {
    assert.equal(data[i], 0);
    i++;
  }

  // Numbers Section
  info.numbers = {};
  l = i + h.numCount * 2;
  var o = 32 + 1, n;
  for (; i < l; i += 2) {
    n = Tput.numbers[o++] || 'OFFSET: ' + (o - 1);
    if (data[i + 1] === 0377 && data[i] === 0377) {
      info.numbers[n] = -1;
    } else {
      info.numbers[n] = (data[i + 1] << 8) | data[i];
    }
  }

  // Strings Section
  info.strings = {};
  l = i + h.strCount * 2;
  var o = 393 + 1, s;
  for (; i < l; i += 2) {
    s = Tput.strings[o++] || 'OFFSET: ' + (o - 1);
    if (data[i + 1] === 0377 && data[i] === 0377) {
      info.strings[s] = -1;
    } else {
      info.strings[s] = (data[i + 1] << 8) | data[i];
    }
  }

  // String Table
  Object.keys(info.strings).forEach(function(key) {
    if (info.strings[key] === -1) {
      delete info.strings[key];
      return;
    }

    var s = i + info.strings[key]
      , j = s;

    while (data[j]) j++;

    if (s >= data.length || j > data.length) {
      delete info.strings[key];
      return;
    }

    info.strings[key] = data.toString('ascii', s, j);
  });

  return info;
};

/**
 * Compiler - terminfo cap->javascript
 */

Tput.prototype.compile = function(key) {
  var self = this
    , info = this.info;

  if (this.debug) {
    console.log(this.info);
  }

  this.methods = {};
  this.info.all = {};

  Object.keys(info.bools).forEach(function(key) {
    info.all[key] = info.bools[key];
  });

  Object.keys(info.numbers).forEach(function(key) {
    info.all[key] = info.numbers[key];
  });

  Object.keys(info.strings).forEach(function(key) {
    info.all[key] = info.strings[key];
  });

  Object.keys(info.all).forEach(function(key) {
    if (self.debug) {
      console.log('Compiling %s: %s', key, JSON.stringify(info.all[key]));
    }
    self.methods[key] = self._compile(info.all[key]);
    var alias = Tput.alias[key];
    if (alias) self.methods[alias] = self.methods[key];
  });

  Tput.bools.concat(Tput.numbers).concat(Tput.strings).forEach(function(key) {
    if (!self.methods[key]) self.methods[key] = noop;
  });

  Object.keys(self.methods).forEach(function(key) {
    self[key] = function() {
      var args = Array.prototype.slice.call(arguments);
      return self.methods[key].call(self, args);
    };
  });
};

Tput.prototype._compile = function(val) {
  var self = this;

  switch (typeof val) {
    case 'boolean':
      return function() {
        return val ? 'true' : 'false';
      };
    case 'number':
      return function() {
        return val === -1 ? null : val;
      };
    case 'string':
      break;
    default:
      return function() {};
  }

  var code = 'var v, dyn = {}, stat = {}, stack = [], out = [];'
    , buff = ''
    , cap;

  var ch
    , op
    , i
    , v

  function clear() {
    if (buff) {
      echo(JSON.stringify(buff).replace(/\\u001b/g, '\\x1b'));
      buff = '';
    }
  }

  function read(regex) {
    cap = regex.exec(val);
    if (!cap) return;
    val = val.substring(cap[0].length);
    ch = op = i = v = cap[1];
    clear();
    return cap;
  }

  function stmt(c) {
    if (code[code.length-1] === ',') {
      code = code.slice(0, -1);
    }
    code += c;
    // code += ';' + c;
  }

  function expr(c) {
    code += c + ',';
    // code += '(' + c + '),';
  }

  function echo(c) {
    expr('out.push(' + c + ')');
  }

  function print(c) {
    echo('"' + c + '"');
  }

  function push(c) {
    expr('(stack.push(v = ' + c + '), v)');
  }

  function pop(c) {
    expr((c ? c + ' = ' : '') + 'stack.pop()');
  }

  while (val) {
    // '\e' -> ^[
    if (read(/^\\e/i)) {
      print('\\x1b');
      continue;
    }

    // '^A' -> ^A
    if (read(/^\^(.)/i)) {
      ch = ch.toUpperCase(); // ?
      switch (ch) {
        case '@':
          ch = '\\x00';
          break;
        case '[':
          ch = '\\x1b';
          break;
        case '\\':
          ch = '\\x1c';
          break;
        case ']':
          ch = '\\x1d';
          break;
        case '^':
          ch = '\\x1e';
          break;
        case '_':
          ch = '\\x1f';
          break;
        case '?':
          ch = '\\x7f';
          break;
        default:
          if (ch >= 'A' && ch <= 'Z') {
            ch = ch.charCodeAt(0) - 64;
            ch = ch.toString(16);
            if (ch.length < 2) ch = '0' + ch;
            ch = '\\x' + ch;
          } else {
            ch = '^' + cap[1];
          }
          break;
      }
      print(ch);
      continue;
    }

    // '\n' -> \n
    // '\r' -> \r
    // '\0' -> \200 (special case)
    if (read(/^\\([nlrtbfs\^\\,:0])/)) {
      switch (ch) {
        case 'n':
          ch = '\\n';
          break;
        case 'l':
          ch = '';
          break;
        case 'r':
          ch = '\\r';
          break;
        case 't':
          ch = '\\t';
          break;
        case 'b':
          ch = '\\x08';
          break;
        case 'f':
          ch = '\\x0c';
          break;
        case 's':
          ch = ' ';
          break;
        case '\\':
          ch = '\\\\';
          break;
        case ',':
          ch = ',';
          break;
        case ';':
          ch = ';';
          break;
        case '0':
          //ch = '\\0';
          ch = '\\200';
          break;
        //case 'v':
        //  ch = '\\x0b';
        //  break;
        //case 'a':
        //  ch = '\\x07':
        //  break;
        default:
          ch = '';
          break;
      }
      print(ch);
      continue;
    }

    // 3 octal digits -> character
    if (read(/^\\(\d{3})/)) {
      print('\\' + ch);
      continue;
    }

    // $<5> -> padding
    // e.g. flash_screen: '\u001b[?5h$<100/>\u001b[?5l',
    if (read(/^\$<(\d+)>(\*|\/)/)) {
      print('');
      continue;
    }

    // %%   outputs `%'
    if (read(/^%%/)) {
      print('%');
      continue;
    }

    // %[[:]flags][width[.precision]][doxXs]
    //   as in printf, flags are [-+#] and space.  Use a `:' to allow the
    //   next character to be a `-' flag, avoiding interpreting "%-" as an
    //   operator.
    if (read(/^%(:-|[+# ])(?:(\d+)(\.\d+)?)?([doxXs])?/)) {
      print('');
      continue;
    }

    // %c   print pop() like %c in printf
    if (read(/^%c/)) {
      echo('stack.pop()');
      continue;
    }

    // %d   print pop() like %d in printf
    // NOT SURE ABOUT %d being print!
    if (read(/^%d/)) {
      echo('stack.pop()');
      continue;
    }

    // %s   print pop() like %s in printf
    if (read(/^%s/)) {
      echo('stack.pop()');
      continue;
    }

    // %p[1-9]
    //   push i'th parameter
    if (read(/^%p([1-9])/)) {
      expr('(stack.push(v = params[' + (i - 1) + ']), v)');
      continue;
    }

    // %P[a-z]
    //   set dynamic variable [a-z] to pop()
    if (read(/^%P([a-z])/)) {
      expr('dyn.' + v + ' = stack.pop()');
      continue;
    }

    // %g[a-z]
    //   get dynamic variable [a-z] and push it
    if (read(/^%g([a-z])/)) {
      expr('(stack.push(dyn.' + v + '), dyn.' + v + ')');
      continue;
    }

    // %P[A-Z]
    //   set static variable [a-z] to pop()
    if (read(/^%P([A-Z])/)) {
      expr('stat.' + v + ' = stack.pop()');
      continue;
    }

    // %g[A-Z]
    //   get static variable [a-z] and push it

    //   The  terms  "static"  and  "dynamic" are misleading.  Historically,
    //   these are simply two different sets of variables, whose values are
    //   not reset between calls to tparm.  However, that fact is not
    //   documented in other implementations.  Relying on it will adversely
    //   impact portability to other implementations.

    if (read(/^%g([A-Z])/)) {
      expr('(stack.push(v = stat.' + v + '), v)');
      continue;
    }

    // %'c' char constant c
    if (read(/^%'(\w)'/)) {
      expr('(stack.push(v = "' + ch + '", v)');
      continue;
    }

    // %{nn}
    //   integer constant nn
    if (read(/^%\{(\d+)\}/)) {
      expr('(stack.push(v = ' + ch + '), v)');
      continue;
    }

    // %l   push strlen(pop)
    if (read(/^%l/)) {
      expr('(stack.push(v = stack.pop().length), v)');
      continue;
    }

    // %+ %- %* %/ %m
    //   arithmetic (%m is mod): push(pop() op pop())
    // %& %| %^
    //   bit operations (AND, OR and exclusive-OR): push(pop() op pop())
    // %= %> %<
    //   logical operations: push(pop() op pop())
    if (read(/^%([+\-*\/m&|\^=><])/)) {
      if (op === '=') op = '===';
      else if (op === 'm') op = '%';
      expr('(stack.push(v = (stack.pop() ' + op + ' stack.pop())), v)');
      continue;
    }

    // %A, %O
    //   logical AND and OR operations (for conditionals)
    if (read(/^%([AO])/)) {
      stmt(op === ' A ' ? ' && ' : ' || ');
      continue;
    }

    // %! %~
    //   unary operations (logical and bit complement): push(op pop())
    if (read(/^%([!~])/)) {
      expr('(stack.push(v = ' + op + 'stack.pop()), v)');
      continue;
    }

    // %i   add 1 to first two parameters (for ANSI terminals)
    if (read(/^%i/)) {
      expr('(params[0]++, params[1]++)');
      continue;
    }

    // %? expr %t thenpart %e elsepart %;
    //   This forms an if-then-else.  The %e elsepart is optional.  Usually
    //   the %? expr part pushes a value onto the stack, and %t pops it from
    //   the stack, testing if it is nonzero (true).  If it is zero (false),
    //   control passes to the %e (else) part.

    //   It is possible to form else-if's a la Algol 68:
    //   %? c1 %t b1 %e c2 %t b2 %e c3 %t b3 %e c4 %t b4 %e %;

    //   where ci are conditions, bi are bodies.

    //   Use the -f option of tic or infocmp to see the structure of
    //   if-then-else's.  Some strings, e.g., sgr can be very complicated when
    //   written on one line.  The -f option splits the string into lines with
    //   the parts indented.
    if (read(/^%\?/)) {
      stmt(';if (');
      continue;
    }

    if (read(/^%t/)) {
      stmt(') {');
      continue;
    }

    if (read(/^%e/)) {
      var end = val.indexOf('%;');
      var els = val.indexOf('%e');
      var then = val.indexOf('%t');
      // does else if's like this: %?[expr]%t...%e[expr]%t...%;
      if (then < end && then < els) {
        stmt('} else if (');
      } else {
        stmt('} else {');
      }
      continue;
    }

    if (read(/^%;/)) {
      stmt('}');
      continue;
    }

    // Binary  operations  are  in postfix form with the operands in the usual
    // order.  That is, to get x-5 one would use "%gx%{5}%-".  %P and %g vari‐
    // ables are persistent across escape-string evaluations.

    // Consider the HP2645, which, to get to row 3 and column 12, needs to be
    // sent \E&a12c03Y padded for 6 milliseconds.  Note that the order of the
    // rows and columns is inverted here, and that the row and column are
    // printed as two digits.  Thus its cup capability is
    // “cup=6\E&%p2%2dc%p1%2dY”.

    // The  Microterm  ACT-IV  needs  the  current  row  and  column  sent
    // preceded  by  a  ^T,  with  the  row  and column simply encoded in
    // binary, “cup=^T%p1%c%p2%c”.  Terminals which use “%c” need to be able
    // to backspace the cursor (cub1), and to move the cursor up one line
    // on the  screen (cuu1).  This is necessary because it is not always safe
    // to transmit \n ^D and \r, as the system may change or discard them.
    // (The library routines dealing with terminfo set tty modes so that tabs
    // are never expanded, so \t is safe to send.  This turns out to be
    // essential for  the  Ann Arbor 4080.)

    // A  final example is the LSI ADM-3a, which uses row and column offset
    // by a blank character, thus “cup=\E=%p1%' '%+%c%p2%' '%+%c”.  After
    // sending `\E=', this pushes the first parameter, pushes the ASCII value
    // for a space (32), adds them (pushing the sum on the stack in place  of
    // the  two previous  values)  and outputs that value as a character.
    // Then the same is done for the second parameter.  More complex
    // arithmetic is possible using the stack.

    buff += val[0];
    val = val.substring(1);
  }

  clear();

  stmt(';return out.join("");');

  // Optimize
  //  ... out.push("foo");return out.join("");
  // To:
  //  return "foo";
  v = code.split(/out = \[\];out\.push\(|\);return out/);
  if (v.length === 3 && /^"[^"]+"$/.test(v[1])) {
    code = 'return ' + v[1] + ';';
  }

  if (this.debug) {
    v = code
      .replace(/\x1b/g, '\\x1b')
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n');
    process.stdout.write(v + '\n');
  }

  try {
    return new Function('params', code);
  } catch (e) {
    e.stack = e.stack.replace(/\x1b/g, '\\x1b');
    throw e;
  }
};

Tput.prototype.setupAliases = function(info) {
  var self = this;
  Object.keys(info).forEach(function(name) {
    var obj = info[name];
    Object.keys(obj).forEach(function(key) {
      var alias = Tput.alias[key];
      if (alias) obj[alias] = obj[key];
    });
  });
};

/**
 * Termcap
 */

Tput.prototype.readTermcap = function() {
  if (this.termcap) return;

  this.termcap = {};

  if (process.env.TERMCAP) {
    this.termcap.data = process.env.TERMCAP;
  } else {
    var file = path.resolve('/etc/termcap');
    this.termcap.data = fs.readFileSync(file, 'utf8');
  }

  this.termcap.terms = this.parseTermcap(this.termcap.data);
  this.termcap.info = this.termcap.terms[this.term];

  return this.termcap;
};

/**
 * Termcap Parser
 *  http://en.wikipedia.org/wiki/Termcap
 *  http://www.gnu.org/software/termutils/manual/termcap-1.3/html_mono/termcap.html
 *  http://www.gnu.org/software/termutils/manual/termcap-1.3/html_mono/termcap.html#SEC17
 *  http://tldp.org/HOWTO/Text-Terminal-HOWTO.html#toc16
 *  man termcap
 */

// Example:
// vt102|dec vt102:\
//  :do=^J:co#80:li#24:cl=50\E[;H\E[2J:\
//  :le=^H:bs:cm=5\E[%i%d;%dH:nd=2\E[C:up=2\E[A:\
//  :ce=3\E[K:cd=50\E[J:so=2\E[7m:se=2\E[m:us=2\E[4m:ue=2\E[m:\
//  :md=2\E[1m:mr=2\E[7m:mb=2\E[5m:me=2\E[m:is=\E[1;24r\E[24;1H:\
//  :rs=\E>\E[?3l\E[?4l\E[?5l\E[?7h\E[?8h:ks=\E[?1h\E=:ke=\E[?1l\E>:\
//  :ku=\EOA:kd=\EOB:kr=\EOC:kl=\EOD:kb=^H:\
//  :ho=\E[H:k1=\EOP:k2=\EOQ:k3=\EOR:k4=\EOS:pt:sr=5\EM:vt#3:\
//  :sc=\E7:rc=\E8:cs=\E[%i%d;%dr:vs=\E[?7l:ve=\E[?7h:\
//  :mi:al=\E[L:dc=\E[P:dl=\E[M:ei=\E[4l:im=\E[4h:

Tput.prototype.parseTermcap = function(data) {
  var terms = {}
    , term
    , entries
    , fields
    , field
    , names
    , i
    , j
    , k;

  // remove escaped newlines
  data = data.replace(/\\\n[ \t]*/g, '');

  // remove comments
  data = data.replace(/^#[^\n]+/gm, '');

  // split entries
  entries = data.split(/\n+/);

  for (i = 0; i < entries.length; i++) {
    fields = entries[i].split(/:+/);
    for (j = 0; j < fields.length; j++) {
      field = fields[j].trim();
      if (!field) continue;

      if (j === 0) {
        names = field.split('|');
        term = {
          name: names[0],
          names: names,
          desc: names.pop()
        };

        k = names.length;
        while (k--) terms[names[k]] = term;

        term.bools = {};
        term.numbers = {};
        term.strings = {};

        continue;
      }

      if (~field.indexOf('=')) {
        parts = field.split('=');
        term.strings[parts[0]] = parts.slice(1).join('=');
      } else if (~field.indexOf('#')) {
        parts = field.split('#');
        term.numbers[parts[0]] = +parts.slice(1).join('#');
      } else {
        term.bools[field] = true;
      }
    }
  }

  return terms;
};

/**
 * Termcap Compiler
 *  man termcap
 */

Tput.prototype.compileTermcap = function() {
};

Tput.prototype._compileTermcap = function() {
};

/**
 * Helpers
 */

function noop() {
  return '';
}

/**
 * Terminfo Data
 */

Tput.alias = {
  // Bools
  'no_esc_ctlc': 'beehive_glitch',
  'dest_tabs_magic_smso': 'teleray_glitch',
  // Numbers
  'micro_col_size': 'micro_char_size'
};

Tput.bools = [
  'auto_left_margin',
  'auto_right_margin',
  'no_esc_ctlc',
  'ceol_standout_glitch',
  'eat_newline_glitch',
  'erase_overstrike',
  'generic_type',
  'hard_copy',
  'has_meta_key',
  'has_status_line',
  'insert_null_glitch',
  'memory_above',
  'memory_below',
  'move_insert_mode',
  'move_standout_mode',
  'over_strike',
  'status_line_esc_ok',
  'dest_tabs_magic_smso',
  'tilde_glitch',
  'transparent_underline',
  'xon_xoff',
  'needs_xon_xoff',
  'prtr_silent',
  'hard_cursor',
  'non_rev_rmcup',
  'no_pad_char',
  'non_dest_scroll_region',
  'can_change',
  'back_color_erase',
  'hue_lightness_saturation',
  'col_addr_glitch',
  'cr_cancels_micro_mode',
  'has_print_wheel',
  'row_addr_glitch',
  'semi_auto_right_margin',
  'cpi_changes_res',
  'lpi_changes_res',

  // #ifdef __INTERNAL_CAPS_VISIBLE
  'backspaces_with_bs',
  'crt_no_scrolling',
  'no_correctly_working_cr',
  'gnu_has_meta_key',
  'linefeed_is_newline',
  'has_hardware_tabs',
  'return_does_clr_eol'
];

Tput.numbers = [
  'columns',
  'init_tabs',
  'lines',
  'lines_of_memory',
  'magic_cookie_glitch',
  'padding_baud_rate',
  'virtual_terminal',
  'width_status_line',
  'num_labels',
  'label_height',
  'label_width',
  'max_attributes',
  'maximum_windows',
  'max_colors',
  'max_pairs',
  'no_color_video',
  'buffer_capacity',
  'dot_vert_spacing',
  'dot_horz_spacing',
  'max_micro_address',
  'max_micro_jump',
  'micro_col_size',
  'micro_line_size',
  'number_of_pins',
  'output_res_char',
  'output_res_line',
  'output_res_horz_inch',
  'output_res_vert_inch',
  'print_rate',
  'wide_char_size',
  'buttons',
  'bit_image_entwining',
  'bit_image_type',

  // #ifdef __INTERNAL_CAPS_VISIBLE
  'magic_cookie_glitch_ul',
  'carriage_return_delay',
  'new_line_delay',
  'backspace_delay',
  'horizontal_tab_delay',
  'number_of_function_keys'
];

Tput.strings = [
  'back_tab',
  'bell',
  'carriage_return',
  'change_scroll_region',
  'clear_all_tabs',
  'clear_screen',
  'clr_eol',
  'clr_eos',
  'column_address',
  'command_character',
  'cursor_address',
  'cursor_down',
  'cursor_home',
  'cursor_invisible',
  'cursor_left',
  'cursor_mem_address',
  'cursor_normal',
  'cursor_right',
  'cursor_to_ll',
  'cursor_up',
  'cursor_visible',
  'delete_character',
  'delete_line',
  'dis_status_line',
  'down_half_line',
  'enter_alt_charset_mode',
  'enter_blink_mode',
  'enter_bold_mode',
  'enter_ca_mode',
  'enter_delete_mode',
  'enter_dim_mode',
  'enter_insert_mode',
  'enter_secure_mode',
  'enter_protected_mode',
  'enter_reverse_mode',
  'enter_standout_mode',
  'enter_underline_mode',
  'erase_chars',
  'exit_alt_charset_mode',
  'exit_attribute_mode',
  'exit_ca_mode',
  'exit_delete_mode',
  'exit_insert_mode',
  'exit_standout_mode',
  'exit_underline_mode',
  'flash_screen',
  'form_feed',
  'from_status_line',
  'init_1string',
  'init_2string',
  'init_3string',
  'init_file',
  'insert_character',
  'insert_line',
  'insert_padding',
  'key_backspace',
  'key_catab',
  'key_clear',
  'key_ctab',
  'key_dc',
  'key_dl',
  'key_down',
  'key_eic',
  'key_eol',
  'key_eos',
  'key_f0',
  'key_f1',
  'key_f10',
  'key_f2',
  'key_f3',
  'key_f4',
  'key_f5',
  'key_f6',
  'key_f7',
  'key_f8',
  'key_f9',
  'key_home',
  'key_ic',
  'key_il',
  'key_left',
  'key_ll',
  'key_npage',
  'key_ppage',
  'key_right',
  'key_sf',
  'key_sr',
  'key_stab',
  'key_up',
  'keypad_local',
  'keypad_xmit',
  'lab_f0',
  'lab_f1',
  'lab_f10',
  'lab_f2',
  'lab_f3',
  'lab_f4',
  'lab_f5',
  'lab_f6',
  'lab_f7',
  'lab_f8',
  'lab_f9',
  'meta_off',
  'meta_on',
  'newline',
  'pad_char',
  'parm_dch',
  'parm_delete_line',
  'parm_down_cursor',
  'parm_ich',
  'parm_index',
  'parm_insert_line',
  'parm_left_cursor',
  'parm_right_cursor',
  'parm_rindex',
  'parm_up_cursor',
  'pkey_key',
  'pkey_local',
  'pkey_xmit',
  'print_screen',
  'prtr_off',
  'prtr_on',
  'repeat_char',
  'reset_1string',
  'reset_2string',
  'reset_3string',
  'reset_file',
  'restore_cursor',
  'row_address',
  'save_cursor',
  'scroll_forward',
  'scroll_reverse',
  'set_attributes',
  'set_tab',
  'set_window',
  'tab',
  'to_status_line',
  'underline_char',
  'up_half_line',
  'init_prog',
  'key_a1',
  'key_a3',
  'key_b2',
  'key_c1',
  'key_c3',
  'prtr_non',
  'char_padding',
  'acs_chars',
  'plab_norm',
  'key_btab',
  'enter_xon_mode',
  'exit_xon_mode',
  'enter_am_mode',
  'exit_am_mode',
  'xon_character',
  'xoff_character',
  'ena_acs',
  'label_on',
  'label_off',
  'key_beg',
  'key_cancel',
  'key_close',
  'key_command',
  'key_copy',
  'key_create',
  'key_end',
  'key_enter',
  'key_exit',
  'key_find',
  'key_help',
  'key_mark',
  'key_message',
  'key_move',
  'key_next',
  'key_open',
  'key_options',
  'key_previous',
  'key_print',
  'key_redo',
  'key_reference',
  'key_refresh',
  'key_replace',
  'key_restart',
  'key_resume',
  'key_save',
  'key_suspend',
  'key_undo',
  'key_sbeg',
  'key_scancel',
  'key_scommand',
  'key_scopy',
  'key_screate',
  'key_sdc',
  'key_sdl',
  'key_select',
  'key_send',
  'key_seol',
  'key_sexit',
  'key_sfind',
  'key_shelp',
  'key_shome',
  'key_sic',
  'key_sleft',
  'key_smessage',
  'key_smove',
  'key_snext',
  'key_soptions',
  'key_sprevious',
  'key_sprint',
  'key_sredo',
  'key_sreplace',
  'key_sright',
  'key_srsume',
  'key_ssave',
  'key_ssuspend',
  'key_sundo',
  'req_for_input',
  'key_f11',
  'key_f12',
  'key_f13',
  'key_f14',
  'key_f15',
  'key_f16',
  'key_f17',
  'key_f18',
  'key_f19',
  'key_f20',
  'key_f21',
  'key_f22',
  'key_f23',
  'key_f24',
  'key_f25',
  'key_f26',
  'key_f27',
  'key_f28',
  'key_f29',
  'key_f30',
  'key_f31',
  'key_f32',
  'key_f33',
  'key_f34',
  'key_f35',
  'key_f36',
  'key_f37',
  'key_f38',
  'key_f39',
  'key_f40',
  'key_f41',
  'key_f42',
  'key_f43',
  'key_f44',
  'key_f45',
  'key_f46',
  'key_f47',
  'key_f48',
  'key_f49',
  'key_f50',
  'key_f51',
  'key_f52',
  'key_f53',
  'key_f54',
  'key_f55',
  'key_f56',
  'key_f57',
  'key_f58',
  'key_f59',
  'key_f60',
  'key_f61',
  'key_f62',
  'key_f63',
  'clr_bol',
  'clear_margins',
  'set_left_margin',
  'set_right_margin',
  'label_format',
  'set_clock',
  'display_clock',
  'remove_clock',
  'create_window',
  'goto_window',
  'hangup',
  'dial_phone',
  'quick_dial',
  'tone',
  'pulse',
  'flash_hook',
  'fixed_pause',
  'wait_tone',
  'user0',
  'user1',
  'user2',
  'user3',
  'user4',
  'user5',
  'user6',
  'user7',
  'user8',
  'user9',
  'orig_pair',
  'orig_colors',
  'initialize_color',
  'initialize_pair',
  'set_color_pair',
  'set_foreground',
  'set_background',
  'change_char_pitch',
  'change_line_pitch',
  'change_res_horz',
  'change_res_vert',
  'define_char',
  'enter_doublewide_mode',
  'enter_draft_quality',
  'enter_italics_mode',
  'enter_leftward_mode',
  'enter_micro_mode',
  'enter_near_letter_quality',
  'enter_normal_quality',
  'enter_shadow_mode',
  'enter_subscript_mode',
  'enter_superscript_mode',
  'enter_upward_mode',
  'exit_doublewide_mode',
  'exit_italics_mode',
  'exit_leftward_mode',
  'exit_micro_mode',
  'exit_shadow_mode',
  'exit_subscript_mode',
  'exit_superscript_mode',
  'exit_upward_mode',
  'micro_column_address',
  'micro_down',
  'micro_left',
  'micro_right',
  'micro_row_address',
  'micro_up',
  'order_of_pins',
  'parm_down_micro',
  'parm_left_micro',
  'parm_right_micro',
  'parm_up_micro',
  'select_char_set',
  'set_bottom_margin',
  'set_bottom_margin_parm',
  'set_left_margin_parm',
  'set_right_margin_parm',
  'set_top_margin',
  'set_top_margin_parm',
  'start_bit_image',
  'start_char_set_def',
  'stop_bit_image',
  'stop_char_set_def',
  'subscript_characters',
  'superscript_characters',
  'these_cause_cr',
  'zero_motion',
  'char_set_names',
  'key_mouse',
  'mouse_info',
  'req_mouse_pos',
  'get_mouse',
  'set_a_foreground',
  'set_a_background',
  'pkey_plab',
  'device_type',
  'code_set_init',
  'set0_des_seq',
  'set1_des_seq',
  'set2_des_seq',
  'set3_des_seq',
  'set_lr_margin',
  'set_tb_margin',
  'bit_image_repeat',
  'bit_image_newline',
  'bit_image_carriage_return',
  'color_names',
  'define_bit_image_region',
  'end_bit_image_region',
  'set_color_band',
  'set_page_length',
  'display_pc_char',
  'enter_pc_charset_mode',
  'exit_pc_charset_mode',
  'enter_scancode_mode',
  'exit_scancode_mode',
  'pc_term_options',
  'scancode_escape',
  'alt_scancode_esc',
  'enter_horizontal_hl_mode',
  'enter_left_hl_mode',
  'enter_low_hl_mode',
  'enter_right_hl_mode',
  'enter_top_hl_mode',
  'enter_vertical_hl_mode',
  'set_a_attributes',
  'set_pglen_inch',

  // #ifdef __INTERNAL_CAPS_VISIBLE
  'termcap_init2',
  'termcap_reset',
  'linefeed_if_not_lf',
  'backspace_if_not_bs',
  'other_non_function_keys',
  'arrow_key_map',
  'acs_ulcorner',
  'acs_llcorner',
  'acs_urcorner',
  'acs_lrcorner',
  'acs_ltee',
  'acs_rtee',
  'acs_btee',
  'acs_ttee',
  'acs_hline',
  'acs_vline',
  'acs_plus',
  'memory_lock',
  'memory_unlock',
  'box_chars_1'
];

/**
 * Expose
 */

module.exports = Tput;
