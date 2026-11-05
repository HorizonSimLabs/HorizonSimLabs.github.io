const fs = require('fs');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
const lines = fs.readFileSync(root + 'scenery/bt.html', 'utf8').split(/\r?\n/);
for (let i = 0; i < 80; i++) console.log((i + 1) + ': ' + lines[i]);
