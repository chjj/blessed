var blessed = require('../')
  , screen = blessed.screen({ dump: __dirname + '/form.log' });

var form = blessed.form({
  parent: screen,
  mouse: true,
  keys: true,
  vi: true,
  left: 0,
  top: 0,
  width: '100%',
  height: 12,
  bg: 'green',
  content: 'foobar',
  border: {
    type: 'ch',
    ch: ' ',
    style: { inverse: true }
  },
  scrollbar: {
    ch: ' ',
    inverse: true
  }
  //alwaysScroll: true
});

form.on('submit', function(data) {
  output.setContent(JSON.stringify(data, null, 2));
  screen.render();
});

form.key('d', function() {
  form.scroll(1);
  screen.render();
});

form.key('u', function() {
  form.scroll(-1);
  screen.render();
});

var set = blessed.radioset({
  parent: form,
  left: 1,
  top: 1,
  shrink: true,
  //padding: 1,
  //content: 'f',
  bg: 'magenta'
});

var radio1 = blessed.radiobutton({
  parent: set,
  mouse: true,
  keys: true,
  shrink: true,
  bg: 'magenta',
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
  bg: 'magenta',
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
  bg: 'blue',
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
  bg: 'magenta',
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
  bg: 'magenta',
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

var output = blessed.scrollabletext({
  parent: screen,
  mouse: true,
  keys: true,
  left: 0,
  top: 12,
  width: '100%',
  bg: 'red',
  content: 'foobar'
});

screen.key('q', function() {
  return process.exit(0);
});

form.focus();

form.submit();

screen.render();
