var Tput = require('../lib/tput');

var tput = new Tput(process.argv[2] || 'xterm');
tput.colors();

console.log(tput.info);

tput.compile();

//tput._compile('%?%p9%t\u001b(0%e\u001b(B%;\u001b[0%?%p6%t;1%;%?%p2%t;4%;%?%p1%p3%|%t;7%;%?%p4%t;5%;%?%p7%t;8%;m');

//console.log(tput.methods.set_attributes([34]) + 'foo' + tput.methods.set_attributes([0]));
