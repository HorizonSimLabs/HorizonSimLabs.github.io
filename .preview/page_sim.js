// 桩环境运行国家页：报告 fetch 的 URL、注册地图要素数、点亮要素
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ROOT = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
const PAGE = process.env.PAGE || 'au';
const file = ROOT + 'scenery/' + PAGE + '.html';
const html = fs.readFileSync(file, 'utf8');

let series = null; const registered = {}; const fetches = [];
const el = () => ({
  style: {}, className: '', innerHTML: '', innerText: '', textContent: '', dataset: {},
  classList: { add() { }, remove() { }, toggle() { }, contains() { return false; } },
  addEventListener() { }, removeEventListener() { }, appendChild() { }, removeChild() { }, remove() { },
  setAttribute() { }, getAttribute() { return null; }, querySelector() { return el(); }, querySelectorAll() { return []; },
  focus() { }, blur() { }, click() { }, offsetWidth: 300, offsetHeight: 300, children: [], parentNode: null, contains() { return false; },
  getBoundingClientRect() { return { left: 0, top: 0, width: 1200, height: 800 }; },
});
const ctx = {
  console, setTimeout, clearTimeout, setInterval, clearInterval, Date, JSON, Math, RegExp, String, Number, Array, Object, Promise, Error,
  document: {
    documentElement: el(), body: el(), getElementById() { return el(); }, querySelector() { return el(); },
    querySelectorAll() { return []; }, createElement() { return el(); }, addEventListener() { }, cookie: '',
  },
  navigator: { userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120', language: 'zh-CN' },
  location: { href: 'http://local/scenery/' + PAGE + '.html', pathname: '/scenery/' + PAGE + '.html' },
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
  addEventListener() { }, removeEventListener() { },
  innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
  matchMedia: () => ({ matches: false, addEventListener() { }, addListener() { } }),
  localStorage: { getItem() { return null; }, setItem() { }, removeItem() { } },
  requestAnimationFrame: (f) => setTimeout(f, 0),
  fetch: async (url) => {
    const u = String(url); fetches.push(u);
    if (/^https?:/.test(u)) return { ok: false, status: 0, text: async () => '', json: async () => ({}) };
    const p = path.resolve(path.dirname(file), u.split('?')[0]);
    if (!fs.existsSync(p)) return { ok: false, status: 404, text: async () => '', json: async () => ({}) };
    const t = fs.readFileSync(p, 'utf8');
    return { ok: true, status: 200, text: async () => t, json: async () => JSON.parse(t) };
  },
};
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
ctx.HSLTheme = { onChange() { }, current: () => 'dark', color: (n, f) => f };
ctx.echarts = {
  init() {
    return {
      showLoading() { }, hideLoading() { }, on() { }, getZr() { return { on() { } }; }, resize() { }, dispose() { },
      setOption(o) { series = (o && o.series && o.series[0]) || series; }, getOption() { return {}; },
    };
  },
  registerMap(n, g) { registered[n] = g; },
};
vm.createContext(ctx);
for (const f of ['assets/map-style.js', 'assets/theme.js']) {
  try { vm.runInContext(fs.readFileSync(ROOT + f, 'utf8'), ctx, { filename: f }); } catch (e) { }
}
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m; const blocks = [];
while ((m = re.exec(html))) blocks.push(m[1]);
(async () => {
  for (const b of blocks) {
    try { vm.runInContext(b, ctx, { filename: PAGE + '.inline' }); }
    catch (e) { console.log('RUNTIME ERROR:', e.message); }
  }
  await new Promise(r => setTimeout(r, 1500));
  const maps = Object.entries(registered).map(([k, g]) => k + ':' + ((g.features || []).length) + 'f');
  const lit = series && series.data ? series.data.filter(d => d.itemStyle && d.itemStyle.areaColor && d.itemStyle.areaColor !== '').map(d => d.name) : [];
  console.log('PAGE', PAGE);
  console.log('  fetch:', [...new Set(fetches.map(u => u.split('?')[0]))].join(' | '));
  console.log('  maps:', maps.join(', ') || '(none)');
  console.log('  lit:', lit.length, lit.slice(0, 8).join(', '));
  process.exit(0);
})();
