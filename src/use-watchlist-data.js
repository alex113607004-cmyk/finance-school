import {useEffect,useState} from 'react';
import catalog from './generated/universe-catalog.json';
import market from './generated/market.json';
import curated from './generated/analysis.json';
import overview from './generated/market-overview.json';
import us from './generated/us-summary.json';
import etf from './generated/etf-nav.json';
import {createAnalysisClient} from './analysis-client';
import {loadUSPublication} from './us-client';
import {loadMarketOverview} from './overview-client';
const fallback={stocks:{...catalog.stocks,...Object.fromEntries(Object.entries(market.stocks).map(([code,s])=>[code,{...s,market:'TWSE',securityKind:catalog.stocks[code]?.securityKind||'stock'}]))}};
export function useWatchlistData(hasItems,enabled=true){
 const [data,setData]=useState({universe:fallback,curated,overview,us,etf}),[requested,setRequested]=useState(false),[refresh,setRefresh]=useState(0),[busy,setBusy]=useState(false),[warnings,setWarnings]=useState([]);
 const shouldLoad=enabled&&(hasItems||requested);
 useEffect(()=>{if(!shouldLoad){setBusy(false);return;}let active=true;setBusy(true);
  const client=createAnalysisClient({baseUrl:document.baseURI});
  Promise.allSettled([client.publications(),loadUSPublication(),loadMarketOverview(),fetch(new URL('etf-nav-data.json',document.baseURI),{cache:'no-store',signal:AbortSignal.timeout(15000)}).then(async r=>{if(!r.ok)throw Error();const j=await r.json();if(j.schemaVersion!==1||!j.stocks)throw Error();return j;})]).then(results=>{
   if(!active)return;const [tw,american,rank,nav]=results;
   setData(old=>({...old,...(tw.status==='fulfilled'?{universe:tw.value.universe||old.universe,curated:tw.value.curated||old.curated}:{}),...(american.status==='fulfilled'?{us:american.value}:{}),...(rank.status==='fulfilled'?{overview:rank.value}:{}),...(nav.status==='fulfilled'?{etf:nav.value}:{})}));
   setWarnings([...results.flatMap((r,i)=>r.status==='rejected'?[['台股資料','美股資料','排行行情','基金淨值'][i]+'讀取失敗，保留原日期快照。']:[]),...(tw.status==='fulfilled'?tw.value.warnings:[]),...(nav.status==='fulfilled'?nav.value.warnings||[]:[])]);setBusy(false);
  });return()=>{active=false;};
 },[shouldLoad,refresh]);
 return {data,busy,warnings,request:()=>setRequested(true),refresh:()=>{setRequested(true);setRefresh(n=>n+1);}};
}
