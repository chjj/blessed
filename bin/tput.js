#!/usr/bin/env node

var blessed = require('../')
  , tput = blessed.tput()
  , argv = process.argv.slice(2)
  , cmd = argv.shift();

if (tput[cmd]) {
  process.stdout.write(tput[cmd].apply(tput, argv) + '\n');
}
