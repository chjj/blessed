#!/usr/bin/env node

var blessed = require('../')
  , argv = process.argv.slice(2)
  , cmd = argv.shift()
  , tput;

tput = blessed.tput({
  terminal: process.env.TERM,
  termcap: !!process.env.USE_TERMCAP,
  extended: true
});

if (tput[cmd]) {
  process.stdout.write(tput[cmd].apply(tput, argv));
}
