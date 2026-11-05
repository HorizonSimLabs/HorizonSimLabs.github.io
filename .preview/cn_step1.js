// 把 cn.html 的地图数据层改回阿里云 DataV（保留 UI 相关主题配色与卡片）
const fs = require('fs');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
const f = root + 'scenery/cn.html';
let s = fs.readFileSync(f, 'utf8');
const log = [];
const apply = (label, fn) => { const b = s; s = fn(s); log.push(label + ':' + (b === s ? 'NO-CHANGE' : 'ok')); };

// 1) 去掉本地 China.json 的常量与缓存
apply('常量', str => str
  .replace(/\n[ \t]*const CHINA_GEOJSON_FILE = [^\n]*\n/g, '\n')
  .replace(/\n[ \t]*let chinaRawGeoJson = [^\n]*\n/g, '\n')
  .replace(/\n[ \t]*const chinaProvinceMaps = [^\n]*\n/g, '\n'));

// 2) 删除本地聚合相关函数块（buildProvinceGeoJson / mergeFeatureGeometry / buildSubMapGeoJson / topCode / sortedFeatureNames / provinceNameByCode）
const blocksToRemove = [];
['function topCode', 'function sortedFeatureNames', 'function buildProvinceGeoJson', 'function mergeFeatureGeometry', 'function provinceNameByCode', 'function buildSubMapGeoJson'].forEach(name => {
  const i = s.indexOf(name);
  if (i < 0) return;
  // 回退到行首
  let start = s.lastIndexOf('\n', i) + 1;
  // 找到函数结束：从 i 起大括号配平
  let depth = 0, j = s.indexOf('{', i), started = false;
  for (; j < s.length; j++) {
    if (s[j] === '{') { depth++; started = true; }
    else if (s[j] === '}') { depth--; if (started && depth === 0) { j++; break; } }
  }
  // 吃掉行尾换行
  while (s[j] === '\r' || s[j] === '\n') j++;
  blocksToRemove.push([start, j]);
});
// 从后往前删除
blocksToRemove.sort((a, b) => b[0] - a[0]).forEach(([a, b]) => { s = s.slice(0, a) + s.slice(b); });
log.push('删除本地聚合函数:' + blocksToRemove.length + ' 块');

fs.writeFileSync(f, s, 'utf8');
console.log(log.join('\n'));
// 输出剩余引用
s.split(/\r?\n/).forEach((l, i) => {
  if (/chinaRawGeoJson|buildProvinceGeoJson|buildSubMapGeoJson|HSLGeo|CHINA_GEOJSON_FILE|topCode|sortedFeatureNames|mergeFeatureGeometry|provinceNameByCode/.test(l)) console.log((i + 1) + ': ' + l.trim());
});
