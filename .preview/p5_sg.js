const fs = require('fs');
const file = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/scenery/sg.html';
let s = fs.readFileSync(file, 'utf8');
const re = /\n    const SINGAPORE_GEOJSON_URLS = \[[\s\S]*?throw new Error\('新加坡地图数据加载失败，请检查 GeoJSON\/Singapore\.json。'\);\n    \}\n/;
const n = (s.match(re) || []).length;
s = s.replace(re, '\n');
fs.writeFileSync(file, s, 'utf8');
console.log('removed:', n, '| left:', (s.match(/_GEOJSON_URLS/g) || []).length);
