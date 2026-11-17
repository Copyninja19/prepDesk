import {mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import {extname} from 'node:path';
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.woff2':'font/woff2','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8','.webmanifest':'application/manifest+json'};
const assets = {};
for (const file of await readdir('web')) {
  const extension = extname(file);
  if (!types[extension]) continue;
  const data = await readFile('web/'+file);
  const binary = ['.png','.woff2','.ttf'].includes(extension);
  assets['/'+file] = {type:types[extension],binary,data:data.toString(binary?'base64':'utf8')};
}
await mkdir('dist/server',{recursive:true});
const validation = await readFile('worker/validate.mjs','utf8');
const worker = (await readFile('worker/index.mjs','utf8')).replace("import './validate.mjs';", validation);
await writeFile('dist/server/index.js',worker.replace("import assets from './assets.js';",'const assets = '+JSON.stringify(assets)+';'));
