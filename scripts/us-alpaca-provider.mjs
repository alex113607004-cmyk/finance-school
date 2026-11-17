// Preserves the previous optional Alpaca integration behind an explicit rights gate.
// No secret, HTTP headers or request URL is copied into the public snapshot.
import {marketDate} from '../src/security.js';
import {validCandle} from '../src/stock-analysis.js';
export async function alpacaPublication(company,{config=process.env,fetcher=fetch,now=new Date()}={}){
 if(config.US_PUBLISH_MARKET_DATA!=='1')return null;
 if(!config.ALPACA_API_KEY_ID||!config.ALPACA_API_SECRET_KEY||!config.US_MARKET_DATA_LICENSE_URL||!/^\d{4}-\d{2}-\d{2}$/.test(config.US_MARKET_DATA_LICENSE_CHECKED_AT||'')||!config.US_MARKET_DATA_CACHE_POLICY)throw Error('Alpaca 尚缺憑證或已確認的展示／快取條款紀錄。');
 const feed=config.US_ALPACA_FEED||'sip';if(!['sip','iex'].includes(feed))throw Error('Alpaca feed 必須為 sip 或 iex。');
 const cutoff=marketDate(now,'US'),start=new Date(cutoff+'T00:00:00Z');start.setUTCFullYear(start.getUTCFullYear()-3);start.setUTCDate(1);
 async function bars(adjustment){
  const url=new URL('https://data.alpaca.markets/v2/stocks/bars');url.search=new URLSearchParams({symbols:company.ticker,timeframe:'1Day',start:start.toISOString(),end:cutoff+'T00:00:00Z',limit:10000,feed,adjustment});
  let data;for(let attempt=0;attempt<3;attempt++){
   const r=await fetcher(url,{headers:{'APCA-API-KEY-ID':config.ALPACA_API_KEY_ID,'APCA-API-SECRET-KEY':config.ALPACA_API_SECRET_KEY},signal:AbortSignal.timeout(20000)});
   if(r.ok){data=await r.json();break;}if(attempt===2||![429,500,502,503,504].includes(r.status))throw Error('Alpaca HTTP '+r.status);await new Promise(resolve=>setTimeout(resolve,2000*2**attempt));
  }
  const raw=data?.bars?.[company.ticker];if(!Array.isArray(raw)||data.next_page_token)throw Error('Alpaca 歷史分頁尚未完整，停止發布。');
  const rows=raw.map(b=>({date:marketDate(new Date(b.t),'US'),timestamp:b.t,open:b.o,high:b.h,low:b.l,close:b.c,volume:b.v}));
  if(!rows.length||rows.some((r,i)=>!validCandle(r)||r.date>=cutoff||i>0&&r.date<=rows[i-1].date))throw Error('Alpaca 日線欄位或交易日期無效。');return rows;
 }
 const rows=await bars('raw'),splitRows=await bars('split'),same=rows.length===splitRows.length&&rows.every((r,i)=>['date','open','high','low','close','volume'].every(k=>r[k]===splitRows[i][k]));
 const last=rows.at(-1),prior=rows.at(-2),firstMonth=rows[0].date.slice(0,7),currentMonth=cutoff.slice(0,7),months=[...new Set(rows.map(r=>r.date.slice(0,7)))].filter(m=>m>firstMonth&&m<currentMonth);
 return {region:'US',symbol:company.ticker,cik:company.cik,exchange:company.exchange,provider:'Alpaca',exchangeCoverage:feed==='sip'?'SIP 整合市場':'IEX 單一交易所',license:{publicDisplayAllowed:true,documentation:config.US_MARKET_DATA_LICENSE_URL,checkedAt:config.US_MARKET_DATA_LICENSE_CHECKED_AT,cachePolicy:config.US_MARKET_DATA_CACHE_POLICY},quote:{price:last.close,currency:'USD',date:last.date,timestamp:last.timestamp,timestampKind:'daily-bar-start',status:'aftermarket',change:prior?last.close-prior.close:null,changePercent:prior?(last.close/prior.close-1)*100:null,volume:last.volume},history:{rows,adjustment:'unadjusted',completeMonths:months,coverageStart:rows[0].date,corporateActions:[],corporateActionsVerified:same,valuationCoverage:feed==='sip'?'consolidated':'single-exchange',partial:rows.some((r,i)=>i>0&&Date.parse(r.date)-Date.parse(rows[i-1].date)>10*86400000),sources:[{url:'https://docs.alpaca.markets/us/reference/stockbars',label:'Alpaca raw daily bars',checkedAt:now.toISOString()}]}};
}
