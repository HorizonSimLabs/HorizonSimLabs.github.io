// 把 `const style = mapSeriesStyle(...)` 与随后的 myChart.setOption 的缩进整理成 8/10 空格
const fs = require('fs');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
for (const p of ['au', 'jp', 'kr', 'my', 'nz', 'tr', 'bt', 'kp', 'dk', 'sg']) {
  const f = root + 'scenery/' + p + '.html';
  const raw = fs.readFileSync(f, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const lines = raw.split(/\r?\n/);
  const si = lines.findIndex(l => /const style = mapSeriesStyle/.test(l));
  let j = si + 1;
  while (j < lines.length && !/myChart\.setOption\(\{/.test(lines[j])) j++;
  // 找到该 setOption 的结束行：缩进为 8 的 `});`
  let k = j + 1;
  while (k < lines.length && !/^ {8}\}\);\s*$/.test(lines[k])) k++;
  const setOpt = lines.slice(j, k + 1).map((l, idx) => {
    if (!l.trim()) return '';
    const add = idx === 0 ? 2 : 4; // setOption 自身比 style 多 2，内部再多 2
    return ' '.repeat(add) + l;
  });
  // 修正：setOption 首行应为 8 空格，其属性 10 空格
  const setOptFixed = [ '        ' + lines[j].trim() ].concat(
    lines.slice(j + 1, k + 1).map(l => {
      if (!l.trim()) return '';
      if (/^ {8}\}\);\s*$/.test(l)) return '        });';
      return '  ' + l;
    })
  );
  const newBlock = ['        ' + lines[si].trim(), '', ...setOptFixed];
  lines.splice(si, k - si + 1, ...newBlock);
  fs.writeFileSync(f, lines.join(eol), 'utf8');
  console.log(p, 'style@' + (si + 1), 'setOptionBlock ' + (j + 1) + '-' + (k + 1));
}
