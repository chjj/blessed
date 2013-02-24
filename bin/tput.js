#!/usr/bin/env node

var tput = require('../lib/tput')(process.env.TERM || 'xterm')
  , argv = process.argv.slice(2)
  , cmd = argv.shift();

if (tput[cmd]) {
  process.stdout.write(tput[cmd].apply(tput, argv) + '\n');
}
