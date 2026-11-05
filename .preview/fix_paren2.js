// 精确修复：`itemStyle: { areaColor: 'rgba(0, 180, 100, 0.6)' }) });` → `... } } });`
const fs = require('fs');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
for (const p of ['bt', 'dk', 'kp', 'kr', 'sg']) {
  const f = root + 'scenery/' + p + '.html';
  let s = fs.readFileSync(f, 'utf8');
  const b = s;
  s = s.split("\"rgba(0, 180, 100, 0.6)' }) });").join("\"rgba(0, 180, 100, 0.6)' } } });");
  s = s.split("itemStyle: { areaColor: 'rgba(0, 180, 100, 0.6)' }) });").join("itemStyle: { areaColor: 'rgba(0, 180, 100, 0.6)' } } });");
  fs.writeFileSync(f, s, 'utf8');
  console.log(p, b === s ? 'unchanged' : 'fixed');
}
