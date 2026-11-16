import fs from 'node:fs';
const html=fs.readFileSync('dist/pages/index.html','utf8');
const assets={'/index.html':{content:html,type:'text/html; charset=utf-8'}};
fs.mkdirSync('dist/server',{recursive:true});fs.writeFileSync('dist/server/index.js','const ASSETS='+JSON.stringify(assets)+';\n'+fs.readFileSync('worker/runtime.mjs','utf8'));
console.log('Sites Worker built; GitHub Pages artifact: dist/pages/index.html');
