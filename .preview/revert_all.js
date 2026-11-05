// 批量回滚 10 个国家页：以备份(改UI前的原件)为基础，逐条撤销数据层/逻辑层改动，保留主题配色(第3项)
const fs = require('fs');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
const PAGES = ['au', 'jp', 'kr', 'my', 'nz', 'tr', 'bt', 'kp', 'dk', 'sg'];
const MAPFILE = { au: 'Australia', jp: 'Japan', kr: 'South_Korea', my: 'Malaysia', nz: 'New_Zealand', tr: 'Turkey', bt: 'Bhutan', kp: 'North_Korea', dk: 'Denmark', sg: 'Singapore' };
const URLSLIST = ['kr', 'bt', 'kp', 'dk', 'sg'];

for (const p of PAGES) {
  const backup = fs.readFileSync(root + '.preview/scenery_backup/' + p + '.html', 'utf8');
  const eol = backup.includes('\r\n') ? '\r\n' : '\n';
  let s = backup.split(/\r?\n/).join('\n');
  const log = [];
  const apply = (label, fn) => { const b = s; s = fn(s); log.push(label + ':' + (b === s ? 'NO-CHANGE' : 'ok')); };

  // 第1项：错误文案里带 GeoJSON 文件名的说法
  apply('第1项-文案', str => str
    .replace(/'地图数据加载失败，请检查 GeoJSON\/[A-Za-z_]+\.json 是否存在。'/g, "'地图数据加载失败，请检查网络或数据源。'")
    .replace(/'加载本地 GeoJSON\/[A-Za-z_]+\.json 失败，请检查文件是否存在。'/g, "'加载真实地图数据失败，请检查网络或数据源。'"));

  // 第2项：绿块改回原始颜色
  apply('第2项-绿块', str => str.replace(/itemStyle: HSLGeo\.areaStyle\('lit'\)/g, "itemStyle: { areaColor: 'rgba(0, 180, 100, 0.6)' }"));

  // 第2项：URLS 列表页的加载函数还原（自包含版本），简单页改为直接 fetch
  apply('第2项-加载', str => {
    if (URLSLIST.includes(p)) {
      // 备份里已是 URLS + loadXxxGeoJson 结构，保持
      return str
        .replace(/, itemStyle: HSLGeo\.areaStyle\('lit'\)/g, ", itemStyle: { areaColor: 'rgba(0, 180, 100, 0.6)' }")
        .replace(/HSLGeo\.areaStyle\('lit', ?colors\)/g, "{ areaColor: 'rgba(0, 180, 100, 0.6)' }")
        .replace(/HSLGeo\.areaStyle\('lit'\)/g, "{ areaColor: 'rgba(0, 180, 100, 0.6)' }")
        .replace(/HSLGeo\.mapSeriesStyle\(/g, 'mapSeriesStyle(')
        .replace(/HSLGeo\.mapColors\(\)/g, 'mapColors()');
    }
    const file = MAPFILE[p];
    return str
      .replace(/await HSLGeo\.loadGeoJson\('[A-Za-z_]+\.json'\)/g, `await (async () => { const res = await fetch(\`../GeoJSON/${file}.json\`); if (!res.ok) throw new Error('HTTP ' + res.status); return await res.json(); })()`)
      .replace(/HSLGeo\.areaStyle\('lit', ?colors\)/g, "{ areaColor: 'rgba(0, 180, 100, 0.6)' }")
      .replace(/HSLGeo\.areaStyle\('lit'\)/g, "{ areaColor: 'rgba(0, 180, 100, 0.6)' }")
      .replace(/HSLGeo\.mapSeriesStyle\(/g, 'mapSeriesStyle(')
      .replace(/HSLGeo\.mapColors\(\)/g, 'mapColors()');
  });

  // my.html 注释里改 UI 时加的说明
  apply('文案-注释', str => str.replace('// 读取 GeoJSON 目录下的高精度地图文件（HSLGeo 已自动解压）', '// 读取 GeoJSON 目录下的高精度地图文件'));

  // 第3项：series 使用主题配色（保留 UI）
  apply('第3项-主题配色', str => {
    if (!/function mapSeriesStyle\(/.test(str)) {
      const anchor = /(const isMobile = [^\n]*\n)/;
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
      str = str.replace(anchor, m => m + helper);
    }
    if (!/label: Object\.assign\(\{\}, style\.label/.test(str)) {
      // series 里的 label/itemStyle/emphasis 替换成 style.*，并在 setOption 前声明 style
      const setIdx = str.indexOf('myChart.setOption({');
      if (setIdx < 0) return str;
      const m = str.slice(setIdx).match(/^myChart\.setOption\(\{[\s\S]*?\n[ \t]*\}\);/);
      if (!m) return str;
      let block = m[0];
      const labRe = /label:\s*\{[^}]*?\bformatter:([\s\S]*?)\n(?:\s*)\}\s*,\s*(?=itemStyle)/;
      if (labRe.test(block)) {
        block = block.replace(labRe, (mm, fm) => 'label: Object.assign({}, style.label, {\n              formatter:' + fm + '\n            }), ');
      } else {
        const lab2 = /label:\s*\{[^}]*formatter:[^}]*\}\s*,\s*(?=itemStyle)/;
        block = block.replace(lab2, mm => 'label: Object.assign({}, style.label, {' + mm.replace(/^label:\s*\{/, '').replace(/\}\s*,\s*$/, '') + '}), ');
      }
      block = block.replace(/itemStyle:\s*\{\s*areaColor:\s*'#e8ecf1'\s*,\s*borderColor:\s*'#ffffff'\s*,\s*borderWidth:\s*1\s*\}/, 'itemStyle: style.itemStyle');
      block = block.replace(/emphasis:\s*\{\s*itemStyle:\s*\{\s*areaColor:\s*'inherit'\s*\}\s*\}/, 'emphasis: style.emphasis');
      block = 'const style = mapSeriesStyle({ labelShow: true, fontSize: isMobile ? 8 : 10 });\n\n' + block;
      str = str.slice(0, setIdx) + block + str.slice(setIdx + m[0].length);
    }
    return str;
  });

  // 第4项：去掉 setOption 的 backgroundColor 与第二参 true、删除主题切换重绘
  apply('第4项-清理', str => str
    .replace(/\n[ \t]*backgroundColor: 'transparent',/g, '')
    .replace(/\}, true\);/g, '});')
    .replace(/\n[ \t]*\/\/ 深浅主题切换后重绘地图（配色取自主题变量）\n[ \t]*if \(window\.HSLTheme && HSLTheme\.onChange\) \{\n[ \t]*HSLTheme\.onChange\(\(\) => setTimeout\(\(\) => \{ if \(myChart\) renderMap\(\); \}, 30\)\);\n[ \t]*\}/g, ''));

  // 第5项：去掉 is-error 类
  apply('第5项-报错样式', str => str
    .replace(/\n[ \t]*tipEl\.classList\.add\('is-error'\);/g, '')
    .replace(/\n[ \t]*tip\.classList\.add\('is-error'\);/g, ''));

  fs.writeFileSync(root + 'scenery/' + p + '.html', s.split('\n').join(eol), 'utf8');
  console.log(p + ': ' + log.join(' | '));
}
