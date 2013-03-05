/**
 * Tput for node.js
 * Copyright (c) 2013, Christopher Jeffrey (MIT License)
 * https://github.com/chjj/blessed
 */

// $ node test/tput.js | tee out
// $ node test/tput.js vt102 --termcap | tee out
// $ node test/tput.js --cfile usr/xterm.termcap | tee out
// $ node test/tput.js --iprefix ~/.terminfo | tee out
// $ node test/tput.js xterm-256color --ifile ~/.terminfo/x/xterm-256color | tee out
// $ cdiff test/terminfo out

var Tput = require('../').Tput;

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

var tput = Tput({
  term: argv[0] || 'xterm',
  extended: true,
  debug: true,
  termcap: argv.termcap || !!argv.cfile || !!argv.c,
  terminfoFile: argv.i || argv.ifile,
  terminfoPrefix: argv.p || argv.iprefix,
  termcapFile: argv.c || argv.cfile
});

console.log('Max colors: %d.', tput.colors);

// process.stdout.write(Tput.sprintf('%-10s\n', 'hello'));

// tput._compile('%?%p9%t\u001b(0%e\u001b(B%;\u001b[0%?%p6%t;1%;%?%p2%t;4%;%?%p1%p3%|%t;7%;%?%p4%t;5%;%?%p7%t;8%;m');

// console.log(tput.setaf(4) + 'foo' + tput.sgr0());
// console.log(tput.setaf(4) + 'foo' + tput.sgr(0));

// tput.padding = true;
// tput._print('hello$<1000/>world', console.log, function() {
//   tput._print('$<1000*>foo$<1000/>bar', console.log, process.exit);
// });
