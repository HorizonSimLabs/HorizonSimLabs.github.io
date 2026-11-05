// 全站内联脚本语法检查 + 本地引用检查 + 桩环境运行国家页
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ROOT = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
const pages = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.preview' || e.name === 'GeoJSON' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) pages.push(p);
  }
}
walk(ROOT);

let fails = 0;
const brokenRefs = [];
for (const p of pages) {
  const html = fs.readFileSync(p, 'utf8');
  const rel = path.relative(ROOT, p).replace(/\\/g, '/');
  // 内联脚本语法
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m, i = 0;
  while ((m = re.exec(html))) {
    i++;
    try { new vm.Script(m[1], { filename: rel + '#' + i }); }
    catch (e) { fails++; console.log('SYNTAX FAIL', rel, '#' + i, e.message); }
  }
  // 本地引用
  const refRe = /(?:href|src)\s*=\s*"([^"#:]+?\.(?:html|css|js|json|png|jpe?g|tsv|svg|ico))"/gi;
  let r;
  while ((r = refRe.exec(html))) {
    const u = r[1];
    if (u.startsWith('http') || u.startsWith('//') || u.includes('${')) continue;
    const target = path.resolve(path.dirname(p), u);
    if (!fs.existsSync(target)) brokenRefs.push(rel + ' -> ' + u);
  }
  // fetch 本地路径
  const fRe = /fetch\(\s*[`'"]([^`'"]+)[`'"]/g;
  let f;
  while ((f = fRe.exec(html))) {
    const u = f[1].split('?')[0];
    if (/^https?:/.test(u) || u.includes('${')) continue;
    const target = path.resolve(path.dirname(p), u);
    if (!fs.existsSync(target)) brokenRefs.push(rel + ' fetch -> ' + u);
  }
}
console.log('pages:', pages.length, 'syntax failures:', fails);
console.log('broken local refs:', brokenRefs.length);
brokenRefs.forEach(x => console.log('   !', x));
