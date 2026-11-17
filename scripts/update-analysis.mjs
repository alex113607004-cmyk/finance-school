// Official raw monthly responses retained for independent recalculation and provenance.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {historyRows,completedHistoryRows,numeric,isoDate} from '../worker/runtime.mjs';
const now=new Date(),local=new Date(now.getTime()+8*3600000),warnings=[];
const filing=JSON.parse(fs.readFileSync('data/2330-filings.json','utf8'));
const dir='data/stock-day/2330';fs.mkdirSync(dir,{recursive:true});
const sources=[],completeMonths=[],parts=[];
const end=local.getUTCFullYear()*12+local.getUTCMonth();
const months=Array.from({length:end-(2024*12)+1},(_,i)=>{const n=2024*12+i;return `${Math.floor(n/12)}${String(n%12+1).padStart(2,'0')}`});
async function readMonth(month){
  const file=`${dir}/${month}.json`,source=`https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=${month}01&stockNo=2330`;
  let saved;try{saved=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}
  let record=saved,failed=false;
  // Immutable old raw responses; refresh two most recent calendar months for corrections.
  if(!saved||months.indexOf(month)>=months.length-2){
    for(let attempt=0;attempt<3;attempt++){
      try{
        const r=await fetch(source,{signal:AbortSignal.timeout(25000),cache:'no-store'});
        if(!r.ok)throw new Error(`HTTP ${r.status}`);
        const body=await r.json();
        if(body.stat!=='OK'||!body.data?.length||!body.title?.includes('2330'))throw new Error('月份資料尚未公布或格式不符');
        const first=body.data[0][0].split('/');
        if(Number(first[0])+1911!==Number(month.slice(0,4))||Number(first[1])!==Number(month.slice(4,6)))throw new Error('來源回傳錯誤月份');
        record={source,checkedAt:new Date().toISOString(),sha256:crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex'),body};
        fs.writeFileSync(file,JSON.stringify(record)+'\n');failed=false;break;
      }catch(e){failed=true;if(attempt===2)warnings.push(`${month} 更新失敗：${e.message}${saved?'；保留舊資料並停止估值':'；未補值'}`);}
    }
  }
  return {month,record,failed};
}
for(let i=0;i<months.length;i+=3)parts.push(...await Promise.all(months.slice(i,i+3).map(readMonth)));
for(const {month,record,failed} of parts){
  if(!record)continue;
  sources.push({month:month.slice(0,4)+'-'+month.slice(4),url:record.source,checkedAt:record.checkedAt,sha256:record.sha256,refreshFailed:failed});
  if(!failed&&month!==months.at(-1))completeMonths.push(month.slice(0,4)+'-'+month.slice(4));
}
const raw=parts.filter(p=>p.record).map(p=>p.record.body),rows=completedHistoryRows(historyRows(raw),now).map(({date,open,high,low,close,volume})=>({date,open,high,low,close,volume,source:sources.find(s=>s.month===date.slice(0,7))?.url}));
const partial=parts.some(p=>!p.record||p.failed),latest=rows.at(-1);
const quotePart=parts.find(p=>p.month===latest?.date.slice(0,7).replace('-',''));
const quoteRaw=quotePart?.record?.body.data.find(r=>isoDate(r[0])===latest.date),change=numeric(quoteRaw?.[7]);
const quote=latest?{...latest,change,changePercent:change!==null&&latest.close-change>0?change/(latest.close-change)*100:null,checkedAt:quotePart?.record?.checkedAt}:null;
const result={generatedAt:now.toISOString(),stocks:{'2330':{quote,filings:filing,history:{code:'2330',rows,partial,completeMonths,sources,coverageStart:'2024-01-01',basis:'未還原除權息價格；新台幣元／普通股；成交量為股。'},warnings}}};
fs.writeFileSync('src/generated/analysis.json',JSON.stringify(result)+'\n');
console.log(JSON.stringify({analysis:'2330',rows:rows.length,latest:latest?.date,epsQuarter:filing.reports.at(-1)?.periodEnd,warnings}));
