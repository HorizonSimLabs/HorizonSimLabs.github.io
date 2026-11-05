// cn.html：把「本地 China.json 渲染」换成「阿里云 DataV 渲染」（保留主题配色）
const fs = require('fs');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
const f = root + 'scenery/cn.html';
let s = fs.readFileSync(f, 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';
s = s.split(/\r?\n/).join('\n');

// ---- 1) 注释块 ----
s = s.replace(
  /    \/\/ ==================== 本地 GeoJSON\/China\.json ====================[\s\S]*?\n    \/\/ 全国视图：返回 \{ geoJson, featureNames, nameToShort \}\n    \/\/ 省级轮廓：把该省所有子要素的多边形直接合并成一个 MultiPolygon\n/,
  `    // ==================== 地图数据（阿里云 DataV） ====================
    // 全国视图取 100000_full，省级下钻取 <adcode>_full。
`
);

// ---- 2) renderMap 头部：数据获取 ----
s = s.replace(
  /      try \{\n        if \(!chinaRawGeoJson\) \{\n          chinaRawGeoJson = await HSLGeo\.loadGeoJson\(CHINA_GEOJSON_FILE\);\n        \}\n\n        const isNational = !mapId;\n\n        let frame;\n        if \(isNational\) \{\n          frame = buildProvinceGeoJson\(chinaRawGeoJson\);\n          if \(!frame \|\| !frame\.geoJson\.features\.length\) throw new Error\('China\.json 中没有找到可用的省级要素'\);\n          echarts\.registerMap\('china', frame\.geoJson\);\n        \} else \{\n          frame = buildSubMapGeoJson\(chinaRawGeoJson, topCode\(mapId\)\);\n          if \(!frame\) throw new Error\('China\.json 中没有找到该省的下级行政区'\);\n          echarts\.registerMap\('cn_sub', frame\.geoJson\);\n        \}\n\n        const currentMapName = isNational \? 'china' : 'cn_sub';\n        const colors = HSLGeo\.mapColors\(\);\n/,
  `      try {
        const isNational = !mapId;
        const targetId = isNational ? '100000' : String(mapId);
        const currentMapName = isNational ? 'china' : 'cn_sub';

        const geoRes = await fetch(\`https://geo.datav.aliyun.com/areas_v3/bound/\${targetId}_full.json\`);
        if (!geoRes.ok) throw new Error('HTTP ' + geoRes.status);
        const geoJson = await geoRes.json();
        echarts.registerMap(currentMapName, geoJson);

        const featureNames = (geoJson.features || [])
          .map(f => (f.properties && f.properties.name) ? f.properties.name : '')
          .filter(Boolean);
        const colors = HSLGeo.mapColors();
`
);

// ---- 3) 遍历对象：frame.featureNames → featureNames；featureShort 回退 ----
s = s.replace('        frame.featureNames.forEach(featureName => {', '        featureNames.forEach(featureName => {');
s = s.replace(
  "          const featureShort = frame.nameToShort[featureName] || provinceShortMap[featureName] || featureName;",
  "          const featureShort = provinceShortMap[featureName] || featureName;"
);

// ---- 4) 主题样式函数 ----
s = s.replace(
  /        const style = HSLGeo\.mapSeriesStyle\(\{\n          labelShow: true,\n          fontSize: isMobile \? 7 : 10\n        \}\);/,
  `        const style = mapSeriesStyle({ labelShow: true, fontSize: isMobile ? 7 : 10 });`
);

// ---- 5) setOption 清理 ----
s = s.replace(/\n        myChart\.setOption\(\{\n          backgroundColor: 'transparent',/, '\n        myChart.setOption({');
s = s.replace(/\n          \}\]\n        \}, true\);/, '\n          }]\n        });');

// ---- 6) 报错文案 ----
s = s.replace(
  /          tip\.classList\.add\('is-error'\);\n          tip\.innerText = currentLang === 'zh'\n            \? '加载本地 GeoJSON\/China\.json 失败，请检查文件是否存在。'\n            : 'Failed to load local GeoJSON\/China\.json\.';/,
  `          tip.innerText = currentLang === 'zh'
            ? '地图数据加载失败，请检查网络或数据源。'
            : 'Failed to load map data.';`
);

// ---- 7) 去掉主题切换重绘 ----
s = s.replace(
  /\n    \/\/ 深浅主题切换后重绘地图（配色取自主题变量）\n    if \(window\.HSLTheme && HSLTheme\.onChange\) \{\n      HSLTheme\.onChange\(\(\) => setTimeout\(\(\) => \{ if \(myChart\) renderMap\(currentMapId, currentMapId !== null\); \}, 30\)\);\n    \}\n/,
  '\n'
);

// ---- 8) 点击逻辑恢复原版（无双击状态机、桌面端下钻后不居中显示卡片） ----
const clickOld = s.slice(s.indexOf('    let lastClickTime = 0;'), s.indexOf("    myChart.getZr().on('click'"));
const clickNew = `    myChart.on('click', function (params) {
      const provinceName = params.name;

      const cleanProvName = (provinceShortMap[provinceName] || provinceName.replace(/(省|市|自治区|特别行政区)/g, '')).trim();
      let canDrill = false;

      for (let prov of allowedDrillProvinces) {
        const pShort = (provinceShortMap[prov] || prov.replace(/(省|市|自治区)/g, '')).trim();
        if (pShort === cleanProvName) {
          canDrill = true;
          break;
        }
      }

      if (isMobile) {
        if (canDrill && backBtn.style.display === 'none') {
          let mapId = null;
          for (let key in provinceCodeMap) {
            const shortKey = (provinceShortMap[key] || key.replace(/(省|市|自治区)/g, '')).trim();
            if (shortKey === cleanProvName) {
              mapId = provinceCodeMap[key];
              break;
            }
          }
          if (mapId) {
            tooltipEl.style.display = 'none';
            renderMap(mapId, true);
          }
        } else if (provinceDataMap[provinceName]) {
          tooltipEl.innerHTML = provinceDataMap[provinceName];
          tooltipEl.style.display = 'block';
          tooltipEl.style.left = '50%';
          tooltipEl.style.top = 'auto';
          tooltipEl.style.bottom = '50px';
          tooltipEl.style.transform = 'translateX(-50%)';
        } else {
          tooltipEl.style.display = 'none';
        }
      } else {
        if (canDrill && backBtn.style.display === 'none') {
          let mapId = null;
          for (let key in provinceCodeMap) {
            const shortKey = (provinceShortMap[key] || key.replace(/(省|市|自治区)/g, '')).trim();
            if (shortKey === cleanProvName) {
              mapId = provinceCodeMap[key];
              break;
            }
          }
          if (mapId) {
            renderMap(mapId, true);
          }
        }
      }
    });

`;
if (!clickOld || !clickOld.includes('lastClickTime')) { console.log('WARN 点击逻辑块未找到'); }
s = s.replace(clickOld, clickNew);

fs.writeFileSync(f, s.split('\n').join(eol), 'utf8');
console.log('cn.html 已改回 DataV 版');
console.log('残留检查:', ['HSLGeo', 'chinaRawGeoJson', 'frame.', 'lastClickTime'].map(k => k + '=' + (s.match(new RegExp(k.replace('.', '\\.'), 'g')) || []).length).join(' '));
