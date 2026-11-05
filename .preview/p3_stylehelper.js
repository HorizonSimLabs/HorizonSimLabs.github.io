// 3) 把 HSLGeo.mapSeriesStyle 换成本地内联的配色函数（只负责颜色）
const fs = require('fs');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
const PAGES = ['au', 'jp', 'my', 'nz', 'tr', 'bt', 'kp', 'dk', 'sg', 'kr'];

const HELPER = `    // ==================== 地图配色（跟随深色 / 浅色主题） ====================
    function cssVar(name, fallback) {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name);
      v = (v || '').trim();
      return v || fallback;
    }

    function mapSeriesStyle(opt) {
      opt = opt || {};
      const c = {
        area: cssVar('--map-area', '#e8ecf1'),
        border: cssVar('--map-border', '#ffffff'),
        label: cssVar('--map-label', '#333'),
        litEdge: cssVar('--map-lit-edge', '#ffffff'),
        hover: cssVar('--map-hover', '#cbd9ef')
      };
      return {
        itemStyle: { areaColor: c.area, borderColor: c.border, borderWidth: 1 },
        emphasis: {
          itemStyle: { areaColor: c.hover, borderColor: c.litEdge, borderWidth: 1.4 },
          label: { show: true, color: c.label }
        },
        label: { show: !!opt.labelShow, fontSize: opt.fontSize || 10, color: c.label }
      };
    }

`;

for (const p of PAGES) {
  const file = root + 'scenery/' + p + '.html';
  let s = fs.readFileSync(file, 'utf8');
  const before = s;
  s = s.replace(/HSLGeo\.mapSeriesStyle\(/g, 'mapSeriesStyle(');
  if (!s.includes('function mapSeriesStyle(opt)')) {
    // 插到主脚本开头（isMobile 定义之后）
    const anchor = /(const isMobile = [^\n]*\n)/;
    if (!anchor.test(s)) { console.log(p, '!! anchor missing'); continue; }
    s = s.replace(anchor, (m) => m + '\n' + HELPER);
  }
  fs.writeFileSync(file, s, 'utf8');
  console.log(p, before === s ? 'unchanged' : 'patched', '| hslgeo left:', (s.match(/HSLGeo/g) || []).length);
}
