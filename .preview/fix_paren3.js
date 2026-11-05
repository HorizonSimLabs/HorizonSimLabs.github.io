// 把 `... areaColor: 'rgba(0, 180, 100, 0.6)' } } });` 改成 `' } });`
const fs = require('fs');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
for (const p of ['bt', 'dk', 'kp', 'kr', 'sg']) {
  const f = root + 'scenery/' + p + '.html';
  const raw = fs.readFileSync(f, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const lines = raw.split(/\r?\n/);
  const idx = lines.findIndex(l => /mapData\.push/.test(l));
  const old = lines[idx];
  lines[idx] = old.replace(/ \} \} \}\);$/, " } });");
  fs.writeFileSync(f, lines.join(eol), 'utf8');
  console.log(p, lines[idx].trim());
}
