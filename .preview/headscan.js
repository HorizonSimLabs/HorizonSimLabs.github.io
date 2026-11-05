const fs = require('fs');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
const pages = ['au', 'bt', 'cn', 'dk', 'is', 'jp', 'kp', 'kr', 'my', 'nz', 'sg', 'tr'];
for (const p of pages) {
  const s = fs.readFileSync(root + 'scenery/' + p + '.html', 'utf8');
  const head = s.slice(0, s.indexOf('</head>'));
  const cdns = (head.match(/<script src="https?:\/\/[^"]+"/g) || []).map(x => x.replace(/<script src="|"/g, '').split('/')[2]);
  console.log(p.padEnd(3), 'loader=' + /geojson-loader\.js/.test(head), 'style=' + /map-style\.js/.test(head), '| cdn:', cdns.join(' '));
}
