var blessed = require('blessed');
var screen = blessed.screen({
  autoPadding: true
});

var tab = blessed.box({
  parent: screen,
  top: 2,
  left: 0,
  right: 0,
  bottom: 0,
  scrollable: true,
  keys: true,
  vi: true,
  alwaysScroll: true,
  scrollbar: {
    ch: ' '
  },
  style: {
    scrollbar: {
      inverse: true
    }
  }
});

var form = blessed.box({
  parent: tab,
  top: 0,
  left: 1,
  right: 1,
  //height: 9,
  keys: true,
  mouse: true,
  // XXX Problem:
  height: 'shrink',
  label: ' {blue-fg}Form{/blue-fg} ',
  border: 'line',
  tags: true
});

form._.ftext = blessed.text({
  parent: form,
  top: 0,
  left: 0,
  height: 1,
  content: 'Foo',
  tags: true
});

form._.foo = blessed.textbox({
  parent: form,
  name: 'foo',
  inputOnFocus: true,
  top: 0,
  left: 9,
  right: 1,
  height: 1,
  style: {
    bg: 'black',
    focus: {
      bg: 'blue'
    },
    hover: {
      bg: 'blue'
    }
  }
});

form._.btext = blessed.text({
  parent: form,
  top: 2,
  left: 0,
  height: 1,
  content: 'Bar',
  tags: true
});

form._.bar = blessed.textbox({
  parent: form,
  name: 'bar',
  inputOnFocus: true,
  top: 2,
  left: 9,
  right: 1,
  height: 1,
  style: {
    bg: 'black',
    focus: {
      bg: 'blue'
    },
    hover: {
      bg: 'blue'
    }
  }
});

form._.ztext = blessed.text({
  parent: form,
  top: 4,
  left: 0,
  height: 1,
  content: 'Baz',
  tags: true
});

form._.baz = blessed.textbox({
  parent: form,
  name: 'baz',
  inputOnFocus: true,
  top: 4,
  left: 9,
  right: 1,
  height: 1,
  style: {
    bg: 'black',
    focus: {
      bg: 'blue'
    },
    hover: {
      bg: 'blue'
    }
  }
});

form._.submit = blessed.button({
  parent: form,
  name: 'submit',
  top: 6,
  right: 1,
  height: 1,
  //width: 'shrink',
  width: 10,
  content: 'send',
  tags: true,
  style: {
    bg: 'black',
    focus: {
      bg: 'blue'
    },
    hover: {
      bg: 'blue'
    }
  }
});

form._.submit.on('press', function() {
  tabs.send._.form.submit();
});

form.on('submit', function(data) {
  screen.leave();
  console.log(data);
  process.exit(0);
});

screen.key('q', function() {
  process.exit(0);
});

screen.render();
