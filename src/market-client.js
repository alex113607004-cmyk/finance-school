import {
  applyDatedValuation, completedDateCandidates, completedHistoryRows,
  enrichHistoryRows, historyRows, historyURLs, peerStatistics, preferHistoryQuote,
  suppressIncompleteAverages,
} from '../worker/runtime.mjs';
import {newestData} from './freshness.js';

const HISTORY_CACHE='finance-school.history.v3';
const validSnapshot=s=>s&&Number.isFinite(Date.parse(s.generatedAt))&&s.stocks&&typeof s.stocks==='object'&&s.histories&&typeof s.histories==='object';
async function boundedMap(items,run,limit=3){
  const results=[];
  for(let i=0;i<items.length;i+=limit)results.push(...await Promise.allSettled(items.slice(i,i+limit).map(run)));
  return results;
}

// No credentials, GitHub write token or third-party proxy is sent to a visitor.
export function createMarketClient({snapshot,fetcher=(...args)=>fetch(...args),now=()=>new Date(),baseUrl,storage=null}){
  let state={snapshot,phase:'idle',checkedAt:null,messages:[],revision:0};
  let visitPromise=null;
  const listeners=new Set(),histories=new Map(),inflight=new Map(),visited=new Set();
  const emit=patch=>{state={...state,...patch};for(const listener of listeners)listener();};
  const read=async(url,timeout=20000)=>{
    const response=await fetcher(url,{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(timeout)});
    if(!response.ok)throw new Error('HTTP '+response.status);
    return {body:await response.json(),checkedAt:now().toISOString()};
  };
  function refreshVisit({force=false}={}){
    if(visitPromise&&!force||state.phase==='checking')return visitPromise;
    emit({phase:'checking',messages:[]});
    visitPromise=(async()=>{
      const published=new URL('market-data.json',baseUrl);published.searchParams.set('visit',String(now().getTime()));
      const reports=completedDateCandidates(now()).map(date=>`https://www.twse.com.tw/exchangeReport/BWIBBU_d?response=json&date=${date}&selectType=ALL`);
      const results=await Promise.allSettled([read(published.href),...reports.map(u=>read(u))]);
      const messages=[];let next=state.snapshot;
      const publication=results[0];
      if(publication.status==='fulfilled'&&validSnapshot(publication.value.body)){
        const incoming=publication.value.body;
        // Source retrieval times come from the build; a visitor fetch never renews them.
        if(incoming.generatedAt>=next.generatedAt){
          next={...incoming,stocks:{...incoming.stocks}};
          for(const [code,known]of Object.entries(state.snapshot.stocks))next.stocks[code]=newestData(next.stocks[code],known);
        }else messages.push('已發布快照較舊，保留較新的已查核資料。');
      }else messages.push('最新已發布財報快照讀取失敗，保留內建資料及原始日期。');
      next={...next,stocks:{...next.stocks}};
      let officialSuccess=0;
      results.slice(1).forEach((result,index)=>{
        if(result.status!=='fulfilled'||result.value.body?.stat!=='OK'||!Array.isArray(result.value.body.data))return;
        officialSuccess++;
        for(const [code,data]of Object.entries(next.stocks))next.stocks[code]=applyDatedValuation(data,result.value.body,reports[index],result.value.checkedAt);
      });
      if(!officialSuccess)messages.push('本次官方盤後估值無法取得，保留已查核日期；個股日線仍會另行查詢。');
      const stocks=Object.values(next.stocks);
      for(const stock of stocks)if(stock.fundamentals)next.stocks[stock.code]={...stock,fundamentals:{...stock.fundamentals,peer:peerStatistics(stock,stocks)}};
      emit({snapshot:next,phase:messages.length?'partial':'ready',checkedAt:now().toISOString(),messages,revision:state.revision+1});
      return next;
    })().catch(()=>{emit({phase:'partial',checkedAt:now().toISOString(),messages:['進站更新失敗，保留前次資料，請核對日期。']});return state.snapshot;});
    return visitPromise;
  }
  function readCache(code){
    if(histories.has(code))return histories.get(code);
    let cached;try{cached=JSON.parse(storage?.getItem(HISTORY_CACHE)||'{}')[code];}catch{}
    const saved=state.snapshot.histories[code];
    const known=Array.isArray(cached?.rows)&&cached.fetchedAt>=String(saved?.fetchedAt||'')?cached:saved;
    if(known)histories.set(code,known);
    return known;
  }
  function saveCache(code,history){
    histories.set(code,history);
    try{
      const old=JSON.parse(storage?.getItem(HISTORY_CACHE)||'{}');old[code]=history;
      const recent=Object.entries(old).sort((a,b)=>String(b[1].fetchedAt).localeCompare(String(a[1].fetchedAt))).slice(0,5);
      storage?.setItem(HISTORY_CACHE,JSON.stringify(Object.fromEntries(recent)));
    }catch{/* Storage is optional; lack of it must not disable price updates. */}
  }
  function refreshHistory(code,{force=false,onProgress=()=>{}}={}){
    if(inflight.has(code))return inflight.get(code);
    if(visited.has(code)&&!force)return Promise.resolve(readCache(code));
    const task=(async()=>{
      const known=readCache(code),urls=historyURLs(code,now());
      const checks={...known?.sourceChecks};
      // Requery this and the preceding month on every visit; fill any missing older month.
      const needed=urls.filter((url,i)=>i<2||!checks[url]);
      const rows=new Map((known?.rows||[]).map(row=>[row.date,row]));let finished=0;
      const results=await boundedMap(needed,async url=>{
        const result=await read(url);
        if(result.body?.stat!=='OK'||!Array.isArray(result.body.data))throw new Error('尚未提供此月份日線');
        checks[url]=result.checkedAt;
        const month=new URL(url).searchParams.get('date').slice(0,6),ym=month.slice(0,4)+'-'+month.slice(4);
        for(const [date]of rows)if(date.startsWith(ym))rows.delete(date);
        for(const row of historyRows([result.body]))rows.set(row.date,row);
        finished++;onProgress({finished,total:needed.length});return result;
      });
      const partial=results.some(result=>result.status==='rejected')||urls.some(url=>!checks[url]);
      const oldest=new URL(urls.at(-1)).searchParams.get('date'),firstMonth=oldest.slice(0,4)+'-'+oldest.slice(4,6);
      let normalized=completedHistoryRows(enrichHistoryRows([...rows.values()].filter(r=>r.date.slice(0,7)>=firstMonth).sort((a,b)=>a.date.localeCompare(b.date))),now());
      if(partial)normalized=suppressIncompleteAverages(normalized);
      if(!normalized.length)throw new Error('沒有可用日線');
      const history={code,rows:normalized,partial,sources:urls,sourceChecks:Object.fromEntries(urls.map(u=>[u,checks[u]||null])),fetchedAt:Object.values(checks).filter(Boolean).sort().at(-1)||null,mode:'visitor-query',basis:'未還原日收盤價；MA5／10／20／60／240；週線＝五日線。'};
      saveCache(code,history);visited.add(code);return history;
    })();
    inflight.set(code,task);task.finally(()=>inflight.delete(code)).catch(()=>{});return task;
  }
  async function refreshStock(code,{force=false,onProgress}={}){
    const visitAged=state.checkedAt&&now().getTime()-Date.parse(state.checkedAt)>300000;
    await refreshVisit({force:force||!!visitAged});
    let history,error=null;
    const known=readCache(code),historyAged=known?.fetchedAt&&now().getTime()-Date.parse(known.fetchedAt)>300000;
    try{history=await refreshHistory(code,{force:force||!!historyAged,onProgress});}catch{const cached=readCache(code);history=cached?{...cached,refreshFailed:true}:null;error='本次個股日線更新失敗，保留快照；請核對資料日期與來源查核時間。';}
    let stock=preferHistoryQuote(state.snapshot.stocks[code],history)||null;
    if(stock&&state.messages.length)stock={...stock,warnings:[...(stock.warnings||[]),...state.messages]};
    return {stock,history,error,historyChecked:!error&&!history?.partial};
  }
  return {getState:()=>state,subscribe:listener=>{listeners.add(listener);return()=>listeners.delete(listener);},refreshVisit,refreshHistory,refreshStock};
}
