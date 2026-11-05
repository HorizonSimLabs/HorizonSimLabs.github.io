const fs = require('fs');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
for (const p of ['bt', 'kp', 'dk', 'sg', 'kr']) {
  const f = root + 'scenery/' + p + '.html';
  let s = fs.readFileSync(f, 'utf8');
  const before = s;
  s = s.replace(/'地图数据加载失败，请检查 GeoJSON\/[A-Za-z_]+\.json 是否存在。'/g, "'地图数据加载失败，请检查网络或数据源。'");
  fs.writeFileSync(f, s, 'utf8');
  console.log(p, before === s ? 'unchanged' : 'patched');
}
