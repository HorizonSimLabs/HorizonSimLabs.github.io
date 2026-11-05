// 用桩环境抓取 world.json 里的冰岛要素名，确认原来 is.html 的匹配名
const https = require('https');
const urls = [
  'https://cdn.jsdelivr.net/npm/echarts@4.9.0/map/json/world.json',
  'https://fastly.jsdelivr.net/npm/echarts@4.9.0/map/json/world.json',
  'https://unpkg.com/echarts@4.9.0/map/json/world.json'
];
function get(u) {
  return new Promise((res, rej) => {
    https.get(u, r => {
      if (r.statusCode !== 200) { rej(new Error('HTTP ' + r.statusCode)); return; }
      let d = ''; r.setEncoding('utf8');
      r.on('data', c => d += c); r.on('end', () => res(d));
    }).on('error', rej);
  });
}
(async () => {
  for (const u of urls) {
    try {
      const t = await get(u);
      const j = JSON.parse(t);
      const names = j.features.map(f => f.properties && f.properties.name).filter(Boolean);
      const hit = names.filter(n => /iceland/i.test(n));
      console.log(u, '->', t.length, 'bytes, features', names.length, '| iceland-like:', hit.join(' / ') || '(none)');
      const cn = names.filter(n => /[\u4e00-\u9fa5]/.test(n));
      console.log('   含中文名的国家数:', cn.length, cn.slice(0, 5).join(','));
      break;
    } catch (e) { console.log(u, 'FAIL', e.message); }
  }
})();
