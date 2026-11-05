// 找出 bt 内联脚本里括号不平衡的位置
const fs = require('fs');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
const page = process.argv[2];
const html = fs.readFileSync(root + 'scenery/' + page + '.html', 'utf8');
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m, n = 0;
while ((m = re.exec(html))) {
  n++;
  if (n !== 2) continue;
  const code = m[1];
  const startLine = html.slice(0, m.index + m[0].indexOf(code)).split(/\r?\n/).length;
  let depth = 0, line = startLine;
  let i = 0;
  const stack = [];
  let inStr = null, q = '';
  for (; i < code.length; i++) {
    const ch = code[i];
    if (ch === '\n') { line++; continue; }
    if (inStr) {
      if (ch === '\\') { i++; continue; }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === '/' && code[i + 1] === '/') { while (i < code.length && code[i] !== '\n') i++; line++; continue; }
    if (ch === '/' && code[i + 1] === '*') { i += 2; while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) { if (code[i] === '\n') line++; i++; } i++; continue; }
    if ('{(['.includes(ch)) stack.push({ ch, line });
    if ('})]'.includes(ch)) {
      const top = stack.pop();
      if (!top) { console.log('多余闭合', ch, 'line', line); break; }
    }
  }
  console.log(page, '剩余未闭合:', stack.map(s => s.ch + '@' + s.line).join(', '));
  break;
}
