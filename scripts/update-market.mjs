// Public official data only. Build a dated snapshot for GitHub Pages; no API key.
import fs from 'node:fs';
import {API,ENDPOINTS,stockData,historyRows,completedDateCandidates,applyDatedValuation,preferHistoryQuote,peerStatistics,historyURLs,completedHistoryRows,suppressIncompleteAverages} from '../worker/runtime.mjs';
const output='src/generated/market.json',checks={},now=new Date(),local=new Date(now.getTime()+8*3600000);
const read=async url=>{for(let attempt=0;attempt<3;attempt++){try{const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(25000),headers:{Accept:'application/json'}});if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json();checks[url]=new Date().toISOString();return j}catch(e){if(attempt===2)throw new Error(url+': '+e.message)}}};
const keys=Object.keys(ENDPOINTS),results=await Promise.allSettled(keys.map(k=>read(API+ENDPOINTS[k]))),datasets=Object.fromEntries(keys.map((k,i)=>[k,results[i].status==='fulfilled'&&Array.isArray(results[i].value)?results[i].value:[]]));
if(!datasets.quotes.length)throw new Error('Quote source unavailable: keep the existing deployed snapshot instead of inventing today’s data.');
const warnings=keys.filter((k,i)=>results[i].status==='rejected').map(k=>`${k} 來源本次查詢失敗`),sourceChecks=Object.fromEntries(keys.map(k=>[k,checks[API+ENDPOINTS[k]]||null]));
const snapshot={generatedAt:new Date().toISOString(),stocks:{},histories:{},sourceChecks,warnings};
for(const q of datasets.quotes){if(!/^[0-9A-Z]{4,6}$/.test(q.Code))continue;snapshot.stocks[q.Code]={...stockData(q.Code,datasets,{fetchedAt:sourceChecks.quotes,warnings}),sourceChecks,mode:'daily-snapshot'};}
const dated=await Promise.allSettled(completedDateCandidates(now).map(async date=>{const source=`https://www.twse.com.tw/exchangeReport/BWIBBU_d?response=json&date=${date}&selectType=ALL`;return{report:await read(source),source,checkedAt:checks[source]}}));
for(const result of dated.filter(r=>r.status==='fulfilled').sort((a,b)=>String(a.value.report?.date).localeCompare(String(b.value.report?.date))))for(const code of Object.keys(snapshot.stocks))snapshot.stocks[code]=applyDatedValuation(snapshot.stocks[code],result.value.report,result.value.source,result.value.checkedAt);
// Bounded history coverage; all listed quote/valuation/profit records are included.
const codes=(process.env.MARKET_HISTORY_CODES||'2330,2317,2454,0050').split(',').filter(c=>/^[0-9A-Z]{4,6}$/.test(c));
for(const code of codes){
 const urls=historyURLs(code,now),parts=[];
 // Bound concurrency so a build does not burst dozens of history requests at TWSE.
 for(let i=0;i<urls.length;i+=3)parts.push(...await Promise.allSettled(urls.slice(i,i+3).map(read)));
 const partial=parts.some(r=>r.status==='rejected'||r.value?.stat!=='OK');
 let rows=completedHistoryRows(historyRows(parts.filter(r=>r.status==='fulfilled').map(r=>r.value)),now);
 if(partial)rows=suppressIncompleteAverages(rows);
 const sourceChecks=Object.fromEntries(urls.map(u=>[u,checks[u]||null]));
 snapshot.histories[code]={code,rows,partial,sources:urls,sourceChecks,fetchedAt:Object.values(sourceChecks).filter(Boolean).sort().at(-1)||null,mode:'daily-snapshot',basis:'未還原日收盤價；週線與五日線同為 MA5，月／季／年線為 MA20／60／240。'};
 if(partial)warnings.push(`${code} 部分歷史月份未取得，均線不計算`);
}
for(const code of Object.keys(snapshot.histories))snapshot.stocks[code]=preferHistoryQuote(snapshot.stocks[code],snapshot.histories[code]);
const allStocks=Object.values(snapshot.stocks);for(const stock of allStocks)stock.fundamentals.peer=peerStatistics(stock,allStocks);
fs.mkdirSync('src/generated',{recursive:true});fs.writeFileSync(output+'.tmp',JSON.stringify(snapshot));fs.renameSync(output+'.tmp',output);
console.log(JSON.stringify({generatedAt:snapshot.generatedAt,stocks:Object.keys(snapshot.stocks).length,quoteDate:snapshot.stocks['2330']?.quote?.date,valuationDate:snapshot.stocks['2330']?.valuation?.date,historyDate:snapshot.histories['2330']?.rows.at(-1)?.date,warnings}));
