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
var path = require('path');
var blessed = require('blessed');
var telnet = require('telnet');

var server = telnet.createServer(function(client) {
  client.do.transmit_binary();
  client.do.terminal_type();
  client.do.window_size();
  client.do.environment_variables();

  client.on('debug', function(msg) {
    console.error(msg);
  });

  client.on('environment variables', function(data) {
    if (data.command === 'sb') {
      if (data.name === 'TERM') {
        screen.terminal = data.value;
      } else {
        // Clear the screen since they may have used `env send [var]`.
        screen.realloc();
      }
      screen.render();
    }
  });

  client.on('terminal type', function(data) {
    if (data.command === 'sb' && data.name) {
      screen.terminal = data.name;
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
    terminal: 'xterm-256color',
    fullUnicode: true
  });

  client.on('close', function() {
    if (!screen.destroyed) {
      screen.destroy();
    }
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

  screen.key(['C-c', 'q'], function(ch, key) {
    screen.destroy();
  });

  screen.render();
}

var test = process.argv[2] || path.resolve(__dirname, '../test/widget-shadow.js');
if (~test.indexOf('widget-png.js')) process.argv.length = 2;
test = path.resolve(process.cwd(), test);

function loadTest(screen, name) {
  var Screen = blessed.screen;
  blessed.screen = function() { return screen; };
  var path = require.resolve(name);
  delete require.cache[path];
  require(name);
  blessed.screen = Screen;
}

server.listen(2300);
console.log('Listening on 2300...');
