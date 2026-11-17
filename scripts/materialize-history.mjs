// Recreate same-origin OTC assets from committed, normalized official daily archives.
// Runs before dev/build so a fresh clone works without a backend or new downloads.
import fs from 'node:fs';
import {validCandle} from '../src/stock-analysis.js';
const source='src/generated/universe.json',archive='data/universe/tpex-days',out='src/generated/histories/TPEX';
if(!fs.existsSync(source)||!fs.existsSync(archive))throw Error('缺少全市場快照；請先執行 npm run update:universe。');
const u=JSON.parse(fs.readFileSync(source,'utf8')),metadata=u.history?.TPEX||{},all=fs.readdirSync(archive).filter(f=>/^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
const files=all.filter(f=>(!metadata.coverageStart||f.slice(0,10)>=metadata.coverageStart)&&(!metadata.coverageEnd||f.slice(0,10)<=metadata.coverageEnd));
const reports=files.map(f=>JSON.parse(fs.readFileSync(archive+'/'+f,'utf8'))),grouped={};
for(const report of reports)for(const raw of report.rows){const r={...raw,date:report.date,source:report.source,checkedAt:report.checkedAt};if(validCandle(r))(grouped[r.code]??=[]).push(r);}
fs.mkdirSync(out,{recursive:true});let count=0;
for(const stock of Object.values(u.stocks).filter(s=>s.market==='TPEX')){
 const rows=(grouped[stock.code]||[]).sort((a,b)=>a.date.localeCompare(b.date)),dates=new Set(rows.map(r=>r.date));
 const sources=reports.filter(r=>!r.closed&&dates.has(r.date)).map(r=>({url:r.source,label:r.date,date:r.date,checkedAt:r.checkedAt}));
 const value={code:stock.code,market:'TPEX',rows,partial:!!metadata.failedDates?.length,sources,coverageStart:metadata.coverageStart||files[0]?.slice(0,10),completeMonths:[],nonTradingDays:reports.filter(r=>r.closed).map(r=>r.date),failedDates:metadata.failedDates||[],fetchedAt:sources.map(s=>s.checkedAt).sort().at(-1)||null,basis:'櫃買中心未還原價格；成交量為股；原日報若為張／仟股已換算。'};
 fs.writeFileSync(`${out}/${stock.code}.json`,JSON.stringify(value)+'\n');count++;
}
console.log(`Rebuilt ${count} OTC history assets from ${reports.length} official daily archives.`);
