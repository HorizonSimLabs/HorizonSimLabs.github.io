// 列出形如 ... } } }); 的 mapData.push 行，供人工核对
const fs = require('fs');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
for (const p of ['bt', 'dk', 'kp', 'kr', 'sg', 'au', 'jp', 'my', 'nz', 'tr']) {
  const lines = fs.readFileSync(root + 'scenery/' + p + '.html', 'utf8').split(/\r?\n/);
  lines.forEach((l, i) => { if (/mapData\.push/.test(l)) console.log(p + ':' + (i + 1) + '  ' + l.trim()); });
}
