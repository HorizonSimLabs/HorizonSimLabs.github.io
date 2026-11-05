// 用 .preview/scenery_backup/<page>.html 覆盖 scenery/<page>.html
const fs = require('fs');
const root = 'C:/Users/KSYGS/Desktop/HorizonSimLabs.github.io-main/';
for (const p of process.argv.slice(2)) {
  fs.copyFileSync(root + '.preview/scenery_backup/' + p + '.html', root + 'scenery/' + p + '.html');
  console.log('copied', p);
}
