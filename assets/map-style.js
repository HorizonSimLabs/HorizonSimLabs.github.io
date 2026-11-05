/* HorizonSimLabs · 地图配色助手
 * 只负责「从主题变量里取颜色」，不涉及地图数据的加载方式。
 * 页面里用 mapSeriesStyle() 生成 ECharts series 的 label / itemStyle / emphasis。
 */
(function (global) {
  function cssVar(name, fallback) {
    var v = "";
    try {
      v = global.getComputedStyle(document.documentElement).getPropertyValue(name);
    } catch (e) { v = ""; }
    v = (v || "").trim();
    return v || fallback;
  }

  function mapColors() {
    return {
      area: cssVar("--map-area", "#e8ecf1"),
      border: cssVar("--map-border", "#ffffff"),
      label: cssVar("--map-label", "#333"),
      lit: cssVar("--map-lit", "#22a95c"),
      litEdge: cssVar("--map-lit-edge", "#ffffff"),
      hover: cssVar("--map-hover", "#cbd9ef"),
      partial: cssVar("--map-partial", "#b8860b"),
      none: cssVar("--map-none", "#b3455c")
    };
  }

  function areaStyle(mode, colors) {
    var c = colors || mapColors();
    if (mode === "lit") return { areaColor: c.lit, borderColor: c.litEdge, borderWidth: 1.2 };
    if (mode === "partial") return { areaColor: c.partial, borderColor: c.border, borderWidth: 1 };
    if (mode === "none") return { areaColor: c.none, borderColor: c.border, borderWidth: 1 };
    return {};
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

  global.HSLMapStyle = { cssVar: cssVar, colors: mapColors, areaStyle: areaStyle, mapSeriesStyle: mapSeriesStyle };
})(typeof window !== "undefined" ? window : this);
