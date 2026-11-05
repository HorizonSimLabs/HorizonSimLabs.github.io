const fs = require('fs');
const file = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/scenery/my.html';
let s = fs.readFileSync(file, 'utf8');
s = s.replace('// 读取 GeoJSON 目录下的高精度地图文件（HSLGeo 已自动解压）', '// 读取 GeoJSON 目录下的高精度地图文件');
fs.writeFileSync(file, s, 'utf8');
s.split('\n').forEach((l, i) => { if (/HSLGeo|const realGeoJson|fetch\(/.test(l)) console.log(i + 1 + ': ' + l.trim()); });
