// 1) head 里去掉 geojson-loader.js，加入 map-style.js（仅用于取颜色）
const fs = require('fs');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
const pages = ['au', 'bt', 'cn', 'dk', 'is', 'jp', 'kp', 'kr', 'my', 'nz', 'sg', 'tr'];
for (const p of pages) {
  const file = root + 'scenery/' + p + '.html';
  let s = fs.readFileSync(file, 'utf8');
  const before = s;
  s = s.replace(/\s*<script src="\.\.\/assets\/geojson-loader\.js"><\/script>/g, '');
  if (s.includes('assets/map-style.js')) {
    // already there
  } else {
    s = s.replace('</head>', '  <script src="../assets/map-style.js"></script>\n</head>');
  }
  fs.writeFileSync(file, s, 'utf8');
  console.log(p, s === before ? 'unchanged' : 'patched');
}
