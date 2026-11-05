// 输出 backup 里若干区段的原文，便于人工核对
const fs = require('fs');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
const page = process.argv[2];
const from = parseInt(process.argv[3], 10), to = parseInt(process.argv[4], 10);
const lines = fs.readFileSync(root + '.preview/scenery_backup/' + page + '.html', 'utf8').split(/\r?\n/);
for (let i = from - 1; i < Math.min(to, lines.length); i++) console.log((i + 1) + ': ' + lines[i]);
