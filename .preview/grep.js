// 输出备份页里的若干关键字上下文
const fs = require('fs');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
const page = process.argv[2];
const KW = ['HSLGeo', 'HSLMapStyle', '_GEOJSON_URLS', 'loadGeoJson', 'areaStyle', 'backgroundColor', '}, true)', 'aliyun', 'world.json', '<style', 'my-tooltip', 'is-error', 'map-style', 'geojson-loader', '/style'];
const lines = fs.readFileSync(root + '.preview/scenery_backup/' + page + '.html', 'utf8').split(/\r?\n/);
lines.forEach((l, i) => { if (KW.some(k => l.includes(k))) console.log((i + 1) + ': ' + l.trim().slice(0, 190)); });
