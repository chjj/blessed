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
var telnet = require('telnet2');

var server = telnet({ tty: true }, function(client) {
  client.on('debug', function(msg) {
    console.error(msg);
  });

  client.on('term', function(terminal) {
    screen.terminal = terminal;
    screen.render();
  });

  client.on('size', function(width, height) {
    client.columns = width;
    client.rows = height;
    client.emit('resize');
  });

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
