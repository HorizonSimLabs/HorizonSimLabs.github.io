// 比较 backup(改UI前) 与当前页，输出：backup 中有、当前页缺失的行（-）与当前页新增的行（+）
const fs = require('fs');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
const page = process.argv[2];
const cur = fs.readFileSync(root + 'scenery/' + page + '.html', 'utf8').split(/\r?\n/);
const old = fs.readFileSync(root + '.preview/scenery_backup/' + page + '.html', 'utf8').split(/\r?\n/);
const n = old.length, m = cur.length;
const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
  dp[i][j] = old[i] === cur[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
let i = 0, j = 0; const minus = [], plus = [];
while (i < n && j < m) {
  if (old[i] === cur[j]) { i++; j++; }
  else if (dp[i + 1][j] >= dp[i][j + 1]) { minus.push((i + 1) + '| ' + old[i]); i++; }
  else { plus.push((j + 1) + '| ' + cur[j]); j++; }
}
while (i < n) { minus.push((i + 1) + '| ' + old[i]); i++; }
while (j < m) { plus.push((j + 1) + '| ' + cur[j]); j++; }
console.log('=== 改UI前有、现在没有 (' + minus.length + ') ===');
console.log(minus.join('\n'));
console.log('=== 现在有、改UI前没有 (' + plus.length + ') ===');
console.log(plus.map(l => l.length > 260 ? l.slice(0, 260) + ' …[' + l.length + ']' : l).join('\n'));
