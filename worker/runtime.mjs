export const API='https://openapi.twse.com.tw/v1/';
export const ENDPOINTS={quotes:'exchangeReport/STOCK_DAY_ALL',valuation:'exchangeReport/BWIBBU_ALL',profit:'opendata/t187ap17_L',companies:'opendata/t187ap03_L'};
export function numeric(value){if(value===null||value===undefined||String(value).trim()==='')return null;const n=Number(String(value).replace(/,/g,''));return Number.isFinite(n)?n:null}
export function isoDate(raw){const s=String(raw||'').replace(/\D/g,'');if(s.length===7)return `${Number(s.slice(0,3))+1911}-${s.slice(3,5)}-${s.slice(5,7)}`;if(s.length===8)return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;return null}
export function movingAverage(rows,period){return rows.map((r,i)=>i<period-1?null:rows.slice(i-period+1,i+1).reduce((s,x)=>s+x.close,0)/period)}
export function historyRows(results){const map=new Map();for(const j of results){if(j?.stat!=='OK'||!Array.isArray(j.data))continue;for(const r of j.data){const close=numeric(r[6]),date=isoDate(r[0]);if(close!==null&&close>0&&date)map.set(date,{date,open:numeric(r[3]),high:numeric(r[4]),low:numeric(r[5]),close,volume:numeric(r[1])})}}const rows=[...map.values()].sort((a,b)=>a.date.localeCompare(b.date));const m5=movingAverage(rows,5),m10=movingAverage(rows,10);return rows.map((r,i)=>({...r,ma5:m5[i],ma10:m10[i]}))}
export function stockData(code,datasets,{fetchedAt=new Date().toISOString(),warnings=[]}={}){
 const q=datasets.quotes.find(r=>r.Code===code),v=datasets.valuation.find(r=>r.Code===code),f=datasets.profit.find(r=>r['公司代號']===code),c=datasets.companies.find(r=>r['公司代號']===code);
  const close=numeric(q?.ClosingPrice),change=numeric(q?.Change),previous=close!==null&&change!==null?close-change:null;
  const year=numeric(f?.['年度']),quarter=numeric(f?.['季別']);
  const findMetric=prefix=>numeric(Object.entries(f||{}).find(([k])=>k.startsWith(prefix))?.[1]);
  const data={code,name:q?.Name||c?.['公司簡稱']||f?.['公司名稱']||code,fetchedAt,quote:q?{date:isoDate(q.Date),close,change,changePercent:previous>0&&change!==null?change/previous*100:null,open:numeric(q.OpeningPrice),high:numeric(q.HighestPrice),low:numeric(q.LowestPrice),volume:numeric(q.TradeVolume)}:null,valuation:v?{date:isoDate(v.Date),pe:numeric(v.PEratio)>0?numeric(v.PEratio):null,pb:numeric(v.PBratio),yield:numeric(v.DividendYield)}:null,profit:f?{year:year?year+1911:null,quarter,period:year&&quarter?`${year+1911}/01/01–${year+1911}/${String(quarter*3).padStart(2,'0')}/${quarter===1||quarter===4?'31':'30'}（累計）`:null,tableDate:isoDate(f['出表日期']),gross:findMetric('毛利率'),operating:findMetric('營業利益率'),net:findMetric('稅後純益率')}:null,company:c?{fullName:c['公司名稱'],english:c['英文簡稱'],listed:isoDate(c['上市日期']),website:/^https?:\/\//.test(c['網址']||'')?c['網址']:null}:null,sources:Object.fromEntries(Object.entries(ENDPOINTS).map(([k,v])=>[k,API+v])),warnings};
return data;
}
export function completedDateCandidates(now=new Date()){
 const local=new Date(now.getTime()+8*3600000),d=new Date(Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate()));if(local.getUTCHours()*60+local.getUTCMinutes()<810)d.setUTCDate(d.getUTCDate()-1);const dates=[];while(dates.length<2){if(![0,6].includes(d.getUTCDay()))dates.push(d.toISOString().slice(0,10).replace(/-/g,''));d.setUTCDate(d.getUTCDate()-1)}return dates;
}
export function applyDatedValuation(data,report,source,checkedAt){
 if(report?.stat!=='OK'||!Array.isArray(report.data))return data;const date=isoDate(report.date),r=report.data.find(r=>r[0]===data.code);if(!r||!date||(data.valuation?.date&&date<data.valuation.date))return data;
 const copy={...data,sources:{...data.sources,valuation:source},sourceChecks:{...data.sourceChecks,valuation:checkedAt},valuation:{date,pe:numeric(r[5])>0?numeric(r[5]):null,pb:numeric(r[6]),yield:numeric(r[3]),financialPeriod:r[7]||null}};
 if(numeric(r[2])!==null&&(!data.quote?.date||date>data.quote.date)){copy.quote={date,close:numeric(r[2]),open:null,high:null,low:null,volume:null,change:null,changePercent:null};copy.sources.quotes=source;copy.sourceChecks.quotes=checkedAt;}return copy;
}
export function preferHistoryQuote(data,history){const last=history?.rows?.at(-1);if(!data||!last||!Number.isFinite(last.close)||(data.quote?.date&&last.date<data.quote.date))return data;if(last.date===data.quote?.date&&data.quote.open!==null&&history.fetchedAt&&data.sourceChecks?.quotes&&history.fetchedAt<data.sourceChecks.quotes)return data;const prev=history.rows.at(-2),change=prev?last.close-prev.close:null;return {...data,quote:{date:last.date,close:last.close,open:last.open,high:last.high,low:last.low,volume:last.volume,change,changePercent:prev?.close>0?change/prev.close*100:null},sources:{...data.sources,quotes:history.sources?.[0]||data.sources?.quotes},sourceChecks:{...data.sourceChecks,quotes:history.fetchedAt},fetchedAt:history.fetchedAt||data.fetchedAt};}
const memory=new Map();
async function readJSON(url,ttl=300,force=false){const now=Date.now();const old=memory.get(url);const today=new Date(now+8*3600000).toISOString().slice(0,10);if(old&&old.expires>now&&old.day===today&&(!force||now-old.time<15000))return old.data;const r=await fetch(url,{headers:{Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(18000)});if(!r.ok)throw new Error('upstream');const data=await r.json();if(!data||typeof data!=='object')throw new Error('format');if(memory.size>200)memory.clear();memory.set(url,{data,expires:now+ttl*1000,time:now,day:today,fetchedAt:new Date().toISOString()});return data}
function output(data,status=200,ttl=60){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}
function listResult(result){return result.status==='fulfilled'&&Array.isArray(result.value)?result.value:[]}
export async function handleAPI(path,url){const force=url.searchParams.get('refresh')==='1';
 if(path==='/api/stocks'){
  const all=await readJSON(API+ENDPOINTS.quotes,3600);if(!Array.isArray(all))throw new Error('format');
  return output({stocks:all.filter(r=>/^[0-9A-Z]{4,6}$/.test(r.Code)).map(r=>({code:r.Code,name:r.Name})),source:API+ENDPOINTS.quotes,fetchedAt:new Date().toISOString()},200,3600)
 }
 if(path==='/api/stock'){
  const code=url.searchParams.get('code')||'';if(!/^[0-9A-Z]{4,6}$/.test(code))return output({error:'請輸入 4～6 碼上市證券代號。'},400);
  const keys=Object.keys(ENDPOINTS),results=await Promise.allSettled(keys.map(k=>readJSON(API+ENDPOINTS[k],300,force)));
  const datasets=Object.fromEntries(keys.map((k,i)=>[k,listResult(results[i])]));const q=datasets.quotes.find(r=>r.Code===code),v=datasets.valuation.find(r=>r.Code===code),f=datasets.profit.find(r=>r['公司代號']===code),c=datasets.companies.find(r=>r['公司代號']===code);
  if(!q&&!v&&!f&&!c){if(results.some(r=>r.status==='rejected'))return output({error:'資料來源暫時無法連線，請稍後重試。'},502);return output({error:'找不到此上市證券。此版支援證交所上市證券，不含上櫃市場。'},404)}
  const sourceChecks=Object.fromEntries(keys.map((k,i)=>[k,results[i].status==='fulfilled'?memory.get(API+ENDPOINTS[k])?.fetchedAt:null]));
  let data=stockData(code,datasets,{fetchedAt:sourceChecks.quotes||sourceChecks.profit||new Date().toISOString(),warnings:keys.filter((k,i)=>results[i].status==='rejected').map(k=>`${k} 資料暫時無法取得`)});data.sourceChecks=sourceChecks;data.servedAt=new Date().toISOString();
  const dated=await Promise.allSettled(completedDateCandidates().map(async date=>{const source=`https://www.twse.com.tw/exchangeReport/BWIBBU_d?response=json&date=${date}&selectType=ALL`;return {report:await readJSON(source,300,force),source,checkedAt:memory.get(source)?.fetchedAt}}));
  for(const r of dated.filter(r=>r.status==='fulfilled').sort((a,b)=>String(a.value.report?.date).localeCompare(String(b.value.report?.date))))data=applyDatedValuation(data,r.value.report,r.value.source,r.value.checkedAt);
  return output(data,200,120)
 }
 if(path==='/api/history'){
  const code=url.searchParams.get('code')||'';if(!/^[0-9A-Z]{4,6}$/.test(code))return output({error:'證券代號格式錯誤。'},400);
  const now=new Date(Date.now()+8*3600000);const urls=[0,1,2].map(back=>{const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-back,1));const ymd=`${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}01`;return `https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=${ymd}&stockNo=${code}`});
  const results=await Promise.allSettled(urls.map(u=>readJSON(u,300,force)));const partial=results.some(r=>r.status==='rejected'||r.value?.stat!=='OK');const today=now.toISOString().slice(0,10),marketClosed=now.getUTCHours()*60+now.getUTCMinutes()>=810;const rows=historyRows(results.filter(r=>r.status==='fulfilled').map(r=>r.value)).filter(r=>r.date<today||(r.date===today&&marketClosed));if(partial)for(const r of rows){r.ma5=null;r.ma10=null;}if(!rows.length)return output({error:'每日歷史行情暫時無法取得。請稍後重試，或使用下方證交所來源。'},502);
  const sourceChecks=Object.fromEntries(urls.map(u=>[u,memory.get(u)?.fetchedAt||null]));return output({code,rows,fetchedAt:Object.values(sourceChecks).filter(Boolean).sort().at(-1)||null,servedAt:new Date().toISOString(),sourceChecks,sources:urls,partial,basis:'未還原每日收盤價；只含來源已提供的交易日，含最後一個收盤價；不補值。'},200,900)
 }
 return output({error:'找不到此 API。'},404)
}
export default {async fetch(request){const url=new URL(request.url),path=url.pathname;if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method not allowed',{status:405});try{if(path.startsWith('/api/'))return await handleAPI(path,url);const asset=ASSETS[path==='/'?'/index.html':path];if(!asset)return new Response('Not found',{status:404});return new Response(request.method==='HEAD'?null:asset.content,{headers:{'Content-Type':asset.type,'Cache-Control':'public, max-age=60','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'}})}catch{return output({error:'資料來源連線失敗，請稍後重試；未顯示過期或模擬數字作為最新行情。'},502)}}};
