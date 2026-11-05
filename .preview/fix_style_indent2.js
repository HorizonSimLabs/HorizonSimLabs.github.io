// 精确整理：style 8 空格，setOption 8 空格，其内部相对缩进 +2
const fs = require('fs');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
for (const p of ['au', 'jp', 'kr', 'my', 'nz', 'tr', 'bt', 'kp', 'dk', 'sg']) {
  const f = root + 'scenery/' + p + '.html';
  const raw = fs.readFileSync(f, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const lines = raw.split(/\r?\n/);
  const si = lines.findIndex(l => /const style = mapSeriesStyle/.test(l));
  if (si < 0) { console.log(p, 'no style'); continue; }
  let j = si + 1;
  while (j < lines.length && !/^\s*myChart\.setOption\(\{/.test(lines[j])) j++;
  let k = j + 1;
  while (k < lines.length && !/^\s{8}\}\);/.test(lines[k])) k++;
  const base = lines[j].match(/^\s*/)[0];
  const block = [lines[j]];
  for (let t = j + 1; t <= k; t++) {
    if (!lines[t].trim()) { block.push(''); continue; }
    if (lines[t].startsWith(base)) block.push('  ' + lines[t]);
    else block.push(lines[t]);
  }
  const out = ['        ' + lines[si].trim(), '', '        ' + block[0].trim(), ...block.slice(1)];
  lines.splice(si, k - si + 1, ...out);
  fs.writeFileSync(f, lines.join(eol), 'utf8');
  console.log(p, 'base=' + JSON.stringify(base), 'range', si + 1, k + 1);
}
