import {useEffect,useState} from 'react';
import {loadIntraday} from './intraday-client.js';
import {configuredIntradayOrigin,isLocalRuntime} from './intraday-config.js';
export function useIntraday(items,enabled,revision,accessPassword='',localReady=false){
 const [state,setState]=useState({stocks:{},busy:false,warning:''}),ids=items.map(s=>s.id).sort().join(','),origin=configuredIntradayOrigin();
 const [clock,setClock]=useState(()=>Date.now());
 const local=isLocalRuntime();
 useEffect(()=>{if(!enabled)return;const timer=setInterval(()=>setClock(Date.now()),60000);return()=>clearInterval(timer);},[enabled]);
 useEffect(()=>{
  if(local?!localReady:!accessPassword){setState(s=>Object.keys(s.stocks).length||s.busy||s.warning?{stocks:{},busy:false,warning:''}:s);return;}
  if(!enabled||!ids||!origin){setState(s=>s.busy?{...s,busy:false}:s);return;}let active=true;const selected=ids.split(',');
  setState(s=>({...s,busy:true,warning:''}));
  (async()=>{const stocks={},failures=[];
   for(let i=0;i<selected.length;i+=3){const group=selected.slice(i,i+3),results=await Promise.allSettled(group.map(id=>{const [region,symbol]=id.split(':');return loadIntraday(region,symbol,{origin,accessPassword:local?'':accessPassword});}));
    if(!active)return;results.forEach((r,j)=>{if(r.status==='fulfilled'&&r.value)stocks[group[j]]=r.value;else failures.push(r.reason);});
    if(failures.some(e=>e?.accessRequired))break;
   }
   const auth=failures.find(e=>e?.accessRequired);
   if(active)setState({stocks:auth?{}:stocks,busy:false,warning:auth?.message||[...new Set(failures.map(e=>e?.message||'當日分時讀取失敗，請重新整理。'))].join('；')});
  })();return()=>{active=false;};
 },[ids,enabled,revision,origin,accessPassword,localReady,local]);
 return {...state,clock};
}
