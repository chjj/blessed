var Tput = require('../lib/tput');

var tput = new Tput(process.argv[2] || 'xterm');
tput.colors();

console.log(tput.info);
