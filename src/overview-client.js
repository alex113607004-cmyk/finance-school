import {dataCredentials} from './request-credentials.js';
import {marketDate} from './security';
const validDate=d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'')&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
export async function loadMarketOverview({baseUrl=document.baseURI,fetcher=fetch,now=()=>new Date()}={}){
 const url=new URL('market-overview-data.json',baseUrl);url.searchParams.set('visit',now().getTime());
 const response=await fetcher(url.href,{cache:'no-store',credentials:dataCredentials(url.href,baseUrl),signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error(`市場快照暫時無法讀取（HTTP ${response.status}）`);
 const data=await response.json();
 if(data?.schemaVersion!==1||!Array.isArray(data.stocks)||!data.stocks.length||!data.markets||data.stocks.some(s=>!['TWSE','TPEX'].includes(s.market)||!['stock','etf'].includes(s.type)||s.id!==`TW:${s.market}:${s.code}`||!validDate(s.date)||s.date>marketDate(now(),'TW')||s.date!==data.markets[s.market]?.date||!Number.isFinite(s.close)||s.close<=0||!Number.isFinite(s.volume)||s.volume<=0||!Number.isFinite(s.turnover)||s.turnover<0||!['up','down','none','unrestricted','unavailable'].includes(s.limit?.status))||new Set(data.stocks.map(s=>s.id)).size!==data.stocks.length)throw Error('市場快照的格式、標的或日期不符');
 return data;
}
