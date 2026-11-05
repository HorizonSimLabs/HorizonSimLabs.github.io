// 4) bt / kp / dk / sg / kr：
//    删掉 XXX_GEOJSON_URLS + loadXxxGeoJson()，恢复成改 UI 前的 fetch('../GeoJSON/X.json') 写法；
//    绿块恢复 rgba(0, 180, 100, 0.6)；去掉主题重绘与 setOption 的 backgroundColor / notMerge。
const fs = require('fs');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';

const CFG = {
  bt: { file: 'Bhutan.json', loader: 'loadBhutanGeoJson', call: 'const realGeoJson = await loadBhutanGeoJson();' },
  kp: { file: 'North_Korea.json', loader: 'loadKoreaGeoJson', call: 'const realGeoJson = await loadKoreaGeoJson();' },
  dk: { file: 'Denmark.json', loader: 'loadDenmarkGeoJson', call: 'const realGeoJson = decodeGeoJson(await loadDenmarkGeoJson());' },
  sg: { file: 'Singapore.json', loader: 'loadSingaporeGeoJson', call: 'const realGeoJson = await loadSingaporeGeoJson();' },
  kr: { file: 'South_Korea.json', loader: 'loadKoreaGeoJson', call: 'const realKrGeoJson = await loadKoreaGeoJson();' }
};

for (const p of Object.keys(CFG)) {
  const c = CFG[p];
  const file = root + 'scenery/' + p + '.html';
  let s = fs.readFileSync(file, 'utf8');
  const before = s;

  // a) 删掉 URLS 数组 + loader 函数（含前面的注释行）
  const blockRe = new RegExp(
    '\\n[ \\t]*//[^\\n]*\\n[ \\t]*const [A-Z]+_GEOJSON_URLS = \\[[\\s\\S]*?\\];\\n\\n[ \\t]*async function ' + c.loader +
    '\\(\\) \\{[\\s\\S]*?\\n    \\}\\n', 'g');
  const n1 = (s.match(blockRe) || []).length;
  s = s.replace(blockRe, '\n');

  // b) 调用处换成原始 fetch
  const target = c.call;
  const fetchCode = c.call.indexOf('decodeGeoJson(') === 0
    ? `const rawGeoJson = await (async () => {\n          const res = await fetch(\`../GeoJSON/${c.file}\`);\n          if (!res.ok) throw new Error('HTTP ' + res.status);\n          return await res.json();\n        })();\n        const realGeoJson = decodeGeoJson(rawGeoJson);`
    : `const realGeoJson = await (async () => {\n          const res = await fetch(\`../GeoJSON/${c.file}\`);\n          if (!res.ok) throw new Error('HTTP ' + res.status);\n          return await res.json();\n        })();`;
  const realTarget = c.call.replace('realGeoJson', 'realGeoJson').replace('realKrGeoJson', 'realKrGeoJson');
  const n2 = s.split(realTarget).length - 1;
  const replacement = c.call.startsWith('const realKrGeoJson')
    ? fetchCode.replace('realGeoJson', 'realKrGeoJson')
    : fetchCode;
  s = s.split(realTarget).join(replacement);

  // c) 绿块
  s = s.replace(/HSLGeo\.areaStyle\('lit'\)/g, "{ areaColor: 'rgba(0, 180, 100, 0.6)' }");

  // d) 主题重绘块
  s = s.replace(/\s*\/\/ 深浅主题切换后重绘地图（配色取自主题变量）\s*\n\s*if \(window\.HSLTheme && HSLTheme\.onChange\) \{\s*\n\s*HSLTheme\.onChange\(\(\) => setTimeout\(\(\) => \{ if \(myChart\) renderMap\(\); \}, 30\)\);\s*\n\s*\}\n/g, '\n');

  // e) setOption
  s = s.replace(/\n\s*backgroundColor: 'transparent',/g, '');
  s = s.replace(/\}, true\);\n/g, '});\n');

  fs.writeFileSync(file, s, 'utf8');
  console.log(p, before === s ? 'unchanged' : 'patched',
    '| urls-block:', n1, 'call:', n2,
    '| left:', (s.match(/HSLGeo|HSLTheme|_GEOJSON_URLS|backgroundColor: 'transparent'|\}, true\)/g) || []).join(','));
}
