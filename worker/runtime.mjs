export const API='https://openapi.twse.com.tw/v1/';
export const ENDPOINTS={quotes:'exchangeReport/STOCK_DAY_ALL',valuation:'exchangeReport/BWIBBU_ALL',profit:'opendata/t187ap17_L',companies:'opendata/t187ap03_L',revenue:'opendata/t187ap05_L',earnings:'opendata/t187ap14_L',balance:'opendata/t187ap07_L_ci'};
export function numeric(value){if(value===null||value===undefined||String(value).trim()==='')return null;const n=Number(String(value).replace(/,/g,''));return Number.isFinite(n)?n:null}
export function isoDate(raw){const s=String(raw||'').replace(/\D/g,'');if(s.length===7)return `${Number(s.slice(0,3))+1911}-${s.slice(3,5)}-${s.slice(5,7)}`;if(s.length===8)return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;return null}
export function movingAverage(rows,period){return rows.map((r,i)=>i<period-1?null:rows.slice(i-period+1,i+1).reduce((s,x)=>s+x.close,0)/period)}
export const MA_PERIODS=[5,10,20,60,240];
export function enrichHistoryRows(rows){const averages=Object.fromEntries(MA_PERIODS.map(n=>[n,movingAverage(rows,n)]));return rows.map((r,i)=>({...r,...Object.fromEntries(MA_PERIODS.map(n=>['ma'+n,averages[n][i]]))}));}
export function historyRows(results){const map=new Map();for(const j of results){if(j?.stat!=='OK'||!Array.isArray(j.data))continue;for(const r of j.data){const close=numeric(r[6]),date=isoDate(r[0]);if(close!==null&&close>0&&date)map.set(date,{date,open:numeric(r[3]),high:numeric(r[4]),low:numeric(r[5]),close,volume:numeric(r[1])})}}return enrichHistoryRows([...map.values()].sort((a,b)=>a.date.localeCompare(b.date)));}
export function historyURLs(code,now=new Date(),months=14){const local=new Date(now.getTime()+8*3600000);return Array.from({length:months},(_,back)=>{const d=new Date(Date.UTC(local.getUTCFullYear(),local.getUTCMonth()-back,1));return `https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}01&stockNo=${code}`;});}
export function completedHistoryRows(rows,now=new Date()){const local=new Date(now.getTime()+8*3600000),today=local.toISOString().slice(0,10),closed=local.getUTCHours()*60+local.getUTCMinutes()>=810;return enrichHistoryRows(rows.filter(r=>r.date<today||r.date===today&&closed));}
export function suppressIncompleteAverages(rows){return rows.map(r=>({...r,...Object.fromEntries(MA_PERIODS.map(n=>['ma'+n,null]))}));}
export function stockData(code,datasets,{fetchedAt=new Date().toISOString(),warnings=[]}={}){
 const q=datasets.quotes.find(r=>r.Code===code),v=datasets.valuation.find(r=>r.Code===code),f=datasets.profit.find(r=>r['公司代號']===code),c=datasets.companies.find(r=>r['公司代號']===code);
  const close=numeric(q?.ClosingPrice),change=numeric(q?.Change),previous=close!==null&&change!==null?close-change:null;
  const year=numeric(f?.['年度']),quarter=numeric(f?.['季別']);
  const findMetric=prefix=>numeric(Object.entries(f||{}).find(([k])=>k.startsWith(prefix))?.[1]);
  const data={code,name:q?.Name||c?.['公司簡稱']||f?.['公司名稱']||code,fetchedAt,quote:q?{date:isoDate(q.Date),close,change,changePercent:previous>0&&change!==null?change/previous*100:null,open:numeric(q.OpeningPrice),high:numeric(q.HighestPrice),low:numeric(q.LowestPrice),volume:numeric(q.TradeVolume)}:null,valuation:v?{date:isoDate(v.Date),pe:numeric(v.PEratio)>0?numeric(v.PEratio):null,pb:numeric(v.PBratio),yield:numeric(v.DividendYield)}:null,profit:f?{year:year?year+1911:null,quarter,period:year&&quarter?`${year+1911}/01/01–${year+1911}/${String(quarter*3).padStart(2,'0')}/${quarter===1||quarter===4?'31':'30'}（累計）`:null,tableDate:isoDate(f['出表日期']),gross:findMetric('毛利率'),operating:findMetric('營業利益率'),net:findMetric('稅後純益率')}:null,company:c?{fullName:c['公司名稱'],english:c['英文簡稱'],industryCode:c['產業別']||null,listed:isoDate(c['上市日期']),website:/^https?:\/\//.test(c['網址']||'')?c['網址']:null}:null,sources:Object.fromEntries(Object.entries(ENDPOINTS).map(([k,v])=>[k,API+v])),warnings};
data.fundamentals=fundamentalData(code,datasets);return data;
}
export function completedDateCandidates(now=new Date()){
 const local=new Date(now.getTime()+8*3600000),d=new Date(Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate()));if(local.getUTCHours()*60+local.getUTCMinutes()<810)d.setUTCDate(d.getUTCDate()-1);const dates=[];while(dates.length<2){if(![0,6].includes(d.getUTCDay()))dates.push(d.toISOString().slice(0,10).replace(/-/g,''));d.setUTCDate(d.getUTCDate()-1)}return dates;
}
export function applyDatedValuation(data,report,source,checkedAt){
 if(report?.stat!=='OK'||!Array.isArray(report.data))return data;const date=isoDate(report.date),r=report.data.find(r=>r[0]===data.code);if(!r||!date||(data.valuation?.date&&date<data.valuation.date))return data;
 const copy={...data,sources:{...data.sources,valuation:source},sourceChecks:{...data.sourceChecks,valuation:checkedAt},valuation:{date,pe:numeric(r[5])>0?numeric(r[5]):null,pb:numeric(r[6]),yield:numeric(r[3]),financialPeriod:r[7]||null}};
 if(numeric(r[2])!==null&&(!data.quote?.date||date>data.quote.date)){copy.quote={date,close:numeric(r[2]),open:null,high:null,low:null,volume:null,change:null,changePercent:null};copy.sources.quotes=source;copy.sourceChecks.quotes=checkedAt;}return copy;
}
function historyQuoteSource(history,date){return history.sources?.find(source=>{try{return new URL(source).searchParams.get('date')?.slice(0,6)===date.replace(/-/g,'').slice(0,6)}catch{return false}})||history.sources?.[0]||null;}
export function preferHistoryQuote(data,history){const last=history?.rows?.at(-1);if(!data||!last||!Number.isFinite(last.close)||(data.quote?.date&&last.date<data.quote.date))return data;if(last.date===data.quote?.date&&data.quote.open!==null&&history.fetchedAt&&data.sourceChecks?.quotes&&history.fetchedAt<data.sourceChecks.quotes)return data;const prev=history.rows.at(-2),change=prev?last.close-prev.close:null;return {...data,quote:{date:last.date,close:last.close,open:last.open,high:last.high,low:last.low,volume:last.volume,change,changePercent:prev?.close>0?change/prev.close*100:null},sources:{...data.sources,quotes:historyQuoteSource(history,last.date)||data.sources?.quotes},sourceChecks:{...data.sourceChecks,quotes:history.sourceChecks?.[historyQuoteSource(history,last.date)]||history.fetchedAt},fetchedAt:history.fetchedAt||data.fetchedAt};}
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
  const candidates=datasets.companies.map(c=>{const v=datasets.valuation.find(v=>v.Code===c['公司代號']);return {code:c['公司代號'],industryCode:c['產業別'],valuation:v?{date:isoDate(v.Date),pe:numeric(v.PEratio)}:null}});for(const r of dated.filter(r=>r.status==='fulfilled')){if(r.value.report?.stat!=='OK')continue;for(const candidate of candidates){const v=r.value.report.data.find(v=>v[0]===candidate.code),date=isoDate(r.value.report.date);if(v&&date&&date>=(candidate.valuation?.date||''))candidate.valuation={date,pe:numeric(v[5]),financialPeriod:v[7]||null};}}data.fundamentals.peer=peerStatistics(data,candidates);
  return output(data,200,120)
 }
 if(path==='/api/history'){
  const code=url.searchParams.get('code')||'';if(!/^[0-9A-Z]{4,6}$/.test(code))return output({error:'證券代號格式錯誤。'},400);
  const urls=historyURLs(code);
  const results=await Promise.allSettled(urls.map(u=>readJSON(u,300,force)));const partial=results.some(r=>r.status==='rejected'||r.value?.stat!=='OK');let rows=completedHistoryRows(historyRows(results.filter(r=>r.status==='fulfilled').map(r=>r.value)));if(partial)rows=suppressIncompleteAverages(rows);if(!rows.length)return output({error:'每日歷史行情暫時無法取得。請稍後重試，或使用下方證交所來源。'},502);
  const sourceChecks=Object.fromEntries(urls.map(u=>[u,memory.get(u)?.fetchedAt||null]));return output({code,rows,fetchedAt:Object.values(sourceChecks).filter(Boolean).sort().at(-1)||null,servedAt:new Date().toISOString(),sourceChecks,sources:urls,partial,basis:'未還原每日收盤價；只含來源已提供的交易日，含最後一個收盤價；不補值。'},200,900)
 }
 return output({error:'找不到此 API。'},404)
}
export default {async fetch(request){const url=new URL(request.url),path=url.pathname;if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method not allowed',{status:405});try{if(path.startsWith('/api/'))return await handleAPI(path,url);const asset=ASSETS[path==='/'?'/index.html':path];if(!asset)return new Response('Not found',{status:404});return new Response(request.method==='HEAD'?null:asset.content,{headers:{'Content-Type':asset.type,'Cache-Control':'public, max-age=60','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'}})}catch{return output({error:'資料來源連線失敗，請稍後重試；未顯示過期或模擬數字作為最新行情。'},502)}}};

export function reportPeriod(row){if(!row)return null;const year=numeric(row['年度']),quarter=numeric(row['季別']);return year>0&&Number.isInteger(quarter)&&quarter>=1&&quarter<=4?{year:year+1911,quarter,label:`${year+1911} Q${quarter}（年初累計）`,end:`${year+1911}-${String(quarter*3).padStart(2,'0')}-${quarter===1||quarter===4?'31':'30'}`} :null;}
export function fundamentalData(code,datasets){
 const find=key=>(datasets[key]||[]).find(r=>r['公司代號']===code),c=find('companies'),r=find('revenue'),e=find('earnings'),b=find('balance'),ep=reportPeriod(e),bp=reportPeriod(b),industryCode=c?.['產業別']||null;
 const ym=String(r?.['資料年月']||'').replace(/\D/g,''),month=ym.length===5?`${Number(ym.slice(0,3))+1911}-${ym.slice(3)}`:null;
 const assets=numeric(b?.['資產總計']),liabilities=numeric(b?.['負債總計']),currentAssets=numeric(b?.['流動資產']),currentLiabilities=numeric(b?.['流動負債']);
 return {kind:/^00/.test(code)&&!c?'etf':industryCode==='17'?'financial':c?'company':'unavailable',industryCode,industryName:r?.['產業別']||e?.['產業別']||null,
 revenue:r?{month,tableDate:isoDate(r['出表日期']),amount:numeric(r['營業收入-當月營收']),priorMonth:numeric(r['營業收入-上月營收']),priorYear:numeric(r['營業收入-去年當月營收']),ytdAmount:numeric(r['累計營業收入-當月累計營收']),priorYtd:numeric(r['累計營業收入-去年累計營收']),yoy:numeric(r['營業收入-去年同月增減(%)']),mom:numeric(r['營業收入-上月比較增減(%)']),ytdGrowth:numeric(r['累計營業收入-前期比較增減(%)']),unit:'新台幣千元'}:null,
 earnings:e?{period:ep,tableDate:isoDate(e['出表日期']),epsYtd:numeric(e['基本每股盈餘(元)']),revenue:numeric(e['營業收入']),operatingProfit:numeric(e['營業利益']),netProfit:numeric(e['稅後淨利']),unit:'新台幣千元（EPS 為元／股）'}:null,
 balance:b?{period:bp?{...bp,label:`${bp.year} Q${bp.quarter}（季末時點）`}:null,tableDate:isoDate(b['出表日期']),assets,liabilities,currentAssets,currentLiabilities,equity:numeric(b['權益總計']),debtRatio:assets>0&&liabilities!==null?liabilities/assets*100:null,currentRatio:currentLiabilities>0&&currentAssets!==null?currentAssets/currentLiabilities*100:null,unit:'新台幣千元'}:null,
 cashflow:null,peer:null};
}
export function quantile(values,q){if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b),index=(sorted.length-1)*q,lower=Math.floor(index),upper=Math.ceil(index);return sorted[lower]+(sorted[upper]-sorted[lower])*(index-lower);}
export function peerStatistics(stock,candidates){
 const industry=stock.company?.industryCode||stock.fundamentals?.industryCode,v=stock.valuation;if(!industry||!v?.date||!(v.pe>0))return null;
 const peers=candidates.filter(c=>c.code!==stock.code&&(c.company?.industryCode||c.industryCode||c.fundamentals?.industryCode)===industry&&c.valuation?.date===v.date&&c.valuation?.pe>0&&(!v.financialPeriod||c.valuation.financialPeriod===v.financialPeriod));const values=peers.map(c=>c.valuation.pe);
 return {industryCode:industry,date:v.date,financialPeriod:v.financialPeriod||null,count:values.length,median:quantile(values,.5),p25:quantile(values,.25),p75:quantile(values,.75),percentile:values.length?(values.filter(x=>x<v.pe).length+values.filter(x=>x===v.pe).length*.5)/values.length*100:null,excludesSelf:true,positiveOnly:true};
}
