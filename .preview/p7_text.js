const fs = require('fs');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
const MAPFILE = { au: 'Australia', jp: 'Japan', my: 'Malaysia', nz: 'New_Zealand', tr: 'Turkey', bt: 'Bhutan', kp: 'North_Korea', dk: 'Denmark', sg: 'Singapore', kr: 'South_Korea' };
for (const p of Object.keys(MAPFILE)) {
  const f = root + 'scenery/' + p + '.html';
  let s = fs.readFileSync(f, 'utf8');
  const before = s;
  s = s.replace(/'加载本地 GeoJSON\/[A-Za-z_]+\.json 失败，请检查文件是否存在。'/g, "'加载真实地图数据失败，请检查网络或数据源。'");
  s = s.replace(/'加载本地 GeoJSON\/[A-Za-z_]+\.json 失败。'/g, "'加载真实地图数据失败，请检查网络或数据源。'");
  s = s.replace(/加载本地 GeoJSON\/[A-Za-z_]+\.json 失败[^'"]*/g, '加载真实地图数据失败');
  s = s.replace(/Failed to load local GeoJSON\/[A-Za-z_]+\.json\.?/g, 'Failed to load map data.');
  fs.writeFileSync(f, s, 'utf8');
  const left = (s.match(/GeoJSON\/[A-Za-z_]+\.json/g) || []);
  console.log(p, before === s ? 'unchanged' : 'patched', '| 文案里残留:', left.join(','));
}
