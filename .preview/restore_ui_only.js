// 从 backup（改UI前的原始文件）恢复一个页面：只重新加入 UI 需要的第 3 项（主题配色 series 样式）
// 其余内容全部用 backup 原文。
const fs = require('fs');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
const page = process.argv[2];
const backup = fs.readFileSync(root + '.preview/scenery_backup/' + page + '.html', 'utf8');
const eol = backup.includes('\r\n') ? '\r\n' : '\n';
let s = backup.split(/\r?\n/).join('\n'); // 统一 LF 便于处理
const log = [];

function apply(label, fn) {
  const before = s;
  s = fn(s);
  log.push(label + ': ' + (before === s ? 'NO CHANGE' : 'ok'));
}

// A) 在 isMobile 定义后插入 cssVar + mapSeriesStyle
apply('插入 mapSeriesStyle', str => {
  if (str.includes('function mapSeriesStyle(')) return str;
  const anchor = /(const isMobile = [^\n]*\n)/;
  if (!anchor.test(str)) return str;
  const helper = [
    '',
    '    // ==================== 地图配色（跟随深色 / 浅色主题） ====================',
    '    function cssVar(name, fallback) {',
    '      var v = getComputedStyle(document.documentElement).getPropertyValue(name);',
    "      v = (v || '').trim();",
    '      return v || fallback;',
    '    }',
    '',
    '    function mapSeriesStyle(opt) {',
    '      opt = opt || {};',
    '      const c = {',
    "        area: cssVar('--map-area', '#e8ecf1'),",
    "        border: cssVar('--map-border', '#ffffff'),",
    "        label: cssVar('--map-label', '#333'),",
    "        litEdge: cssVar('--map-lit-edge', '#ffffff'),",
    "        hover: cssVar('--map-hover', '#cbd9ef')",
    '      };',
    '      return {',
    '        itemStyle: { areaColor: c.area, borderColor: c.border, borderWidth: 1 },',
    '        emphasis: {',
    '          itemStyle: { areaColor: c.hover, borderColor: c.litEdge, borderWidth: 1.4 },',
    '          label: { show: true, color: c.label }',
    '        },',
    '        label: { show: !!opt.labelShow, fontSize: opt.fontSize || 10, color: c.label }',
    '      };',
    '    }',
    ''
  ].join('\n');
  return str.replace(anchor, (m) => m + helper);
});

// B) series 里 setOption 的 itemStyle / label / emphasis 换成主题样式
apply('setOption 使用主题样式', str => {
  // 找 setOption 块
  const idx = str.indexOf('myChart.setOption({');
  if (idx < 0) return str;
  // 找到该 setOption 的结尾 `});`（顶层，缩进 0 或 n）
  const rest = str.slice(idx);
  const m = rest.match(/^myChart\.setOption\(\{[\s\S]*?\n\s*\}\);/);
  if (!m) return str;
  let block = m[0];
  // label
  block = block.replace(/label:\s*\{[^}]*formatter:([\s\S]*?)\}\s*,\s*(?=itemStyle)/, (mm, fm) => {
    return "label: Object.assign({}, style.label, {\n              formatter:" + fm + '}), ';
  });
  // 若 label 是内联不含 formatter 的情况，跳过
  block = block.replace(/itemStyle:\s*\{\s*areaColor:\s*'#e8ecf1'\s*,\s*borderColor:\s*'#ffffff'\s*,\s*borderWidth:\s*1\s*\}/, 'itemStyle: style.itemStyle');
  block = block.replace(/emphasis:\s*\{\s*itemStyle:\s*\{\s*areaColor:\s*'inherit'\s*\}\s*\}/, 'emphasis: style.emphasis');
  const styleDecl = 'const style = mapSeriesStyle({ labelShow: true, fontSize: isMobile ? 8 : 10 });\n\n';
  const withDecl = block.replace('myChart.setOption({', styleDecl + 'myChart.setOption({');
  return str.replace(m[0], withDecl);
});

s = s.split('\n').join(eol);
fs.writeFileSync(root + 'scenery/' + page + '.html', s, 'utf8');
console.log(page + '\n  ' + log.join('\n  '));
