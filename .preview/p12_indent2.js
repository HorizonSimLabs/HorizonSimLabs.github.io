const fs = require('fs');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
for (const p of ['jp', 'my', 'nz', 'tr', 'bt', 'kp', 'dk', 'sg', 'kr']) {
  const f = root + 'scenery/' + p + '.html';
  let s = fs.readFileSync(f, 'utf8');
  const before = s;
  s = s.replace(/^(\s*)myChart\.setOption\(\{/m, '$1myChart.setOption({');
  // 从 setOption 起，把到该次调用结尾的 '});' 前的内容整体右移 4 空格：
  // 简化做法：只修正以 2 空格开头的属性行
  const lines = s.split('\n');
  const idx = lines.findIndex(l => /^\s*myChart\.setOption\(\{/.test(l));
  const base = lines[idx].match(/^\s*/)[0].length; // 应为 8
  if (base !== 8) console.log(p, 'WARN base indent', base);
  let i = idx + 1;
  const want = base + 2;
  while (i < lines.length && !new RegExp('^\\s{' + base + '\\}\\);').test(lines[i])) i++;
  for (let k = idx + 1; k < i; k++) {
    const m = lines[k].match(/^(\s*)(.*)$/);
    if (!m[2]) continue;
    const cur = m[1].length;
    if (cur < want) lines[k] = ' '.repeat(cur + (want - cur)) + m[2];
  }
  s = lines.join('\n');
  fs.writeFileSync(f, s, 'utf8');
  console.log(p, before === s ? 'unchanged' : 'fixed');
}
