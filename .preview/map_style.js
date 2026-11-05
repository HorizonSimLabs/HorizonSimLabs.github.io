// 提供 --map-* 变量的配色助手，供各国家页读取主题色（不改地图数据来源）
const fs = require('fs');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
const f = root + 'assets/map-style.js';
const code = `/* HorizonSimLabs · 地图配色助手
 * 只负责「从主题变量里取颜色」，不涉及地图数据的加载方式。
 * 页面里用 mapSeriesStyle() 生成 ECharts series 的 label / itemStyle / emphasis。
 */
(function (global) {
  function cssVar(name, fallback) {
    try {
      var v = global.getComputedStyle(document.documentElement).getPropertyValue(name);
      v = (v || '').trim();
      return v || fallback;
    } catch (e) { return fallback; }
  }

  function mapColors() {
    return {
      area: cssVar('--map-area', '#e8ecf1'),
      border: cssVar('--map-border', '#ffffff'),
      label: cssVar('--map-label', '#333'),
      lit: cssVar('--map-lit', '#22a95c'),
      litEdge: cssVar('--map-lit-edge', '#ffffff'),
      hover: cssVar('--map-hover', '#cbd9ef'),
      partial: cssVar('--map-partial', '#b8860b'),
      none: cssVar('--map-none', '#b3455c')
    };
  }

  function mapSeriesStyle(opt) {
    opt = opt || {};
    var c = mapColors();
    return {
      itemStyle: { areaColor: c.area, borderColor: c.border, borderWidth: 1 },
      emphasis: {
        itemStyle: { areaColor: c.hover, borderColor: c.litEdge, borderWidth: 1.4 },
        label: { show: true, color: c.label }
      },
      label: { show: !!opt.labelShow, fontSize: opt.fontSize || 10, color: c.label }
    };
  }

  global.HSLMapStyle = { cssVar: cssVar, colors: mapColors, mapSeriesStyle: mapSeriesStyle };
})(typeof window !== 'undefined' ? window : this);
`;
fs.writeFileSync(f, code, 'utf8');
console.log('written', code.length);
