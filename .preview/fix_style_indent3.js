// 把「多缩进了一层」的 setOption 块（首行 10 空格、结束 10 空格 });）整体左移 4 空格
const fs = require('fs');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
for (const p of ['au', 'jp', 'kr', 'my', 'nz', 'tr', 'bt', 'kp', 'dk', 'sg']) {
  const f = root + 'scenery/' + p + '.html';
  const raw = fs.readFileSync(f, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const lines = raw.split(/\r?\n/);
  const si = lines.findIndex(l => /const style = mapSeriesStyle/.test(l));
  const ji = lines.findIndex((l, i) => i > si && /myChart\.setOption\(\{/.test(l));
  let k = ji + 1;
  while (k < lines.length && !/^\s*\}\);\s*$/.test(lines[k])) k++;
  // 判断统一缩进：取首行与结束行的空格数
  const indOpen = lines[ji].match(/^\s*/)[0].length;
  const indClose = lines[k].match(/^\s*/)[0].length;
  console.log(p, 'style', lines[si].match(/^\s*/)[0].length, 'open', indOpen, 'close', indClose);
  const shift = indClose - indOpen; // 内部应该比 open 多 2
  for (let t = ji; t <= k; t++) {
    if (t === k) { lines[t] = '        });'; continue; }
    const m = lines[t].match(/^(\s*)(.*)$/);
    if (!m[2]) continue;
    const want = 8 + (m[1].length - indOpen);
    lines[t] = ' '.repeat(want) + m[2];
  }
  fs.writeFileSync(f, lines.join(eol), 'utf8');
}
