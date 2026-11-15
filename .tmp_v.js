const fs = require('fs');
const vm = require('vm');

const HTML = fs.readFileSync('scenery/cn.html', 'utf8');

function makeEl(id) {
  const el = {
    id, style: {}, innerHTML: '', innerText: '', children: [], dataset: {}, _ev: {},
    clientWidth: 390, clientHeight: 844, offsetWidth: 390, offsetHeight: 844,
    classList: { add() {}, remove() {}, contains() { return false; } },
    addEventListener(t, f) { (el._ev[t] = el._ev[t] || []).push(f); },
    removeEventListener() {}, appendChild(c) { el.children.push(c); },
    setAttribute() {}, getAttribute() { return null; }, focus() {}, blur() {}, remove() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 390, height: 844, right: 390, bottom: 844 }; },
    contains() { return false; }, querySelector() { return null; }, querySelectorAll() { return []; }
  };
  return el;
}
const els = {};
const regs = [];
const initCalls = [];
let resizeCount = 0;
let lastChart = null;
const W = 390, H = 844;

const echartsStub = {
  registerMap(name, geo) { regs.push({ name, features: (geo.features || []).length }); },
  getMap() { return undefined; },
  init(el, theme, opts) {
    initCalls.push(opts || null);
    const c = {
      _ev: {}, on(t, f) { (c._ev[t] = c._ev[t] || []).push(f); }, off() {},
      showLoading() {}, hideLoading() {},
      resize() { resizeCount++; },
      setOption(o) { c.option = o; }, getOption() { return c.option; },
      getZr() { return { on() {}, getWidth: () => W, getHeight: () => H }; },
      convertFromPixel() { return [120, 30]; }, convertToPixel() { return [W / 2, H / 2]; }, dispatchAction() {}
    };
    lastChart = c; return c;
  }
};
const doc = {
  getElementById(id) { return els[id] || (els[id] = makeEl(id)); },
  documentElement: { classList: { add() {}, remove() {} } },
  body: makeEl('body'), addEventListener() {}, removeEventListener() {},
  createElement(t) { return makeEl(t); }, querySelector() { return null; }, querySelectorAll() { return []; },
  hidden: false
};
const logs = [];
const timers = [];
const sb = {
  console: { log: (...a) => logs.push(a.join(' ')), warn: (...a) => logs.push('WARN ' + a.join(' ')), error: (...a) => logs.push('ERR ' + a.join(' ')), info() {} },
  document: doc,
  window: {
    matchMedia: () => ({ matches: true, addEventListener() {}, addListener() {} }),
    innerWidth: W, innerHeight: H, devicePixelRatio: 2,
    addEventListener(t, f) { (sb.winEv[t] = sb.winEv[t] || []).push(f); }, removeEventListener() {}
  },
  navigator: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 EdgiOS/126 Mobile/15E148 Safari/604.1', maxTouchPoints: 5, language: 'zh-CN' },
  location: { href: 'http://localhost/scenery/cn.html' },
  setTimeout: (f, ms) => { const id = setTimeout(f, Math.min(ms || 0, 30)); timers.push(id); return id; },
  clearTimeout, setInterval, clearInterval, AbortController,
  Date, Math, JSON, Object, Array, String, Number, Boolean, RegExp, isFinite, isNaN, parseInt, parseFloat, Error, Promise,
  ResizeObserver: undefined,
  fetch: async (u) => {
    u = String(u);
    if (u.includes('/api/landscapes')) return { ok: true, json: async () => ({ ok: true, data: [
      { rawProvince: '杭州', author: 'A', freeLink: '无', freeLevel: '无', paidLink: 'https://ifdian.net/item/a', paidLevel: '1', remark: '无' }
    ] }) };
    if (u.includes('aliyun')) return { ok: false, status: 503 };
    if (u.includes('GeoJSON/China.json')) return { ok: true, json: async () => JSON.parse(fs.readFileSync('GeoJSON/China.json', 'utf8')) };
    return { ok: false, status: 404 };
  },
  echarts: echartsStub, HSLTheme: null
};
sb.winEv = {};
sb.globalThis = sb; sb.self = sb.window;

const scripts = [], re = /<script(?:\s[^>]*)?(?:\ssrc="([^"]*)")?[^>]*>([\s\S]*?)<\/script>/g;
let m; while ((m = re.exec(HTML))) if (!m[1]) scripts.push(m[2]);

(async () => {
  const runErr = [];
  for (const c of scripts) { try { vm.runInNewContext(c, sb, { filename: 'cn.js' }); } catch (e) { runErr.push(e.message); } }
  await new Promise(r => setTimeout(r, 600));
  const series = lastChart && lastChart.option ? lastChart.option.series[0] : null;
  console.log(JSON.stringify({
    runErrors: runErr,
    initOpts: initCalls,
    resizeCount,
    mapRegistered: regs[0],
    seriesLayout: series ? { layoutCenter: series.layoutCenter, layoutSize: series.layoutSize, aspectScale: series.aspectScale, zoom: series.zoom } : null,
    lit: series ? (series.data || []).map(d => d.name) : null,
    errors: logs.filter(l => l.startsWith('ERR')),
    resizeOnEvent: (() => { (sb.winEv.resize || []).forEach(f => f()); return resizeCount; })()
  }, null, 2));
})();
