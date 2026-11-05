// 统一 setOption 前的缩进
const fs = require('fs');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
for (const p of ['jp', 'my', 'nz', 'tr', 'bt', 'kp', 'dk', 'sg', 'kr']) {
  const f = root + 'scenery/' + p + '.html';
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  const idx = lines.findIndex(l => /const style = mapSeriesStyle/.test(l));
  if (idx < 0) { console.log(p, 'no style line'); continue; }
  let j = idx + 1;
  while (j < lines.length && !/myChart\.setOption\(/.test(lines[j])) j++;
  const old = lines.slice(idx, j + 1).join('\n');
  const tail = [];
  // 保留原 setOption 首行之前的空行数量：统一为一行空行
  const setLine = lines[j].trim();
  const newBlock = [
    '        const style = mapSeriesStyle({ labelShow: true, fontSize: isMobile ? 8 : 10 });',
    '',
    '        ' + setLine
  ].join('\n');
  lines.splice(idx, j + 1 - idx, ...newBlock.split('\n'));
  fs.writeFileSync(f, lines.join('\n'), 'utf8');
  console.log(p, 'ok');
}
