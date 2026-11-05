// 批量回滚 10 个国家页：以备份(改UI前的原件)为基础，逐条撤销数据层/逻辑层改动，保留第3项主题配色
const fs = require('fs');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
const PAGES = ['au', 'jp', 'kr', 'my', 'nz', 'tr', 'bt', 'kp', 'dk', 'sg'];
const MAPFILE = { au: 'Australia', jp: 'Japan', kr: 'South_Korea', my: 'Malaysia', nz: 'New_Zealand', tr: 'Turkey', bt: 'Bhutan', kp: 'North_Korea', dk: 'Denmark', sg: 'Singapore' };
// 原本用 *_GEOJSON_URLS 数组加载的页面（保持原样）
const URLSLIST = ['kr', 'bt', 'kp', 'dk', 'sg'];

const MARKERS = {
  task1: '- 第1项：本页仍会 fetch 本地 GeoJSON/XX.json，以及名字里带 GeoJSON 的提示文案',
  task2: '- 第2项：仍残留 HSLGeo.loadGeoJson / 删掉了 jsdelivr 回退源 / 绿块用了 areaStyle',
  task2help: '- 第2项附：本页本来不该有 mapSeriesStyle 助手（说明是我加的）',
  task3: '- 第3项：series 用的不是主题配色（UI 需要）',
  task4: '- 第4项：多余的 setOption 第二参 / backgroundColor / 去掉主题重绘',
  task5: '- 第5项：残留 is-error 类',
  loaders: '- 附加：非自包含（引用 ../assets/geojson-loader.js 或 JS 里调 HSLGeo）'
};

function markers(str) {
  const html = str.split('<script src')[0];
  const res = [];
  if (/\.\.\/GeoJSON\//.test(str) || /GeoJSON\/[A-Za-z_]+\.json/.test(str)) res.push('task1');
  if (/HSLGeo|loadGeoJson|areaStyle/.test(str)) res.push('task2');
  if (!/function mapSeriesStyle\(/.test(html)) res.push('task2help');
  const setOpt = str.slice(str.indexOf('myChart.setOption({'));
  if (!/label: Object\.assign\(\{\}, style\.label/.test(setOpt) || !/itemStyle: style\.itemStyle/.test(setOpt)) res.push('task3');
  if (/backgroundColor: 'transparent'|\}, true\);|HSLTheme\.onChange/.test(str)) res.push('task4');
  if (/classList\.add\('is-error'\)/.test(str)) res.push('task5');
  if (/geojson-loader\.js|HSLGeo/.test(str)) res.push('loaders');
  return [...new Set(res)];
}

for (const p of PAGES) {
  const body = fs.readFileSync(root + 'scenery/' + p + '.html', 'utf8');
  const bak = fs.readFileSync(root + '.preview/scenery_backup/' + p + '.html', 'utf8');
  const mb = markers(body), bk = markers(bak);
  const urlMode = URLSLIST.includes(p);
  console.log('===== ' + p + ' (' + MAPFILE[p] + ') 现:[' + mb.join(',') + '] 备:[' + bk.join(',') + '] URLS:' + urlMode);
}
