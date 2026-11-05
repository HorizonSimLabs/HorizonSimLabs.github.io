// 统一 setOption 块缩进为：setOption 8 空格，属性 10 空格，series 内部 +2 递增
const fs = require('fs');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
for (const p of ['au', 'jp', 'kr', 'my', 'nz', 'tr', 'bt', 'kp', 'dk', 'sg']) {
  const f = root + 'scenery/' + p + '.html';
  const raw = fs.readFileSync(f, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const lines = raw.split(/\r?\n/);
  const si = lines.findIndex(l => /const style = mapSeriesStyle/.test(l));
  const ji = lines.findIndex((l, i) => i > si && /myChart\.setOption\(\{/.test(l));
  lines[ji] = '        myChart.setOption({';
  let k = ji + 1;
  while (k < lines.length && !/^\s*\}\);\s*$/.test(lines[k])) {
    // 第一层（在 setOption 之下的属性行）统一 10 空格；更深层按原有相对深度保留
    const m = lines[k].match(/^(\s*)(.*)$/);
    if (m[2]) {
      const depth = Math.floor((m[1].length - 14) / 2); // 相对 12 的层级
      const want = 10 + Math.max(0, depth) * 2;
      lines[k] = ' '.repeat(want) + m[2];
    }
    k++;
  }
  lines[k] = '        });';
  fs.writeFileSync(f, lines.join(eol), 'utf8');
}
console.log('done');
