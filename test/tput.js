var Tput = require('../').Tput;

var termcap = ~process.argv.indexOf('--termcap')
  , term = termcap ? 'vt102' : process.argv[2] || 'xterm';

var tput = Tput({
  term: term,
  extended: true,
  debug: true,
  termcap: termcap
});

console.log('Max colors: %d.', tput.colors);

//process.stdout.write(Tput.sprintf('%-10s\n', 'hello'));

//tput._compile('%?%p9%t\u001b(0%e\u001b(B%;\u001b[0%?%p6%t;1%;%?%p2%t;4%;%?%p1%p3%|%t;7%;%?%p4%t;5%;%?%p7%t;8%;m');

//console.log(tput.setaf(4) + 'foo' + tput.sgr0());
//console.log(tput.setaf(4) + 'foo' + tput.sgr(0));

//tput.padding = true;
//tput._print('hello$<1000/>world', console.log, function() {
//  tput._print('$<1000*>foo$<1000/>bar', console.log, process.exit);
//});
