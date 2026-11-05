// 丹麦页专项：模拟渲染后检查比隆是否点亮 + 卡片标题是否正确；并临时去掉比隆条目做对照
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ROOT = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
const file = ROOT + 'scenery/dk.html';
let html = fs.readFileSync(file, 'utf8');
// 在 initApp 前插探针（探针与页面脚本同作用域才能读到局部变量）
html = html.replace('async function initApp()', 'window.__probe = { provinceDataMap: () => provinceDataMap };\n    async function initApp()');
const DONE = fs.readFileSync(ROOT + 'done.json', 'utf8');
const WITHOUT_BILLUND = DONE.split(/\r?\n/).filter(l => !/比隆/.test(l)).join('\n');

const el = () => ({
  style: {}, className: '', innerHTML: '', innerText: '', textContent: '', dataset: {},
  classList: { add() { }, remove() { }, toggle() { }, contains() { return false; } },
  addEventListener() { }, appendChild() { }, removeChild() { }, remove() { },
  setAttribute() { }, getAttribute() { return null; }, querySelector() { return el(); }, querySelectorAll() { return []; },
  focus() { }, blur() { }, click() { }, offsetWidth: 300, offsetHeight: 300, children: [], contains() { return false; },
  getBoundingClientRect() { return { left: 0, top: 0, width: 1200, height: 800 }; },
});

async function run(doneText, label) {
  let option = null; const registered = {}; const shown = [];
  const ctx = {
    console: { log() { }, debug() { }, warn() { }, error: (...a) => shown.push('ERR ' + a.join(' ')) },
    setTimeout, clearTimeout, setInterval, clearInterval,
    document: { documentElement: el(), body: el(), getElementById() { return el(); }, querySelector() { return el(); },
      querySelectorAll() { return []; }, createElement() { return el(); }, addEventListener() { } },
    navigator: { userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120', language: 'zh-CN' },
    location: { href: 'http://local/scenery/dk.html', pathname: '/scenery/dk.html' },
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    addEventListener() { }, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
    matchMedia: () => ({ matches: false, addEventListener() { } }),
    localStorage: { getItem() { return null; }, setItem() { }, removeItem() { } },
    requestAnimationFrame: (f) => setTimeout(f, 0),
    fetch: async (url) => {
      const u = String(url);
      if (/^https?:/.test(u)) return { ok: false, status: 0, text: async () => '', json: async () => ({}) };
      if (/done\.json/.test(u)) return { ok: true, status: 200, text: async () => doneText, json: async () => JSON.parse(doneText) };
      const p = path.resolve(path.dirname(file), u.split('?')[0]);
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
  for (const f of ['assets/map-style.js']) {
    try { vm.runInContext(fs.readFileSync(ROOT + f, 'utf8'), ctx, { filename: f }); } catch (e) { console.log('asset load err', f, e.message); }
  }
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m; const blocks = [];
  while ((m = re.exec(html))) blocks.push(m[1]);
  for (const b of blocks) { try { vm.runInContext(b, ctx, { filename: 'dk.inline' }); } catch (e) { console.log('RUNTIME', e.message); } }
  await new Promise(r => setTimeout(r, 800));
  const ser = option && option.series && option.series[0];
  const lit = ser && ser.data ? ser.data : [];
  console.log('=== ' + label);
  console.log('  registered map features:', registered.denmark ? registered.denmark.features.length : 0);
  console.log('  lit:', lit.length, lit.map(d => d.name + ' ' + JSON.stringify(d.itemStyle || {})).join(', '));
  // 找出卡片 HTML：tooltip formatter 或 provinceDataMap
  const pm = (ctx.__probe && ctx.__probe.provinceDataMap()) || {};
  Object.keys(pm).forEach(k => {
    const txt = String(pm[k]).replace(/<[^>]+>/g, '|').replace(/\|+/g, '|');
    console.log('  card[' + k + ']:', txt.slice(0, 220));
  });
  if (shown.length) console.log('  console.error:', shown.slice(0, 5).join(' / '));
}

(async () => {
  await run(DONE, '正常 done.json');
  await run(WITHOUT_BILLUND, '对照：去掉比隆条目');
})();
