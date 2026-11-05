// 全站内联脚本语法检查（vm 编译，不执行）+ 本地引用检查
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
const files = [
  'index.html', 'plane.html', 'scenery.html',
  'plane/skin.html', 'plane/function.html', 'plane/sound.html',
  ...['au', 'bt', 'cn', 'dk', 'is', 'jp', 'kp', 'kr', 'my', 'nz', 'sg', 'tr'].map(p => 'scenery/' + p + '.html')
];
let fail = 0;
for (const f of files) {
  const html = fs.readFileSync(root + f, 'utf8');
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m, n = 0;
  while ((m = re.exec(html))) {
    n++;
    const code = m[1];
    if (!code.trim()) continue;
    try { new vm.Script(code, { filename: f + '#' + n }); }
    catch (e) {
      fail++;
      const line = html.slice(0, m.index + m[0].indexOf(code)).split(/\r?\n/).length;
      console.log('FAIL', f, 'block', n, 'line', line, '->', e.message);
    }
  }
}
console.log('checked', files.length, 'files; syntax failures =', fail);

let missing = 0;
for (const f of files) {
  const html = fs.readFileSync(root + f, 'utf8');
  const dir = path.dirname(root + f);
  const re2 = /(?:src|href)="([^"]+)"/gi;
  let mm;
  while ((mm = re2.exec(html))) {
    const r = mm[1];
    if (/^(https?:|data:|mailto:|#|\/\/)/.test(r)) continue;
    if (r.includes('$') || r.includes('{')) continue;
    const p2 = path.resolve(dir, r.split('?')[0]);
    if (!fs.existsSync(p2)) { missing++; console.log('MISSING', f, '->', r); }
  }
}
console.log('missing local refs =', missing);
