#!/usr/bin/env node

/**
 * blessed-telnet.js
 * https://github.com/chjj/blessed
 * Copyright (c) 2013-2015, Christopher Jeffrey (MIT License)
 * A blessed telnet server.
 * See: https://github.com/TooTallNate/node-telnet
 */

process.title = 'blessed-telnet';

var fs = require('fs');
var blessed = require('blessed');
var telnet = require('telnet');

var server = telnet.createServer(function(client) {
  client.do.transmit_binary();
  client.do.terminal_type();
  client.do.window_size();

  client.on('terminal type', function(data) {
    // https://tools.ietf.org/html/rfc884
    if (data.command === 'sb' && data.buf[3] === 1) {
      var TERM = data.buf.slice(4, -2).toString('ascii');
      screen.program.terminal = TERM;
      screen.program.tput.terminal = TERM;
      screen.program.tput.setup();
      screen.render();
    }
  });

  client.on('window size', function(data) {
    if (data.command === 'sb') {
      client.columns = data.columns;
      client.rows = data.rows;
      client.emit('resize');
    }
  });

  // Make the client look like a tty:
  client.setRawMode = function(mode) {
    client.isRaw = mode;
    if (!client.writable) return;
    if (mode) {
      client.do.suppress_go_ahead();
      client.will.suppress_go_ahead();
      client.will.echo();
    } else {
      client.dont.suppress_go_ahead();
      client.wont.suppress_go_ahead();
      client.wont.echo();
    }
  };
  client.isTTY = true;
  client.isRaw = false;
  client.columns = 80;
  client.rows = 24;

  var screen = blessed.screen({
    smartCSR: true,
    input: client,
    output: client,
    term: 'xterm-256color'
  });

  client.on('close', function() {
    if (!screen.destroyed) {
      screen.destroy();
    }
  });

  screen.key(['C-c', 'q'], function(ch, key) {
    screen.destroy();
  });

  screen.on('destroy', function() {
    if (client.writable) {
      client.destroy();
    }
  });

  if (test === 'widget-simple') {
    return simpleTest(screen);
  }

  loadTest(screen, test);
});

function simpleTest(screen) {
  screen.data.main = blessed.box({
    parent: screen,
    width: '80%',
    height: '90%',
    border: 'line',
    content: 'Welcome to my server. Here is your own private session.',
    style: {
      bg: 'red'
    }
  });

  screen.key('i', function() {
    screen.data.main.style.bg = 'blue';
    screen.render();
  });

  screen.render();
}

var test = 'widget-' + (process.argv[2] || 'shadow');
if (test === 'widget-png') process.argv.length = 2;

function loadTest(screen, name) {
  var Screen = blessed.screen;
  var key = screen.key;
  blessed.screen = function() { return screen; };
  screen.key = function(keys) {
    keys = [].concat(keys)
    if (~keys.indexOf('q') || ~keys.indexOf('C-c') || ~keys.indexOf('escape')) {
      return;
    }
    return key.apply(screen, arguments);
  };
  var path = require.resolve('../test/' + name);
  delete require.cache[path];
  require('../test/' + name);
  blessed.screen = Screen;
  screen.key = key;
}

server.listen(2300);
console.log('Listening on 2300...');
