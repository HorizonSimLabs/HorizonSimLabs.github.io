const fs = require('fs');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
for (const p of ['jp', 'my', 'nz', 'tr', 'bt', 'kp', 'dk', 'sg', 'kr']) {
  const f = root + 'scenery/' + p + '.html';
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  const idx = lines.findIndex(l => /const style = mapSeriesStyle/.test(l));
  if (idx < 0) { console.log(p, 'no style line'); continue; }
  // 找下一行的 setOption
  let j = idx + 1;
  while (j < lines.length && !/myChart\.setOption\(/.test(lines[j])) j++;
  console.log(p, 'style@' + (idx + 1), 'setOption@' + (j + 1));
  for (let k = Math.max(0, idx - 2); k < Math.min(lines.length, j + 1); k++) {
    console.log('   ', k + 1, JSON.stringify(lines[k]));
  }
}
