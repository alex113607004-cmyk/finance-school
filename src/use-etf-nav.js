import {useEffect,useState} from 'react';
import baseline from './generated/etf-nav.json';
import {selectNAV} from './etf-nav';
export function useETFNav(region,code,quote,enabled=true,refresh=0){
 const [data,setData]=useState(baseline),[warning,setWarning]=useState('');
 useEffect(()=>{if(!enabled||region!=='TW')return;let active=true;
  fetch(new URL('etf-nav-data.json',document.baseURI),{cache:'no-store',signal:AbortSignal.timeout(15000)}).then(async r=>{if(!r.ok)throw Error('HTTP '+r.status);const j=await r.json();if(j.schemaVersion!==1||!j.stocks)throw Error('格式不符');if(active){setData(j);setWarning(j.warnings?.join('；')||'');}}).catch(()=>{if(active)setWarning('基金淨值更新失敗，保留原始資料日期。');});
  return()=>{active=false;};
 },[enabled,region,refresh]);
 return {nav:selectNAV(data,region,code,quote?.date),warning};
}
