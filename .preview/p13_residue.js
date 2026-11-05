const fs = require('fs');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
const pages = ['au', 'bt', 'cn', 'dk', 'is', 'jp', 'kp', 'kr', 'my', 'nz', 'sg', 'tr'];
for (const p of pages) {
  const s = fs.readFileSync(root + 'scenery/' + p + '.html', 'utf8');
  const bad = s.match(/HSLGeo|HSLTheme|_GEOJSON_URLS|backgroundColor: 'transparent'|\}, true\)|loadGeoJson|mapSeriesStyle\(/g);
  console.log(p.padEnd(3), bad ? [...new Set(bad)].join(',') : 'clean');
}
