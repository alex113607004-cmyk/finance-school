import fs from 'node:fs';
import {collectOverview} from './overview-collector.mjs';
const file='src/generated/market-overview.json',universe=JSON.parse(fs.readFileSync('src/generated/universe.json','utf8')).stocks;
let old;try{old=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}
const snapshot=await collectOverview({old,universe});
fs.writeFileSync(file+'.tmp',JSON.stringify(snapshot)+'\n');fs.renameSync(file+'.tmp',file);
console.log(JSON.stringify({generatedAt:snapshot.generatedAt,markets:snapshot.markets,count:snapshot.stocks.length,limitUp:snapshot.stocks.filter(s=>s.limit.status==='up').length,limitDown:snapshot.stocks.filter(s=>s.limit.status==='down').length}));
