var blessed = require('blessed')
  , screen = blessed.screen();

var form = blessed.form({
  parent: screen,
  mouse: true,
  keys: true,
  vi: true,
  left: 0,
  top: 0,
  width: '100%',
  height: 5,
  bg: 'green',
  content: 'foobar'
});

form.on('submit', function(data) {
  output.setContent(JSON.stringify(data, null, 2));
  screen.render();
});

var set = blessed.radioset({
  parent: form,
  left: 0,
  top: 0,
  shrinkBox: true,
  height: 1,
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
  top: 1,
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
  left: 24,
  top: 1,
  name: 'check',
  content: 'check'
});

var submit = blessed.button({
  parent: form,
  mouse: true,
  keys: true,
  height: 1,
  left: 30,
  top: 0,
  shrink: true,
  bg: 'blue',
  name: 'submit',
  content: 'submit',
  focusEffects: {
    bg: 'red'
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
  top: 5,
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
