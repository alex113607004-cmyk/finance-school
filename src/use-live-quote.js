import {useCallback,useEffect,useState} from 'react';
import {isCloudRuntime,configuredIntradayOrigin} from './intraday-config';
import {loadLiveQuote,usableLiveQuote} from './live-quote';
export function useLiveQuote({region,symbol,market,currency='TWD',enabled=true},revision=0){
 const cloud=isCloudRuntime(),origin=configuredIntradayOrigin(),[state,setState]=useState({quote:null,busy:false,error:'',auth:false}),[nonce,setNonce]=useState(0);
 const refresh=useCallback(()=>setNonce(n=>n+1),[]),id=region+':'+symbol;
 useEffect(()=>{
  if(!cloud||!enabled||!symbol||region!=='TW'){setState({quote:null,busy:false,error:'',auth:false});return;}
  let active=true,running=false,paused=false;const security={region,symbol,market,currency};
  async function update(manual=false){if(!active||running||paused&&!manual||document.visibilityState==='hidden')return;running=true;setState(s=>({...s,busy:true}));
   try{const quote=await loadLiveQuote(security,{origin,cloudSession:true});if(active)setState({quote,busy:false,error:'',auth:false});}
   catch(e){paused=!!e.stop;if(active)setState({quote:null,busy:false,error:e.message,auth:!!e.auth});}finally{running=false;}}
  update(true);const timer=setInterval(()=>update(),30000),focus=()=>update(),visible=()=>{if(document.visibilityState==='visible')update();};
  window.addEventListener('focus',focus);document.addEventListener('visibilitychange',visible);
  return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',visible);};
 },[cloud,origin,enabled,region,symbol,market,currency,revision,nonce]);
 const quote=state.quote?.id===id&&usableLiveQuote(state.quote,{region,symbol,market,currency})?state.quote:null;
 return {...state,quote,refresh,enabled:cloud&&enabled,supported:region==='TW'};
}
