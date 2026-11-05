// 修复 areaStyle 替换后多出来的一个 ')'
const fs = require('fs');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
for (const p of ['bt', 'dk', 'kp', 'kr', 'sg']) {
  const f = root + 'scenery/' + p + '.html';
  let s = fs.readFileSync(f, 'utf8');
  const b = s;
  s = s.replace(/itemStyle: \{ areaColor: 'rgba\(0, 180, 100, 0\.6\)' \} \}\)/g, "itemStyle: { areaColor: 'rgba(0, 180, 100, 0.6)' } }");
  s = s.replace(/(itemStyle: \{ areaColor: 'rgba\(0, 180, 100, 0\.6\)' \})(\s*\);)/g, '$1 }$2');
  fs.writeFileSync(f, s, 'utf8');
  console.log(p, b === s ? 'unchanged' : 'fixed');
}
