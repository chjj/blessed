var blessed = require('../')
  , screen;

screen = blessed.screen({
  dump: __dirname + '/logs/form.log'
});

var form = blessed.form({
  parent: screen,
  mouse: true,
  keys: true,
  vi: true,
  left: 0,
  top: 0,
  width: '100%',
  //height: 12,
  style: {
    bg: 'green',
    // border: {
    //   inverse: true
    // },
    scrollbar: {
      inverse: true
    }
  },
  content: 'foobar',
  scrollable: true,
  // border: {
  //   type: 'ch',
  //   ch: ' '
  // },
  scrollbar: {
    ch: ' '
  }
  //alwaysScroll: true
});

form.on('submit', function(data) {
  output.setContent(JSON.stringify(data, null, 2));
  screen.render();
});

form.key('d', function() {
  form.scroll(1, true);
  screen.render();
});

form.key('u', function() {
  form.scroll(-1, true);
  screen.render();
});

var set = blessed.radioset({
  parent: form,
  left: 1,
  top: 1,
  shrink: true,
  //padding: 1,
  //content: 'f',
  style: {
    bg: 'magenta'
  }
});

var radio1 = blessed.radiobutton({
  parent: set,
  mouse: true,
  keys: true,
  shrink: true,
  style: {
    bg: 'magenta'
  },
  height: 1,
  left: 0,
  top: 0,
  name: 'radio1',
  content: 'radio1'
});

var radio2 = blessed.radiobutton({
  parent: set,
  mouse: true,
  keys: true,
  shrink: true,
  style: {
    bg: 'magenta'
  },
  height: 1,
  left: 15,
  top: 0,
  name: 'radio2',
  content: 'radio2'
});

var text = blessed.textbox({
  parent: form,
  mouse: true,
  keys: true,
  style: {
    bg: 'blue'
  },
  height: 1,
  width: 20,
  left: 1,
  top: 3,
  name: 'text'
});

text.on('focus', function() {
  text.readInput();
});

var check = blessed.checkbox({
  parent: form,
  mouse: true,
  keys: true,
  shrink: true,
  style: {
    bg: 'magenta'
  },
  height: 1,
  left: 28,
  top: 1,
  name: 'check',
  content: 'check'
});

var check2 = blessed.checkbox({
  parent: form,
  mouse: true,
  keys: true,
  shrink: true,
  style: {
    bg: 'magenta'
  },
  height: 1,
  left: 28,
  top: 14,
  name: 'foooooooo2',
  content: 'foooooooo2'
});

var submit = blessed.button({
  parent: form,
  mouse: true,
  keys: true,
  shrink: true,
  padding: {
    left: 1,
    right: 1
  },
  left: 29,
  top: 3,
  shrink: true,
  name: 'submit',
  content: 'submit',
  style: {
    bg: 'blue',
    focus: {
      bg: 'red'
    }
  }
});

submit.on('press', function() {
  form.submit();
});

var box1 = blessed.box({
  parent: form,
  left: 1,
  top: 10,
  height: 10,
  width: 10,
  content: 'one',
  style: {
    bg: 'cyan'
  }
});

var box2 = blessed.box({
  parent: box1,
  left: 1,
  top: 2,
  height: 8,
  width: 9,
  content: 'two',
  style: {
    bg: 'magenta'
  }
});

var box3 = blessed.box({
  parent: box2,
  left: 1,
  top: 2,
  height: 6,
  width: 8,
  content: 'three',
  style: {
    bg: 'yellow'
  }
});

var box4 = blessed.box({
  parent: box3,
  left: 1,
  top: 2,
  height: 4,
  width: 7,
  content: 'four',
  style: {
    bg: 'blue'
  }
});

var output = blessed.scrollabletext({
  parent: form,
  mouse: true,
  keys: true,
  left: 0,
  top: 20,
  height: 5,
  left: 0,
  right: 0,
  style: {
    bg: 'red'
  },
  content: 'foobar'
});

var bottom = blessed.line({
  parent: form,
  type: 'line',
  orientation: 'horizontal',
  left: 0,
  right: 0,
  top: 50,
  style: {
    fg: 'blue'
  }
});

screen.key('q', function() {
  return process.exit(0);
});

form.focus();

form.submit();

screen.render();
