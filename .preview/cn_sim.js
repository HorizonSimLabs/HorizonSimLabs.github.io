// 用桩环境跑 cn.html 的脚本，检查 DataV 渲染路径
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
const html = fs.readFileSync(root + 'scenery/cn.html', 'utf8');
const registered = {};
const fetchLog = [];
let series = null;

function makeEl() {
  return {
    style: {}, className: '', innerHTML: '', innerText: '', textContent: '',
    classList: { add() { }, remove() { }, toggle() { }, contains() { return false; } },
    addEventListener() { }, appendChild() { }, removeChild() { }, remove() { },
    setAttribute() { }, getAttribute() { return null; }, querySelector() { return makeEl(); },
    querySelectorAll() { return []; }, focus() { }, blur() { }, click() { }, offsetWidth: 300, offsetHeight: 300,
    getBoundingClientRect() { return { left: 0, top: 0, width: 1200, height: 800 }; },
    children: [], dataset: {}, parentNode: null,
  };
}
const doc = {
  documentElement: makeEl(), body: makeEl(),
  getElementById() { return makeEl(); }, querySelector() { return makeEl(); },
  querySelectorAll() { return []; }, createElement() { return makeEl(); },
  addEventListener() { }, cookie: '',
};
const ctx = {
  document: doc, navigator: { userAgent: 'Mozilla/5.0 Chrome/120', language: 'zh-CN' },
  location: { href: 'http://local/scenery/cn.html', pathname: '/scenery/cn.html' },
  console, setTimeout, clearTimeout, setInterval, clearInterval,
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
  addEventListener() { }, removeEventListener() {},
  innerWidth: 1200, innerHeight: 800, devicePixelRatio: 1,
  matchMedia: () => ({ matches: false, addEventListener() { }, addListener() { } }),
  localStorage: { getItem() { return null; }, setItem() { }, removeItem() { } },
  requestAnimationFrame: (f) => setTimeout(f, 0),
  fetch: async (url) => {
    fetchLog.push(String(url));
    if (String(url).startsWith('https://geo.datav.aliyun.com')) {
      return { ok: false, status: 403, text: async () => '', json: async () => ({}) };
    }
    let rel = String(url).split('?')[0].replace(/^\.\//, '');
    const p = rel.startsWith('../') ? path.resolve(root + 'scenery/', rel) : path.resolve(root, rel);
    if (!fs.existsSync(p)) return { ok: false, status: 404, text: async () => '', json: async () => ({}) };
    const txt = fs.readFileSync(p, 'utf8');
    return { ok: true, status: 200, text: async () => txt, json: async () => JSON.parse(txt) };
  },
};
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
ctx.HSLTheme = { onChange() { }, current: () => 'dark' };
ctx.echarts = {
  init() {
    return {
      showLoading() { }, hideLoading() { }, on() { }, getZr() { return { on() { } }; }, resize() { }, dispose() { },
      setOption(o) { series = o && o.series && o.series[0]; }, getOption() { return {}; },
    };
  },
  registerMap(n, g) { registered[n] = g; },
};
vm.createContext(ctx);
for (const f of ['assets/map-style.js', 'assets/theme.js']) {
  try { vm.runInContext(fs.readFileSync(root + f, 'utf8'), ctx, { filename: f }); } catch (e) { }
}
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m; const blocks = [];
while ((m = re.exec(html))) blocks.push(m[1]);
(async () => {
  for (const b of blocks) {
    try { vm.runInContext(b, ctx, { filename: 'cn.inline' }); }
    catch (e) { console.log('RUNTIME ERROR:', e.message); }
  }
  await new Promise(r => setTimeout(r, 1200));
  console.log('fetch:', fetchLog.join(' '));
  console.log('registered maps:', Object.keys(registered).join(',') || '(none)');
  console.log('series:', series ? JSON.stringify({ map: series.map, n: series.data && series.data.length, itemStyle: series.itemStyle }) : 'null');
  console.log('ran to the end OK（DataV 请求在本机不通，走了 catch 分支属预期）');
})();
