#!/usr/bin/env node

/**
 * multiplex.js
 * https://github.com/chjj/blessed
 * Copyright (c) 2013-2015, Christopher Jeffrey (MIT License)
 * A terminal multiplexer created by blessed.
 */

process.title = 'multiplex.js';

var blessed = require('blessed')
  , screen;

screen = blessed.screen({
  smartCSR: true,
  log: process.env.HOME + '/blessed-terminal.log',
  fullUnicode: true,
  dockBorders: true,
  ignoreDockContrast: true
});

var topleft = blessed.terminal({
  parent: screen,
  cursor: 'line',
  cursorBlink: true,
  screenKeys: false,
  label: ' multiplex.js ',
  left: 0,
  top: 0,
  width: '50%',
  height: '50%',
  border: 'line',
  style: {
    fg: 'default',
    bg: 'default',
    focus: {
      border: {
        fg: 'green'
      }
    }
  }
});

topleft.pty.on('data', function(data) {
  screen.log(JSON.stringify(data));
});

var topright = blessed.terminal({
  parent: screen,
  cursor: 'block',
  cursorBlink: true,
  screenKeys: false,
  label: ' multiplex.js ',
  left: '50%-1',
  top: 0,
  width: '50%+1',
  height: '50%',
  border: 'line',
  style: {
    fg: 'red',
    bg: 'black',
    focus: {
      border: {
        fg: 'green'
      }
    }
  }
});

var bottomleft = blessed.terminal({
  parent: screen,
  cursor: 'block',
  cursorBlink: true,
  screenKeys: false,
  label: ' multiplex.js ',
  left: 0,
  top: '50%-1',
  width: '50%',
  height: '50%+1',
  border: 'line',
  style: {
    fg: 'default',
    bg: 'default',
    focus: {
      border: {
        fg: 'green'
      }
    }
  }
});

var bottomright = blessed.terminal({
  parent: screen,
  cursor: 'block',
  cursorBlink: true,
  screenKeys: false,
  label: ' multiplex.js ',
  left: '50%-1',
  top: '50%-1',
  width: '50%+1',
  height: '50%+1',
  border: 'line',
  style: {
    fg: 'default',
    bg: 'default',
    focus: {
      border: {
        fg: 'green'
      }
    }
  }
});

[topleft, topright, bottomleft, bottomright].forEach(function(term) {
  term.enableDrag(function(mouse) {
    return !!mouse.ctrl;
  });
  term.on('title', function(title) {
    screen.title = title;
    term.setLabel(' ' + title + ' ');
    screen.render();
  });
  term.on('click', term.focus.bind(term));
});

topleft.focus();

screen.key('C-q', function() {
  topleft.kill();
  topright.kill();
  bottomleft.kill();
  bottomright.kill();
  return screen.destroy();
});

screen.program.key('S-tab', function() {
  screen.focusNext();
  screen.render();
});

screen.render();
