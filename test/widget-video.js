var blessed = require('../');
var fs = require('fs');

var screen = blessed.screen({
  tput: true,
  smartCSR: true,
  dump: __dirname + '/logs/video.log'
});

var video = blessed.video({
  parent: screen,
  left: 1,
  top: 1,
  width: '90%',
  height: '90%',
  border: 'line',
  file: process.argv[2]
});

video.focus();

screen.render();

screen.key(['q', 'C-q', 'C-c'], function() {
  process.exit(0);
});
