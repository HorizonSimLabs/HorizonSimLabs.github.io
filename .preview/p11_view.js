const fs = require('fs');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
for (const p of ['jp', 'my', 'nz', 'tr', 'bt', 'kp', 'dk', 'sg', 'kr']) {
  const f = root + 'scenery/' + p + '.html';
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  const idx = lines.findIndex(l => /const style = mapSeriesStyle/.test(l));
  console.log('===== ' + p + ' =====');
  for (let k = idx + 1; k < Math.min(lines.length, idx + 20); k++) {
    if (/^\s*\}\);\s*$/.test(lines[k])) { console.log('   end@' + (k + 1) + ' ' + lines[k]); break; }
  }
  for (let k = idx; k < Math.min(lines.length, idx + 16); k++) console.log('  ', k + 1, lines[k]);
}
