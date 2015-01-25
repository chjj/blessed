#!/usr/bin/env node

/**
 * multiplex.js
 * https://github.com/chjj/blessed
 * Copyright (c) 2013-2015, Christopher Jeffrey (MIT License)
 * A terminal multiplexer created by blessed.
 */

process.title = 'multiplex.js';

var blessed = require('blessed')
  , pty = require('pty.js');

var screen = blessed.screen();

var terminals = [];

var pty0 = pty.fork('bash', [], {
  name: process.env.TERM,
  cols: process.stdout.columns,
  rows: process.stdout.rows,
  cwd: process.env.HOME,
  env: process.env
});

terminals[0] = blessed.terminal({
  parent: screen,
  //mouse: true,
  left: 0,
  top: 2,
  bottom: 2,
  width: '40%',
  border: 'line',
  handler: function(data) {
    pty0.write(data);
    screen.render();
  }
});

pty0.on('data', function(data) {
  terminals[0].write(data);
  //terminals[0].scrollTo(terminals[0]._scrollBottom());
  screen.render();
});

var pty1 = pty.fork('bash', [], {
  name: process.env.TERM,
  cols: process.stdout.columns,
  rows: process.stdout.rows,
  cwd: process.env.HOME,
  env: process.env
});

terminals[1] = blessed.terminal({
  parent: screen,
  //mouse: true,
  right: 2,
  top: 2,
  bottom: 2,
  width: '40%',
  border: 'line',
  handler: function(data) {
    pty1.write(data);
    screen.render();
  }
});

pty1.on('data', function(data) {
  terminals[1].write(data);
  //terminals[1].scrollTo(terminals[1]._scrollBottom());
  screen.render();
});

terminals[0].focus();

screen.on('keypress', function() {
  screen.render();
});

screen.key('C-c', function() {
  process.exit(0);
});

screen.render();
