// 2) 简单页（au / jp / my / nz / tr）：
//    数据加载恢复成改 UI 前的 fetch('../GeoJSON/X.json') + res.json()，绿块恢复 rgba(0,180,100,0.6)，
//    去掉主题重绘与 setOption 的 backgroundColor / notMerge（主题配色保留）。
const fs = require('fs');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
const SIMPLE = { au: 'Australia', jp: 'Japan', my: 'Malaysia', nz: 'New_Zealand', tr: 'Turkey' };

for (const p of Object.keys(SIMPLE)) {
  const file = root + 'scenery/' + p + '.html';
  let s = fs.readFileSync(file, 'utf8');
  const before = s;

  // 数据加载
  s = s.replace(
    /const realGeoJson = await HSLGeo\.loadGeoJson\('([A-Za-z_]+)\.json'\);/g,
    "const res = await fetch(`../GeoJSON/$1.json`);\n        if (!res.ok) throw new Error('HTTP ' + res.status);\n        const realGeoJson = await res.json();"
  );

  // 绿块
  s = s.replace(/HSLGeo\.areaStyle\('lit'\)/g, "{ areaColor: 'rgba(0, 180, 100, 0.6)' }");

  // 主题重绘块
  s = s.replace(/\s*\/\/ 深浅主题切换后重绘地图（配色取自主题变量）\s*\n\s*if \(window\.HSLTheme && HSLTheme\.onChange\) \{\s*\n\s*HSLTheme\.onChange\(\(\) => setTimeout\(\(\) => \{ if \(myChart\) renderMap\(\); \}, 30\)\);\s*\n\s*\}\n/g, '\n');

  // setOption：去掉 backgroundColor，恢复 notMerge=false
  s = s.replace(/\n\s*backgroundColor: 'transparent',/g, '');
  s = s.replace(/\}, true\);\n/g, '});\n');

  fs.writeFileSync(file, s, 'utf8');
  console.log(p, before === s ? 'unchanged' : 'patched', '| 残留:',
    (s.match(/HSLGeo|HSLTheme|backgroundColor: 'transparent'|\}, true\)/g) || []).join(','));
}
