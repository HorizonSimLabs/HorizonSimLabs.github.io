// 备份清理：去掉第1/2/4/5项的内容，保留第3项（主题配色）与所有 UI 外观
const fs = require('fs');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
const PAGES = ['au', 'jp', 'kr', 'my', 'nz', 'tr', 'bt', 'kp', 'dk', 'sg'];

for (const p of PAGES) {
  const file = root + '.preview/scenery_backup/' + p + '.html';
  const backup = fs.readFileSync(file, 'utf8');
  const eol = backup.includes('\r\n') ? '\r\n' : '\n';
  let s = backup.split(/\r?\n/).join('\n');
  const log = [];
  const apply = (label, fn) => { const b = s; s = fn(s); log.push(label + ':' + (b === s ? 'NO-CHANGE' : 'ok')); };

  // 第1项：错误文案
  apply('第1项-文案', str => str
    .replace(/'地图数据加载失败，请检查 GeoJSON\/[A-Za-z_]+\.json 是否存在。'/g, "'地图数据加载失败，请检查网络或数据源。'")
    .replace(/'加载本地 GeoJSON\/[A-Za-z_]+\.json 失败，请检查文件是否存在。'/g, "'加载真实地图数据失败，请检查网络或数据源。'"));

  // 第2项：绿块
  apply('第2项-绿块', str => str
    .replace(/HSLGeo\.areaStyle\('lit'/g, "{ areaColor: 'rgba(0, 180, 100, 0.6)' }")
    .replace(/, ?\{ areaColor: 'rgba\(0, 180, 100, 0\.6\)' \}\)/g, " }"));

  // 第2项：HSLGeo.mapSeriesStyle / mapColors 改本地（map-style.js 已提供）
  apply('第2项-配色函数', str => str
    .replace(/HSLGeo\.mapSeriesStyle\(/g, 'mapSeriesStyle(')
    .replace(/HSLGeo\.mapColors\(\)/g, 'mapColors()'));

  // my.html 注释
  apply('注释', str => str.replace('// 读取 GeoJSON 目录下的高精度地图文件（HSLGeo 已自动解压）', '// 读取 GeoJSON 目录下的高精度地图文件'));

  // 第4项
  apply('第4项-清理', str => str
    .replace(/\n[ \t]*backgroundColor: 'transparent',/g, '')
    .replace(/\}, true\);/g, '});')
    .replace(/\n[ \t]*\/\/ 深浅主题切换后重绘地图（配色取自主题变量）\n[ \t]*if \(window\.HSLTheme && HSLTheme\.onChange\) \{\n[ \t]*HSLTheme\.onChange\(\(\) => setTimeout\(\(\) => \{ if \(myChart\) renderMap\(\); \}, 30\)\);\n[ \t]*\}/g, ''));

  // 第5项
  apply('第5项-报错样式', str => str
    .replace(/\n[ \t]*tip(El)?\.classList\.add\('is-error'\);/g, ''));

  // 空行整理：style 声明后的两个空行 → 一个
  apply('空行整理', str => str.replace(/(const style = mapSeriesStyle\(\{ labelShow: true, fontSize: isMobile \? 8 : 10 \}\);\n)\n\n(myChart\.setOption\(\{)/g, '$1\n$2'));

  fs.writeFileSync(file, s.split('\n').join(eol), 'utf8');
  console.log(p + ': ' + log.join(' | '));
}
