// 桩环境跑 scenery.html（世界地图），用真实 world.json 验证国家点亮
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ROOT = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
const html = fs.readFileSync(ROOT + 'scenery.html', 'utf8');
const worldPath = process.env.WORLD || 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/.preview/world.json';
const world = JSON.parse(fs.readFileSync(worldPath, 'utf8'));

const el = () => ({
  style: {}, className: '', innerHTML: '', innerText: '', textContent: '', dataset: {},
  classList: { add() { }, remove() { }, toggle() { }, contains() { return false; } },
  addEventListener() { }, removeEventListener() { }, appendChild() { }, removeChild() { }, remove() { },
  setAttribute() { }, getAttribute() { return null; }, querySelector() { return el(); }, querySelectorAll() { return []; },
  focus() { }, blur() { }, click() { }, offsetWidth: 300, offsetHeight: 300, children: [], parentNode: null, contains() { return false; },
  getBoundingClientRect() { return { left: 0, top: 0, width: 1200, height: 800 }; },
});
let option = null; const registered = {}; const fetches = [];
const ctx = {
  console, setTimeout, clearTimeout, setInterval, clearInterval,
  document: { documentElement: el(), body: el(), getElementById() { return el(); }, querySelector() { return el(); },
    querySelectorAll() { return []; }, createElement() { return el(); }, addEventListener() { }, cookie: '' },
  navigator: { userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120', language: 'zh-CN' },
  location: { href: 'http://local/scenery.html', pathname: '/scenery.html' },
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
  addEventListener() { }, removeEventListener() {},
  innerWidth: 1440, innerHeight: 900, devicePixelRatio: 1,
  matchMedia: () => ({ matches: false, addEventListener() { }, addListener() { } }),
  localStorage: { getItem() { return null; }, setItem() { }, removeItem() { } },
  requestAnimationFrame: (f) => setTimeout(f, 0),
  fetch: async (url) => {
    const u = String(url); fetches.push(u);
    if (/world\.json/.test(u)) return { ok: true, status: 200, json: async () => world, text: async () => '' };
    if (/^https?:/.test(u)) return { ok: false, status: 0, text: async () => '', json: async () => ({}) };
    const p = path.resolve(ROOT, u.split('?')[0]);
    if (!fs.existsSync(p)) return { ok: false, status: 404, text: async () => '', json: async () => ({}) };
    const t = fs.readFileSync(p, 'utf8');
    return { ok: true, status: 200, text: async () => t, json: async () => JSON.parse(t) };
  },
};
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
ctx.HSLTheme = { onChange() { }, current: () => 'dark', color: (n, f) => f };
ctx.echarts = {
  init() { return { showLoading() { }, hideLoading() { }, on() { }, getZr() { return { on() { } }; }, resize() { }, dispose() { },
    setOption(o) { option = o; }, getOption() { return {}; } }; },
  registerMap(n, g) { registered[n] = g; },
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(ROOT + 'assets/theme.js', 'utf8'), ctx, { filename: 'theme.js' });
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m; const blocks = [];
while ((m = re.exec(html))) blocks.push(m[1]);
(async () => {
  for (const b of blocks) { try { vm.runInContext(b, ctx, { filename: 'scenery.inline' }); } catch (e) { console.log('RUNTIME ERROR:', e.message); } }
  await new Promise(r => setTimeout(r, 1200));
  const map = registered['world'];
  const ser = option && option.series && option.series[0];
  console.log('fetch:', [...new Set(fetches.map(u => u.split('?')[0]))].join(' | '));
  console.log('registered world features:', map ? map.features.length : 0);
  console.log('series data length:', ser && ser.data ? ser.data.length : 0);
  if (ser && ser.data) console.log('lit countries:', ser.data.map(d => d.name).join(', '));
  process.exit(0);
})();
