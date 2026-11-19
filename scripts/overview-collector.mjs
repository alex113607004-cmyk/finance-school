import {completedDateCandidates} from '../worker/runtime.mjs';
import {parseOverviewQuotes,parseTwseLimits,parseTpexNextLimits,attachOverviewLimits} from '../src/market-overview.js';
async function readOfficialJSON(url){const r=await fetch(url,{signal:AbortSignal.timeout(25000),headers:{Accept:'application/json'}});if(!r.ok)throw Object.assign(Error(`HTTP ${r.status}`),{status:r.status});return {body:await r.json(),checkedAt:new Date().toISOString(),source:url};}
export async function collectOverview({old,universe,now=new Date(),read=readOfficialJSON}){
const snapshot={schemaVersion:1,generatedAt:now.toISOString(),stocks:[],markets:{}};
const tpexURL=date=>`https://www.tpex.org.tw/www/zh-tw/afterTrading/dailyQuotes?date=${date.slice(0,4)}/${date.slice(4,6)}/${date.slice(6)}&response=json`;
async function marketData(market){
 const warnings=[];let quotes,report;
 for(const date of completedDateCandidates(now)){
  try{const source=market==='TWSE'?`https://www.twse.com.tw/exchangeReport/MI_INDEX?date=${date}&type=ALLBUT0999&response=json`:tpexURL(date);const r=await read(source);if(String(r.body.date).replaceAll('/','')!==date)throw Error('來源回應日期不符');quotes=parseOverviewQuotes(r.body,market,universe,r);report=r;break;}catch(e){warnings.push(e.message);if([403,429].includes(e.status))break;}
 }
 if(!quotes)throw Error('盤後行情未取得：'+warnings.join('；'));
 const date=quotes[0].date;let limits={},limitSource=null,limitCheckedAt=null;
 try{
  if(market==='TWSE'){
   const r=await read(`https://www.twse.com.tw/exchangeReport/TWT84U?date=${date.replaceAll('-','')}&response=json`);
   limits=parseTwseLimits(r.body,r);limitSource=r.source;limitCheckedAt=r.checkedAt;
  }else{
   const cursor=new Date(date+'T00:00:00Z');let previous;
   for(let i=0;i<10;i++){
    cursor.setUTCDate(cursor.getUTCDate()-1);if([0,6].includes(cursor.getUTCDay()))continue;
    const d=cursor.toISOString().slice(0,10).replaceAll('-',''),r=await read(tpexURL(d));
    if(String(r.body.stat).toLowerCase()==='ok'&&r.body.tables?.some(t=>t.data?.length)){if(String(r.body.date).replaceAll('/','')!==d)throw Error('前一交易日回應日期不符');previous=r;break;}
    if(!/查無資料|無資料/.test(String(r.body.stat)))throw Error('無法確認交易日連續性，停止停板價對齊');
   }
   if(!previous)throw Error('前一交易日日報尚未取得');
   limits=parseTpexNextLimits(previous.body,{...previous,effectiveDate:date,chainVerified:true});limitSource=previous.source;limitCheckedAt=previous.checkedAt;
  }
 }catch(e){warnings.push('停板價：'+e.message);const previous=(old?.stocks||[]).filter(s=>s.market===market&&s.limit?.date===date&&s.limit.source&&['up','down','none','unrestricted'].includes(s.limit.status));if(previous.length){limits=Object.fromEntries(previous.map(s=>[s.code,s.limit]));limitSource=old.markets[market]?.limitSource;limitCheckedAt=old.markets[market]?.limitCheckedAt;warnings.push('停板價沿用同日已核實版本與原查核日期。');}}
 return {stocks:attachOverviewLimits(quotes,limits),meta:{date,status:'ok',quoteSource:report.source,checkedAt:report.checkedAt,limitSource,limitCheckedAt,warnings}};
}
for(const market of ['TWSE','TPEX']){
 try{const r=await marketData(market);snapshot.stocks.push(...r.stocks);snapshot.markets[market]=r.meta;}
 catch(e){
  const previous=old?.stocks?.filter(s=>s.market===market)||[];
  snapshot.stocks.push(...previous);snapshot.markets[market]={...old?.markets?.[market],status:previous.length?'retained':'unavailable',attemptedAt:now.toISOString(),warnings:[e.message,previous.length?'沿用前次原始資料日期及查核時間。':'尚無可保留的行情快照。']};
 }
}
if(!snapshot.stocks.length)throw Error('沒有可發布的市場行情，保留既有版本。');
return snapshot;
}
