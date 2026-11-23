import {industryInfo} from '../src/industries.js';
// Shared all-market snapshots + bounded TPEx daily archives. No per-visitor CORS proxy.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {normalizeMarket,mergeMarkets,addPeerContext,universeCounts,parseTpexDaily,TPEX_API,securityKind} from '../src/stock-universe.js';
import {completedDateCandidates} from '../worker/runtime.mjs';
import {validCandle} from '../src/stock-analysis.js';
const now=new Date(),local=new Date(now.getTime()+8*3600000),today=local.toISOString().slice(0,10),checks={},warnings=[];
const file='src/generated/universe.json',archive='data/universe/tpex-days';fs.mkdirSync(archive,{recursive:true});
let previous;try{previous=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}
async function read(url){
 for(let n=0;n<3;n++)try{const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(35000),headers:{Accept:'application/json'}});if(!r.ok)throw Error('HTTP '+r.status);const body=await r.json();checks[url]=new Date().toISOString();return body;}catch(e){if(n===2)throw e;}
}
async function optional(url){try{const body=await read(url);if(!Array.isArray(body))throw Error('來源格式錯誤');return body;}catch(e){warnings.push(`${url.split('/').at(-1)}：${e.message}`);return [];}}
const twse=JSON.parse(fs.readFileSync('src/generated/market.json','utf8'));
// Reuse already fetched TWSE quote/revenue data; enrich all accounting industries.
const families=['ci','basi','fh','bd','ins','mim'];
async function financials(market,sheet){
 const data=[];
 for(let i=0;i<families.length;i+=3){
  const parts=await Promise.all(families.slice(i,i+3).map(async family=>{
   const url=market==='TWSE'?`https://openapi.twse.com.tw/v1/opendata/t187ap${sheet}_L_${family}`:`${TPEX_API}mopsfin_t187ap${sheet}_${market==='TPEX'?'O':'U'}_${family}`;
   const rows=await optional(url);return rows.map(r=>({...r,_source:url,_checkedAt:checks[url]}));
  }));data.push(...parts.flat());
 }
 return data;
}
let stocks;
if(process.argv.includes('--reuse-universe')&&previous?.stocks)stocks=previous.stocks;
else {
const listed={...twse.stocks};for(const s of Object.values(listed)){s.market='TWSE';s.securityKind=securityKind(s.code,s.company)||'stock';}
const allListedIncome=await financials('TWSE','06');
const {enrichIncome,normalizeFinancial,normalizeCompany}=await import('../src/stock-universe.js');
for(const s of Object.values(listed)){
 const row=allListedIncome.find(r=>(r['公司代號']||r.SecuritiesCompanyCode)===s.code);if(row)listed[s.code]=enrichIncome(s,row,row._source,row._checkedAt);
}
// Company registries include temporarily suspended/new listings even with no current quote.
const listedCompaniesURL='https://openapi.twse.com.tw/v1/opendata/t187ap03_L',listedCompanies=await optional(listedCompaniesURL);
const registered=normalizeMarket({market:'TWSE',companies:listedCompanies,income:allListedIncome,sources:{companies:listedCompaniesURL},sourceChecks:{companies:checks[listedCompaniesURL]}});
for(const [code,s] of Object.entries(registered))if(!listed[code])listed[code]=s;
const collected={TWSE:listed};
for(const market of ['TPEX','ESB']){
 const endpoints=market==='TPEX'?{quotes:'tpex_mainboard_daily_close_quotes',companies:'mopsfin_t187ap03_O',revenue:'mopsfin_t187ap05_O',valuation:'tpex_mainboard_peratio_analysis'}:{quotes:'tpex_esb_latest_statistics',companies:'mopsfin_t187ap03_R',revenue:'t187ap05_R'};
 const sources=Object.fromEntries(Object.entries(endpoints).map(([k,e])=>[k,TPEX_API+e])),datasets={};
 if(market==='TPEX'){
  for(const date of completedDateCandidates(now)){
   const url=`https://www.tpex.org.tw/www/zh-tw/afterTrading/dailyQuotes?date=${date.slice(0,4)}/${date.slice(4,6)}/${date.slice(6)}&response=json`;
   try{const body=await read(url),allowed=new Set((body.tables||[]).flatMap(t=>(t.data||[]).map(r=>String(r[0]))).filter(c=>securityKind(c)));
    const rows=parseTpexDaily(body,allowed,url,checks[url]);if(!rows.length)continue;
    datasets.quotes=rows.map(r=>({Date:r.date.replaceAll('-',''),SecuritiesCompanyCode:r.code,CompanyName:r.name,Close:r.close,Open:r.open,High:r.high,Low:r.low,Change:r.change,TradingShares:r.volume}));sources.quotes=url;break;
   }catch(e){/* A holiday or not-yet-published report can fall back to the official latest API. */}
  }
 }
 for(const [k,url] of Object.entries(sources))if(!datasets[k])datasets[k]=await optional(url);
 datasets.income=await financials(market,'06');datasets.balance=await financials(market,'07');
 const sourceChecks=Object.fromEntries(Object.entries(sources).map(([k,u])=>[k,checks[u]||null]));
 collected[market]=normalizeMarket({market,...datasets,sources,sourceChecks});
 // Preserve truthful prior records on a market-wide outage, rather than silently remove them.
 if(!datasets.companies.length&&previous)for(const s of Object.values(previous.stocks).filter(s=>s.market===market))if(!collected[market][s.code])collected[market][s.code]={...s,warnings:[...(s.warnings||[]),'本次市場來源更新失敗，保留前次資料日期。']};
 console.log(JSON.stringify({market,count:Object.keys(collected[market]).length}));
}
stocks=addPeerContext(mergeMarkets(collected.TWSE,collected.TPEX,collected.ESB));
for(const s of Object.values(stocks)){
 const old=previous?.stocks?.[s.code];
 if(!old||old.market!==s.market||old.company?.fullName!==s.company?.fullName)continue;
 for(const key of ['earnings','balance','revenue'])if(!s.fundamentals?.[key]&&old.fundamentals?.[key]){
  s.fundamentals[key]=old.fundamentals[key];s.sources[key]=old.sources?.[key];s.sourceChecks[key]=old.sourceChecks?.[key];s.warnings=[...(s.warnings||[]),`${key} 本次來源未提供，保留前次財報期間與原擷取時間。`];
 }
}
}
if(Object.keys(stocks).length<2000)throw Error('全市場來源不完整，保留已發布版本。');
for(const s of Object.values(stocks))if(s.quote&&!(s.quote.close>0))s.quote.close=null;
const otcCodes=new Set(Object.values(stocks).filter(s=>s.market==='TPEX').map(s=>s.code));
// A single whole-market request per date supplies every OTC equity; do not issue
// thousands of individual stock×month requests. Archives reused after first bootstrap.
const days=[];const cursor=new Date(Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate()));
if(local.getUTCHours()*60+local.getUTCMinutes()<810)cursor.setUTCDate(cursor.getUTCDate()-1);
while(days.length<78){if(![0,6].includes(cursor.getUTCDay()))days.push(cursor.toISOString().slice(0,10));cursor.setUTCDate(cursor.getUTCDate()-1);}
const failed=[];
async function day(date){
 const target=`${archive}/${date}.json`,source=`https://www.tpex.org.tw/www/zh-tw/afterTrading/dailyQuotes?date=${date.replaceAll('-','/')}&response=json`;
 let saved;try{saved=JSON.parse(fs.readFileSync(target,'utf8'));}catch{}
 if(saved?.schemaVersion>=2&&days.indexOf(date)>1)return saved;
 try{
  const body=await read(source);if(!('stat'in body)||String(body.date).replaceAll('/','')!==date.replaceAll('-',''))throw Error('日期或格式錯誤');
  const allowed=new Set((body.tables||[]).flatMap(t=>(t.data||[]).map(r=>String(r[0]))).filter(c=>securityKind(c)));
  const rows=parseTpexDaily(body,allowed,source,checks[source]);
  if(String(body.stat).toLowerCase()==='ok'&&!rows.length&&(body.tables||[]).some(t=>t.data?.length))throw Error('官方表格欄位無法辨認');
  const item={schemaVersion:3,date,source,checkedAt:checks[source],sha256:crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex'),closed:!rows.length,rows:rows.map(({code,name,open,high,low,close,volume,change})=>({code,name,open,high,low,close,volume,change}))};
  fs.writeFileSync(target,JSON.stringify(item)+'\n');return item;
 }catch(e){failed.push(date);warnings.push(`${date} 上櫃歷史日報更新失敗：${e.message}`);return saved||null;}
}
const reports=[];
for(let i=0;i<days.length;i+=3){reports.push(...await Promise.all(days.slice(i,i+3).map(day)));if(i%15===0)console.log(JSON.stringify({otcHistory:Math.min(i+3,days.length),total:days.length}));}
// Retain older cached observations (up to 14 months) as the daily archive grows.
const oldestAllowed=new Date(Date.UTC(local.getUTCFullYear(),local.getUTCMonth()-13,1)).toISOString().slice(0,10);
for(const f of fs.readdirSync(archive).filter(f=>/^\d{4}-\d{2}-\d{2}\.json$/.test(f))){const date=f.slice(0,10);if(date<days.at(-1)&&date>=oldestAllowed)reports.push(JSON.parse(fs.readFileSync(archive+'/'+f,'utf8')));}
const coverageStart=reports.filter(Boolean).map(r=>r.date).sort()[0]||days.at(-1);
const histories={},nonTradingDays=reports.filter(r=>r?.closed).map(r=>r.date);
for(const report of reports.filter(Boolean)){
 if(report.schemaVersion<3){report.rows=report.rows.map(({code,name,open,high,low,close,volume,change})=>({code,name,open,high,low,close,volume,change}));report.schemaVersion=3;fs.writeFileSync(`${archive}/${report.date}.json`,JSON.stringify(report)+'\n');}
 for(const raw of report.rows){const r={...raw,date:report.date,source:report.source,checkedAt:report.checkedAt};if(!histories[r.code])histories[r.code]=[];if(validCandle(r))histories[r.code].push(r);}
}
const outDir='src/generated/histories/TPEX';fs.mkdirSync(outDir,{recursive:true});
for(const code of otcCodes){
 const rows=(histories[code]||[]).sort((a,b)=>a.date.localeCompare(b.date));
 const sources=reports.filter(r=>r&&!r.closed).map(r=>({url:r.source,label:r.date,date:r.date,checkedAt:r.checkedAt}));
 const history={code,market:'TPEX',rows,partial:failed.length>0,sources,coverageStart,completeMonths:[],nonTradingDays,failedDates:failed,fetchedAt:sources.map(s=>s.checkedAt).sort().at(-1),basis:'櫃買中心未還原價格；股；原日報成交仟股／張已換算為股。'};
 fs.writeFileSync(`${outDir}/${code}.json`,JSON.stringify(history)+'\n');
 const last=rows.at(-1),stock=stocks[code];
 if(last&&last.date>=(stock.quote?.date||'')){
  const prev=last.change!==null?last.close-last.change:null;
  stock.quote={...last,changePercent:prev>0?last.change/prev*100:null};stock.sources.quotes=last.source;stock.sourceChecks.quotes=last.checkedAt;
 }
}
const snapshot={schemaVersion:1,generatedAt:now.toISOString(),stocks,counts:universeCounts(stocks),warnings,history:{TPEX:{coverageStart,coverageEnd:days[0],days:reports.filter(r=>r&&!r.closed).length,failedDates:failed}}};
fs.writeFileSync(file,JSON.stringify(snapshot)+'\n');
// A lightweight bundled catalog lets search + market identity work while refreshing.
fs.writeFileSync('src/generated/universe-catalog.json',JSON.stringify({generatedAt:snapshot.generatedAt,counts:snapshot.counts,stocks:Object.fromEntries(Object.values(stocks).map(s=>[s.code,{code:s.code,name:s.name,market:s.market,securityKind:s.securityKind,company:s.company,industry:industryInfo(s,'TW'),quote:s.quote,sources:{quotes:s.sources.quotes,companies:s.sources.companies},sourceChecks:{quotes:s.sourceChecks.quotes}}]))})+'\n');
console.log(JSON.stringify({counts:snapshot.counts,otcHistory:snapshot.history.TPEX,warnings}));
