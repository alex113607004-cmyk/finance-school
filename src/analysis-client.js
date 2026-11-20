import {dataCredentials} from './request-credentials.js';
import {historyURLs,historyRows,completedHistoryRows,numeric,isoDate} from '../worker/runtime.mjs';
import {validCandle} from './stock-analysis.js';
const key='finance-school.analysis.history.v1';
export function emptyHistory(code,market){return {code,market,rows:[],sources:[],completeMonths:[],partial:false,coverageStart:null};}
export function mergeHistory(archive,latest){
 if(archive&&latest&&archive.code!==latest.code)return latest;
 if(!archive)return latest;if(!latest?.rows?.length)return archive;
 const rows=new Map(archive.rows.map(r=>[r.date,r]));for(const r of latest.rows)rows.set(r.date,r);
 const sources=new Map((archive.sources||[]).map(s=>[s.url,s]));for(const s of latest.sources||[])if(!sources.has(s.url)||s.checkedAt>sources.get(s.url).checkedAt)sources.set(s.url,s);
 return {...archive,...latest,rows:[...rows.values()].sort((a,b)=>a.date.localeCompare(b.date)),sources:[...sources.values()],coverageStart:archive.coverageStart,completeMonths:[...new Set([...(archive.completeMonths||[]),...(latest.completeMonths||[])])],partial:archive.partial||latest.partial};
}
export function createAnalysisClient({fetcher=(...args)=>fetch(...args),baseUrl,now=()=>new Date(),storage=null}){
 const inFlight=new Map(),memory=new Map();
 const url=path=>new URL(path,baseUrl).href;
 async function read(target){const r=await fetcher(target,{cache:'no-store',credentials:dataCredentials(target,baseUrl),signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error(`HTTP ${r.status}`);return {body:await r.json(),checkedAt:now().toISOString()};}
 function cache(code){if(memory.has(code))return memory.get(code);try{const saved=JSON.parse(storage?.getItem(key)||'{}')[code];if(saved?.rows)memory.set(code,saved);return saved;}catch{return null;}}
 function save(code,value){memory.set(code,value);try{const all=JSON.parse(storage?.getItem(key)||'{}');all[code]=value;storage?.setItem(key,JSON.stringify(Object.fromEntries(Object.entries(all).sort((a,b)=>String(b[1].fetchedAt).localeCompare(String(a[1].fetchedAt))).slice(0,8))));}catch{}}
 async function publications(){
  if(inFlight.has('publications'))return inFlight.get('publications');
  const task=Promise.allSettled(['universe-data.json','analysis-data.json'].map(async path=>{
   const u=new URL(path,baseUrl);u.searchParams.set('visit',now().getTime());const r=await read(u.href);
   if(!r.body?.stocks)throw Error('快照格式不符');if(path.startsWith('universe')&&r.body.schemaVersion!==1)throw Error('全市場資料格式不符');
   return r.body;
  })).then(([universe,curated])=>({universe:universe.status==='fulfilled'?universe.value:null,curated:curated.status==='fulfilled'?curated.value:null,warnings:[...(universe.status==='rejected'?['全市場快照本次更新失敗，保留已保存資料與日期。']:[]),...(curated.status==='rejected'?['首次財報快照本次更新失敗，保留已查核版本。']:[])]}));
  inFlight.set('publications',task);try{return await task;}finally{inFlight.delete('publications');}
 }
 function loadHistory(stock,{force=false,onProgress=()=>{}}={}){
  const id=stock.market+':'+stock.code;if(inFlight.has(id))return inFlight.get(id);
  const validHistory=h=>h?.code===stock.code&&h?.market===stock.market&&Array.isArray(h.rows)&&h.rows.every(r=>validCandle(r)&&(!r.code||r.code===stock.code));
  const saved=cache(id),cached=validHistory(saved)?saved:null,age=cached?now()-new Date(cached.fetchedAt):Infinity;
  if(!force&&cached&&age>=0&&age<300000)return Promise.resolve(cached);
  const task=(async()=>{
   if(stock.market==='ESB')return {...emptyHistory(stock.code,stock.market),reason:'興櫃來源為議價成交統計，未提供可與上市櫃一致的開盤與收盤日 K。本頁保留真實成交快照，不拼出假 K 棒。'};
   if(stock.market==='TPEX'){
    try{const r=await read(url(`stock-history/TPEX/${encodeURIComponent(stock.code)}.json`));if(!validHistory(r.body))throw Error('股票識別或格式錯誤');save(id,r.body);return r.body;}catch(e){if(cached)return {...cached,partial:true,refreshFailed:true,reason:'上櫃歷史快照更新失敗，保留前次日期並暫停均線判讀。'};throw Error('上櫃歷史快照尚未取得：'+e.message);}
   }
   const urls=historyURLs(stock.code,now()).filter(u=>!stock.company?.listed||new URL(u).searchParams.get('date').slice(0,6)>=stock.company.listed.slice(0,7).replace('-',''));
   const old=cached||emptyHistory(stock.code,stock.market),sources=new Map((old.sources||[]).map(s=>[s.url,s])),map=new Map(old.rows.map(r=>[r.date,r]));
   const needed=urls.filter((u,i)=>i<2||!sources.has(u)),failed=[];let finished=0;
   for(let i=0;i<needed.length;i+=3)await Promise.all(needed.slice(i,i+3).map(async u=>{
    try{const result=await read(u),j=result.body;if(j.stat!=='OK'||!Array.isArray(j.data))throw Error('該月份尚無可核對日線');
     const month=new URL(u).searchParams.get('date').slice(0,6),ym=month.slice(0,4)+'-'+month.slice(4),first=j.data[0];
     if(first&&isoDate(first[0])?.slice(0,7)!==ym)throw Error('來源月份不符');
     if(j.title&&!j.title.includes(stock.code))throw Error('股票識別不符');
     for(const d of map.keys())if(d.startsWith(ym))map.delete(d);
     const raw=new Map(j.data.map(r=>[isoDate(r[0]),r]));
     for(const row of historyRows([j]))map.set(row.date,{...row,change:numeric(raw.get(row.date)?.[7]),source:u,checkedAt:result.checkedAt});
     sources.set(u,{url:u,month:ym,label:ym,checkedAt:result.checkedAt});
    }catch(e){failed.push(u);}finally{onProgress({finished:++finished,total:needed.length});}
   }));
   const allowed=new Set(urls),recentSources=[...sources.values()].filter(s=>allowed.has(s.url));
   const rows=completedHistoryRows([...map.values()].filter(r=>allowed.has(r.source)||!r.source).sort((a,b)=>a.date.localeCompare(b.date)),now());
   if(!rows.length)throw Error('此股票尚無可用的官方日線；可能新掛牌、暫停交易或來源更新失敗。');
   const thisMonth=new Date(now().getTime()+8*3600000).toISOString().slice(0,7);
   const history={code:stock.code,market:stock.market,rows,partial:failed.length>0,sources:recentSources,completeMonths:recentSources.filter(s=>s.month<thisMonth&&!failed.includes(s.url)).map(s=>s.month),coverageStart:recentSources.map(s=>s.month+'-01').sort()[0],fetchedAt:recentSources.map(s=>s.checkedAt).sort().at(-1),failedSources:failed,basis:'證交所未還原價格；股。'};
   save(id,history);return history;
  })();
  inFlight.set(id,task);task.finally(()=>inFlight.delete(id)).catch(()=>{});return task;
 }
 return {publications,loadHistory};
}
export function quoteFromHistory(stock,history){
 const last=history?.rows?.at(-1);if(!last||!validCandle(last)||stock.market==='ESB'||last.date<(stock.quote?.date||''))return stock;
 const source=history.sources?.find(s=>s.url===last.source);
 if(last.date===stock.quote?.date&&source?.checkedAt<(stock.sourceChecks?.quotes||''))return stock;
 const change=Number.isFinite(last.change)?last.change:null,previous=change!==null?last.close-change:null;
 return {...stock,quote:{...last,change,changePercent:previous>0?change/previous*100:null},sources:{...stock.sources,quotes:last.source||source?.url},sourceChecks:{...stock.sourceChecks,quotes:last.checkedAt||source?.checkedAt||history.fetchedAt}};
}
