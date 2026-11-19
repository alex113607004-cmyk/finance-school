import fs from 'node:fs';
import {parseFundNAV,NAV_SOURCE,NAV_DATASET} from '../src/etf-nav.js';
const file='src/generated/etf-nav.json',cache='data/etf-nav-cache.json',now=new Date(),catalog=JSON.parse(fs.readFileSync('src/generated/universe-catalog.json','utf8')).stocks;
let old={schemaVersion:1,stocks:{},history:{}};try{old=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}
try{const prior=JSON.parse(fs.readFileSync(cache,'utf8'));if(prior.schemaVersion===1&&prior.stocks&&prior.checkedAt>old.checkedAt)old=prior;}catch{}
if(process.argv.includes('--offline')){console.log(JSON.stringify({offline:true,stocks:Object.keys(old.stocks).length}));process.exit(0);}
let next;
try{
 const response=await fetch(NAV_SOURCE,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('HTTP '+response.status);
 const bytes=await response.arrayBuffer(),text=new TextDecoder('utf-8',{fatal:true}).decode(bytes),incoming=parseFundNAV(text,catalog,{now}),stocks={...old.stocks},history={...old.history};
 for(const [id,nav]of Object.entries(incoming)){
  const observations=[nav,old.stocks[id],...(old.history?.[id]||[])].filter(Boolean),byDate=new Map();
  for(const item of observations)if(!byDate.has(item.date))byDate.set(item.date,item);
  const sorted=[...byDate.values()].sort((a,b)=>b.date.localeCompare(a.date));stocks[id]=sorted[0];history[id]=sorted.slice(1,8);
 }
 next={schemaVersion:1,generatedAt:now.toISOString(),checkedAt:now.toISOString(),source:NAV_SOURCE,dataset:NAV_DATASET,license:{name:'政府資料開放授權條款第1版',url:'https://data.gov.tw/license',checkedOn:'2026-11-19'},stocks,history,warnings:[]};
}catch(e){next={...old,warnings:['官方每日基金淨值更新失敗（'+e.message+'），保留原始淨值日期與查核時間。']};}
fs.writeFileSync(file+'.tmp',JSON.stringify(next)+'\n');fs.renameSync(file+'.tmp',file);
fs.writeFileSync(cache+'.tmp',JSON.stringify(next)+'\n');fs.renameSync(cache+'.tmp',cache);
console.log(JSON.stringify({stocks:Object.keys(next.stocks).length,checkedAt:next.checkedAt,warnings:next.warnings}));
