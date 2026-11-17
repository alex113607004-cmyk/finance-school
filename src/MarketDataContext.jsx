import React,{createContext,useContext,useEffect,useState,useSyncExternalStore} from 'react';
import snapshot from './generated/market.json';
import {createMarketClient} from './market-client.js';
import {taipeiTime} from './freshness.js';

const Context=createContext(null);
export function MarketDataProvider({children,client:provided}){
  const [client]=useState(()=>{
    if(provided)return provided;
    let storage=null;try{storage=window.localStorage;}catch{}
    return createMarketClient({snapshot,baseUrl:document.baseURI,storage});
  });
  const state=useSyncExternalStore(client.subscribe,client.getState,client.getState);
  useEffect(()=>{client.refreshVisit();},[client]);
  return <Context.Provider value={{...state,client}}>{children}</Context.Provider>;
}
export const useMarketData=()=>useContext(Context);
export function VisitRefreshStatus(){
  const market=useMarketData();if(!market)return null;
  return <div className={'visit-update '+(market.phase==='partial'?'visit-update-warning':'')} aria-label="本次進站更新">
    <span>{market.phase==='checking'?'正在取得最新已發布快照與官方盤後估值…':market.phase==='ready'?'本次進站查詢完成':'本次更新有資料待確認'}<small> {market.checkedAt&&taipeiTime(market.checkedAt)}</small></span>
    <a href="#market">看行情與資料日期 ↗</a>
    {market.messages.length>0&&<p>{market.messages.join('；')}</p>}
  </div>;
}
