import fs from 'node:fs';
const html=fs.readFileSync('dist/pages/index.html','utf8');
const assets={'/index.html':{content:html,type:'text/html; charset=utf-8'},'/market-data.json':{content:fs.readFileSync('dist/pages/market-data.json','utf8'),type:'application/json; charset=utf-8'}};
assets['/analysis-data.json']={content:fs.readFileSync('dist/pages/analysis-data.json','utf8'),type:'application/json; charset=utf-8'};
assets['/universe-data.json']={content:fs.readFileSync('dist/pages/universe-data.json','utf8'),type:'application/json; charset=utf-8'};
const historyDir='dist/pages/stock-history/TPEX';if(fs.existsSync(historyDir))for(const file of fs.readdirSync(historyDir))assets['/stock-history/TPEX/'+file]={content:fs.readFileSync(historyDir+'/'+file,'utf8'),type:'application/json; charset=utf-8'};
fs.mkdirSync('dist/server',{recursive:true});fs.writeFileSync('dist/server/index.js','const ASSETS='+JSON.stringify(assets)+';\n'+fs.readFileSync('worker/runtime.mjs','utf8'));
console.log('Sites Worker built; GitHub Pages artifact: dist/pages/index.html');
