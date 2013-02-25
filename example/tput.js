var Tput = require('../').Tput;

var tput = Tput({
  term: process.argv[2] || 'xterm',
  extended: !!~process.argv.indexOf('--extended'),
  debug: true
});

console.log('Max colors: %d.', tput.max_colors);

//process.stdout.write(Tput.sprintf('%-10s\n', 'hello'));

//console.log(tput.info);

//tput.compile();

//tput._compile('%?%p9%t\u001b(0%e\u001b(B%;\u001b[0%?%p6%t;1%;%?%p2%t;4%;%?%p1%p3%|%t;7%;%?%p4%t;5%;%?%p7%t;8%;m');

//console.log(tput.methods.set_foreground([4]) + 'foo' + tput.methods.set_attributes([0]));
//console.log(tput.set_foreground(4) + 'foo' + tput.set_attributes(0));
//console.log(tput.setaf(4) + 'foo' + tput.sgr0());
//console.log(tput.setaf(4) + 'foo' + tput.sgr(0));

//tput.readTermcap();
//console.log(tput.termcap.terms);

//tput.padding = true;
//tput._parsePadding('hello$<1000/>world', console.log, function() {
//  tput._parsePadding('$<1000*>foo$<1000/>bar', console.log, process.exit);
//});
