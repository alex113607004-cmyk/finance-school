import React,{createContext,useContext,useEffect,useState} from 'react';
import baseline from './generated/forward-estimates.json';
const defaults={publication:baseline,warning:''},Context=createContext(defaults);
export function ForecastProvider({children}){
 const [state,setState]=useState(defaults),[choices,setChoices]=useState({});
 useEffect(()=>{let active=true;fetch(new URL('forward-estimates-data.json',document.baseURI),{cache:'no-store',signal:AbortSignal.timeout(15000)}).then(async r=>{if(!r.ok)throw Error('HTTP '+r.status);const p=await r.json();if(p.schemaVersion!==1||!Array.isArray(p.estimates))throw Error('法人預估格式不符');if(active)setState({publication:p,warning:(p.warnings||[]).join('；')});}).catch(()=>{if(active)setState({...defaults,warning:'法人預估更新失敗，保留已核實報導與原發布日期。'});});return()=>{active=false;};},[]);
 return <Context.Provider value={{...state,choices,choose:(id,key)=>setChoices(old=>({...old,[id]:key}))}}>{children}</Context.Provider>;
}
export const useForecasts=()=>useContext(Context);
