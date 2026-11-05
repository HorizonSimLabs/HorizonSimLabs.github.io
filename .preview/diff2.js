// 逐行比对：当前页 vs backup（改UI前），用于精确定位要回填的块
const fs = require('fs');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
const page = process.argv[2];
const cur = fs.readFileSync(root + 'scenery/' + page + '.html', 'utf8').split(/\r?\n/);
const old = fs.readFileSync(root + '.preview/scenery_backup/' + page + '.html', 'utf8').split(/\r?\n/);
const n = old.length, m = cur.length;
const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
  dp[i][j] = old[i] === cur[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
let i = 0, j = 0; const ops = [];
while (i < n && j < m) {
  if (old[i] === cur[j]) { i++; j++; }
  else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ t: '-', o: i, old: old[i] }); i++; }
  else { ops.push({ t: '+', c: j, cur: cur[j] }); j++; }
}
while (i < n) { ops.push({ t: '-', o: i, old: old[i] }); i++; }
while (j < m) { ops.push({ t: '+', c: j, cur: cur[j] }); j++; }
// 只保留包含关键字的差异
const KEY = /setOption|style = mapSeriesStyle|backgroundColor|\}, true\)|^\s*\}\);\s*$|_GEOJSON_URLS|loadXxx|function load|areaStyle|HSLTheme/;
const out = ops.filter(x => KEY.test(x.t === '-' ? x.old : x.cur));
console.log(out.map(x => x.t + ' ' + ((x.o != null ? x.o : x.c) + 1) + '| ' + JSON.stringify(x.t === '-' ? x.old : x.cur).slice(0, 200)).join('\n'));
