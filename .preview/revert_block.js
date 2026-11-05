// 回填：把 backup（改UI前）中带有非 UI 逻辑的整块换回当前页
const fs = require('fs');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
const page = process.argv[2];
const curF = root + 'scenery/' + page + '.html';
let s = fs.readFileSync(curF, 'utf8');
const raw = fs.readFileSync(root + '.preview/scenery_backup/' + page + '.html', 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';
const L = l => l.join(eol);
let report = [];

function sub(label, from, to) {
  if (!from) { report.push(label + ': 找不到原块'); return false; }
  if (!s.includes(from)) { report.push(label + ': 当前页找不到匹配块'); return false; }
  s = s.replace(from, () => to);
  report.push(label + ': ok');
  return true;
}

// 1) 主题重绘块
{
  const re = /\r?\n[ \t]*\/\/ 深浅主题切换后重绘地图（配色取自主题变量）\r?\n[ \t]*if \(window\.HSLTheme && HSLTheme\.onChange\) \{\r?\n[ \t]*HSLTheme\.onChange\(\(\) => setTimeout\(\(\) => \{ if \(myChart\) renderMap\(\); \}, 30\)\);\r?\n[ \t]*\}\r?\n/;
  if (re.test(s)) { s = s.replace(re, '\n'); report.push('主题重绘块: removed'); }
  else report.push('主题重绘块: 未找到');
}

// 2) setOption 的 backgroundColor / 第二参 true
{
  s = s.replace(/\r?\n[ \t]*backgroundColor: 'transparent',/, '');
  const n1 = (s.match(/\}, true\);/g) || []).length;
  s = s.replace(/\}, true\);/g, '});');
  report.push('setOption backgroundColor/true: true 替换 ' + n1 + ' 处');
}

// 3) 找到当前页里 setOption 块（从 `const style = mapSeriesStyle` 到对应 `});`）
const lines = s.split(/\r?\n/);
const si = lines.findIndex(l => /const style = mapSeriesStyle/.test(l));
if (si < 0) { report.push('style 行: 未找到'); }
else {
  let base = lines[si].match(/^[ \t]*/)[0].length;
  let j = si + 1;
  while (j < lines.length && !lines[j].trim().startsWith('myChart.setOption({')) j++;
  let k = j + 1;
  const closeRe = new RegExp('^[ \\t]' + base + '\\}\\);\\s*$');
  while (k < lines.length && !closeRe.test(lines[k])) k++;
  // 从 style 行到 setOption 结尾
  let endK = k;
  // 若 style 行之前是 hideLoading/display none 之类，保留
  let startS = si;
  const curBlock = lines.slice(startS, endK + 1).join('\n');
  // 在 backup 里找对应的块
  const oldLines = raw.split(/\r?\n/);
  const osi = oldLines.findIndex(l => /const style = mapSeriesStyle/.test(l));
  if (osi < 0) { report.push('backup style 行: 未找到'); }
  else {
    let oj = osi;
    while (oj < oldLines.length && !oldLines[oj].trim().startsWith('myChart.setOption({')) oj++;
    let ok = oj + 1;
    const obase = oldLines[oj].match(/^[ \t]*/)[0].length;
    const oclose = new RegExp('^[ \\t]' + obase + '\\}\\s*,\\s*true\\);\\s*$');
    const oclose2 = new RegExp('^[ \\t]' + obase + '\\}\\);\\s*$');
    while (ok < oldLines.length && !oclose.test(oldLines[ok]) && !oclose2.test(oldLines[ok])) ok++;
    const oldBlock = oldLines.slice(osi, ok + 1);
    // 修正缩进：把 backup 块的 setOption 行 base（0）改成当前 base
    const fixed = oldBlock.map((l, idx) => {
      if (idx === 0) return ' '.repeat(base) + l.trim();
      if (idx === 1 && l.trim() === '') return '';
      // setOption 首行及其后续，统一 +base 缩进（backup 中是 0 缩进起）
      const add = ' '.repeat(base);
      if (l.trim() === '') return '';
      return add + l;
    });
    // 去掉多余空行：只保留 style 行后一个空行
    const out = [fixed[0], ''].concat(fixed.slice(1).filter((l, i) => !(l.trim() === '')), );
    // 重新插入空行结构：style 行 / 空行 / setOption…
    const body = fixed.slice(1).filter(l => l.trim() !== '');
    const newBlock = [' '.repeat(base) + oldBlock[0].trim(), '', ...body];
    s = lines.slice(0, startS).join('\n') + '\n' + newBlock.join('\n') + '\n' + lines.slice(endK + 1).join('\n');
    report.push('setOption 块: 用 backup 第 ' + (osi + 1) + '-' + (ok + 1) + ' 行回填，原当前页第 ' + (startS + 1) + '-' + (endK + 1) + ' 行');
  }
}
fs.writeFileSync(curF, s, 'utf8');
console.log(page + '\n  ' + report.join('\n  '));
