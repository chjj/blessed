var blessed = require('../')
  , screen;

screen = blessed.screen({
  dump: __dirname + '/logs/image.log',
  smartCSR: true
});

// To ensure our w3mimgdisplay search works:
if (process.argv[2] === 'find') {
  blessed.image.w3mdisplay = '/does/not/exist';
  process.argv.length = 2;
}

var file = process.argv[2] || __dirname + '/test-image.png';

var image = blessed.image({
  parent: screen,
  left: 'center',
  top: 'center',
  width: 'shrink',
  height: 'shrink',
  style: {
    bg: 'green'
  }
});

setTimeout(function() {
  image.setImage(file, function() {
    // XXX For some reason the image sometimes envelopes
    // the entire screen at the end if this is uncommented:
    // NOTE: Might have to do with an uncached ratio and
    // a bad termSize being reported.
    screen.render();
    setTimeout(function() {
      image.rtop = 4;
      image.rleft = 10;
      screen.render();
      setTimeout(function() {
        image.rtop = 2;
        image.rleft = 7;
        screen.render();
        setTimeout(function() {
          image.detach();
          screen.render();
          setTimeout(function() {
            screen.append(image);
            screen.render();
          }, 1000);
        }, 1000);
      }, 1000);
    }, 5000);
  });
}, 1000);

image.focus();

screen.key('i', function() {
  screen.displayImage(file);
});

screen.key('q', function() {
  return process.exit(0);
});

screen.render();
