/**
 * Tput for node.js
 * Copyright (c) 2013, Christopher Jeffrey (MIT License)
 * https://github.com/chjj/blessed
 */

// Compile xterm terminfo/termcap:
// $ tic -a -I -1 usr/xterm.terminfo
// $ tic -a -C -U usr/xterm.termcap

// Compile xterm terminfo/termcap:
// $ tic -a -1 usr/xterm.terminfo
// $ tic -a -1 usr/xterm.terminfo && ls ~/.terminfo
// $ tic -a -1 -o usr usr/xterm.terminfo && mv usr/x/xterm usr/ && rm -rf usr/v usr/x
// $ tic -a -1 -o usr usr/xterm.terminfo && mv usr/x/xterm-256color usr/ && rm -rf usr/v usr/x

// Check tput output:
// $ node test/tput.js xterm | tee out
// $ node test/tput.js xterm --ifile usr/xterm | tee out
// $ node test/tput.js xterm-256color --ifile usr/xterm-256color | tee out
// $ node test/tput.js vt102 --termcap | tee out
// $ node test/tput.js xterm --termcap --cfile usr/xterm.termcap | tee out
// $ node test/tput.js xterm --iprefix ~/.terminfo | tee out
// $ node test/tput.js xterm-256color --ifile ~/.terminfo/x/xterm-256color | tee out
// $ cdiff test/terminfo out

var blessed = require('../');

// Simple argument parser
// Copyright (c) 2012, Christopher Jeffrey (MIT License)

function parseArg() {
  var argv = process.argv.slice(2)
    , options = [];

  function getarg() {
    var arg = argv.shift();

    if (arg.indexOf('--') === 0) {
      // e.g. --opt
      arg = arg.split('=');
      if (arg.length > 1) {
        // e.g. --opt=val
        argv.unshift(arg.slice(1).join('='));
      }
      arg = arg[0];
    } else if (arg[0] === '-') {
      if (arg.length > 2) {
        // e.g. -abc
        argv = arg.substring(1).split('').map(function(ch) {
          return '-' + ch;
        }).concat(argv);
        arg = argv.shift();
      } else {
        // e.g. -a
      }
    } else {
      // e.g. foo
    }

    return arg;
  }

  while (argv.length) {
    arg = getarg();
    if (arg.indexOf('-') === 0) {
      arg = arg.replace(/^--?/, '');
      if (argv[0] && argv[0].indexOf('-') !== 0) {
        options[arg] = argv.shift();
      } else {
        options[arg] = true;
      }
    } else {
      options.push(arg);
    }
  }

  return options;
}

var argv = parseArg();

var tput = blessed.tput({
  terminal: argv[0] !== 'all' && argv[0] !== 'rand'
    ? argv[0] || __dirname + '/../usr/xterm'
    : null,
  extended: true,
  debug: true,
  termcap: argv.termcap,
  terminfoFile: argv.i || argv.ifile,
  terminfoPrefix: argv.p || argv.iprefix,
  termcapFile: argv.c || argv.cfile
});

if (argv[0] === 'all') {
  var rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  var text = '\x1b[31mWARNING:\x1b[m '
    + 'This will compile every single terminfo file on your disk.\n'
    + 'It will probably use a lot of CPU.\n'
    + 'Do you wish to proceed? (Y/n) ';

  rl.question(text, function(result) {
    result = result.trim().toLowerCase();
    if (result !== 'y') return process.exit(0);
    console.log('\x1b[32m(You bet your ass I wish to proceed.)\x1b[m');
    blessed.tput.print(
      '$<1000/>.$<1000/>.$<1000/>.$<100/>Let\'s go...',
      process.stdout.write.bind(process.stdout),
      function() {
        tput.compileAll(argv[1]);
        process.exit(0);
      }
    );
  });

  return;
}

if (argv[0] === 'rand') {
  var terms = tput.getAll()
    , term;

  term = terms[(terms.length - 1) * Math.random() | 0];

  console.log('Compiling ' + term + '...');
  tput.compileTerminfo(term);
  console.log('Compiled ' + term + '.');

  return;
}

// console.log('Max colors: %d.', tput.colors);

// console.log(tput.strings.acs_chars.split('').map(function(ch) { return ch.charCodeAt(0); }));
// console.log(JSON.stringify(tput.strings.acs_chars));

// process.stdout.write(blessed.tput.sprintf('%-10s\n', 'hello'));

// tput._compile({ name: 'xterm' }, 'set_attributes',
//   '%?%p9%t\u001b(0%e\u001b(B%;\u001b[0%?%p6%t;1%;%?%p2%t;4%;%?%p1%p3%|%t;7%;%?%p4%t;5%;%?%p7%t;8%;m');

// console.log(tput.setaf(4) + 'foo' + tput.sgr0());
// console.log(tput.setaf(4) + 'foo' + tput.sgr(0));

// tput.padding = true;
// tput._print('hello$<1000/>world', console.log, function() {
//   tput._print('$<1000/>foo$<1000/>bar', console.log, process.exit);
// });
