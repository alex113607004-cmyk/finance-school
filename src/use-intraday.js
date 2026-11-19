import {useEffect,useState} from 'react';
import {loadIntraday} from './intraday-client.js';
export function useIntraday(items,enabled,revision){
 const [state,setState]=useState({stocks:{},busy:false,warning:''}),ids=items.map(s=>s.id).sort().join(','),origin=import.meta.env.VITE_INTRADAY_API_ORIGIN||'';
 const [clock,setClock]=useState(()=>Date.now());
 useEffect(()=>{if(!enabled)return;const timer=setInterval(()=>setClock(Date.now()),60000);return()=>clearInterval(timer);},[enabled]);
 useEffect(()=>{
  if(!enabled||!ids||!origin){setState(s=>s.busy?{...s,busy:false}:s);return;}let active=true;const selected=ids.split(',');
  setState(s=>({...s,busy:true,warning:''}));
  (async()=>{const stocks={};let failed=0;
   for(let i=0;i<selected.length;i+=3){const group=selected.slice(i,i+3),results=await Promise.allSettled(group.map(id=>{const [region,symbol]=id.split(':');return loadIntraday(region,symbol,{origin});}));
    if(!active)return;results.forEach((r,j)=>{if(r.status==='fulfilled'&&r.value)stocks[group[j]]=r.value;else failed++;});
   }
   if(active)setState({stocks,busy:false,warning:failed?'部分當日分時讀取失敗，可重新整理；不以舊曲線代替。':''});
  })();return()=>{active=false;};
 },[ids,enabled,revision,origin]);
 return {...state,clock};
}
