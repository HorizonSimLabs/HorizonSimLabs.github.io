// 回滚 is.html：从本地 Iceland.json + 下钻 → 回到「CDN world.json 抽冰岛整块」
const fs = require('fs');
const F = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/scenery/is.html';
let s = fs.readFileSync(F, 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';
s = s.split(/\r?\n/).join('\n');

function rep(from, to, label) {
  if (s.indexOf(from) === -1) { console.log('MISS', label); return; }
  s = s.replace(from, to);
  console.log('ok   ', label);
}

// 1) head：注释 + geojson-loader 换回 map-style，多余兜底删掉
rep(`  <!-- 只加载 ECharts 库本身；地图数据全部来自本地 ../GeoJSON/Iceland.json -->`,
  `  <!-- 只加载 ECharts 库本身；地图数据从 ECharts 官方 CDN 的 world.json 里抽取 -->`, 'head comment');
rep(`  <script>
    if (!window.echarts) {
      document.write('<script src="https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js"><\\/script>');
    }
  </script>
  <script>
    if (typeof echarts === 'undefined') {
      document.write('<script src="https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js"><\\/script>');
    }
  </script>`,
  `  <script>
    if (!window.echarts) {
      document.write('<script src="https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js"><\\/script>');
    }
  </script>`, 'echarts fallback dedupe');

// 2) i18n：去掉 backCountry
rep(`        langBtn: "Switch to English", backCountry: "← 返回冰岛"`, `        langBtn: "Switch to English"`, 'i18n zh');
rep(`        langBtn: "切换到中文", backCountry: "← Back to Iceland"`, `        langBtn: "切换到中文"`, 'i18n en');

// 3) 删掉 REGION_ZH / PLACE_TO_REGION
const regionStart = s.indexOf('    // 冰岛八大区（GeoJSON/Iceland.json 里的 name → 中文）');
const regionEnd = s.indexOf('    function parseBilingual(text) {');
if (regionStart === -1 || regionEnd === -1) console.log('MISS region block');
else { s = s.slice(0, regionStart) + s.slice(regionEnd); console.log('ok    region consts'); }

// 4) 变量声明
rep(`    let allData = [];          // done.json 解析结果
    let icelandRaw = null;     // GeoJSON/Iceland.json 原始（已解压）
    let currentRegion = null;  // 下钻到的区（null = 全国）`,
  `    let icelandData = null;    // done.json 里属于冰岛的那一条`, 'vars');

// 5) isIcelandName 之后整段（fetchData .. renderMap）重写
const a = s.indexOf('    function isIcelandName(name) {');
const b = s.indexOf('    function hslBrand() {');
if (a === -1 || b === -1) { console.log('MISS fetch/render block'); }
else {
  const block = `    function isIcelandName(name) {
      const n = String(name || '');
      return n.includes('冰岛') || n.toLowerCase().includes('iceland');
    }

    async function fetchData() {
      icelandData = null;
      try {
        const doneRes = await fetch('../done.json?t=' + new Date().getTime());
        if (doneRes.ok) {
          const entries = parseDoneJson(await doneRes.text());
          icelandData = entries.find(item => isIcelandName(item.rawProvince)) || null;
        }
      } catch (e) { console.error("读取 done.json 失败", e); }
    }

    // 世界地图数据走 ECharts 官方 CDN（多源自动降级），再从中抽出冰岛的轮廓
    const WORLD_JSON_URLS = [
      'https://cdn.jsdelivr.net/npm/echarts@4.9.0/map/json/world.json',
      'https://fastly.jsdelivr.net/npm/echarts@4.9.0/map/json/world.json',
      'https://unpkg.com/echarts@4.9.0/map/json/world.json',
      'https://cdnjs.cloudflare.com/ajax/libs/echarts/4.9.0/world.min.json'
    ];

    async function fetchWorldJson() {
      for (const url of WORLD_JSON_URLS) {
        try {
          const res = await fetch(url);
          if (res.ok) return await res.json();
        } catch (e) { console.warn('world.json 读取失败，尝试下一个源：', url); }
      }
      throw new Error('世界地图数据加载失败，请检查网络。');
    }

    async function loadCountryGeoJson(countryName) {
      const worldJson = await fetchWorldJson();
      return extractCountryGeoJson(worldJson, countryName);
    }

    // 兼容各种国家名写法（英文全称 / 三字码 / 大小写）
    function extractCountryGeoJson(worldJson, countryName) {
      const aliases = {
        'Iceland': ['Iceland', 'ISL', '冰岛']
      }[countryName] || [countryName];

      const norm = (s) => (s || '').toString().trim().toLowerCase();
      const wanted = aliases.map(norm);

      const feature = (worldJson.features || []).find(f => {
        if (!f || !f.properties) return false;
        const candidates = [f.properties.name, f.properties.fullname, f.properties.NAME, f.properties.enname];
        return candidates.some(c => c != null && wanted.includes(norm(c)));
      });

      if (!feature) throw new Error('未在世界地图数据中找到：' + countryName);
      return { type: 'FeatureCollection', features: [feature] };
    }

    // ==================== 渲染 ====================
    async function renderMap() {
      myChart.showLoading();
      try {
        const icelandGeoJson = await loadCountryGeoJson('Iceland');

        echarts.registerMap('iceland', icelandGeoJson);
        const isCompleted = icelandData ? true : false;

        const style = mapSeriesStyle({ labelShow: true, fontSize: isMobile ? 9 : 12 });

        myChart.hideLoading();
        tipEl.style.display = 'none';

        myChart.setOption({
          tooltip: { show: false },
          series: [{
            type: 'map',
            map: 'iceland',
            roam: true,
            zoom: 1.2,
            label: style.label,
            itemStyle: style.itemStyle,
            emphasis: style.emphasis,
            selectedMode: false,
            data: [{ name: 'Iceland', itemStyle: { areaColor: isCompleted ? 'rgba(0, 180, 100, 0.6)' : undefined } }]
          }]
        });

        backBtn.style.display = 'inline-flex';
        backBtn.innerText = i18n[currentLang].back;

      } catch (e) {
        console.error("地图加载失败", e);
        myChart.hideLoading();
        tipEl.style.display = 'block';
        tipEl.innerText = currentLang === 'zh'
          ? '地图数据加载失败，请检查网络。'
          : 'Failed to load map data.';
      }
    }

`;
  s = s.slice(0, a) + block + s.slice(b);
  console.log('ok    fetch/world/render block');
}

// 6) updateUI / initApp / 语言按钮 / 点击逻辑
const c = s.indexOf('    function updateUI() {');
const d = s.indexOf(`    document.getElementById('map').addEventListener('click', function (e) {`);
if (c === -1 || d === -1) { console.log('MISS tail block'); }
else {
  const tail = `    function updateUI() {
      langBtn.innerText = i18n[currentLang].langBtn;
      backBtn.innerText = i18n[currentLang].back;
    }

    async function initApp() {
      updateUI();
      await fetchData();
      await renderMap();
    }

    initApp();

    langBtn.addEventListener('click', async () => {
      currentLang = currentLang === 'zh' ? 'en' : 'zh';
      updateUI();
      await fetchData();
      await renderMap();
    });

    myChart.on('click', function () {
      if (!icelandData) return;
      const html = buildHtml(icelandData.author, icelandData.freeLink, icelandData.freeLevel,
                             icelandData.paidLink, icelandData.paidLevel, icelandData.remark);
      showTooltipAt(html, window.innerWidth / 2 - 180, window.innerHeight / 2 - 150);
    });

`;
  s = s.slice(0, c) + tail + s.slice(d);
  console.log('ok    tail block');
}

// 7) 去掉主题切换重绘
rep(`
    if (window.HSLTheme && HSLTheme.onChange) {
      HSLTheme.onChange(function () { setTimeout(function () { renderMap(); }, 30); });
    }
`, `
`, 'theme redraw');

fs.writeFileSync(F, s.split('\n').join(eol), 'utf8');
console.log('lines', s.split('\n').length);
