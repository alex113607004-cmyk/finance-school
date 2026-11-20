import React,{createContext,useContext,useMemo,useState,useSyncExternalStore} from 'react';
import {Star,RefreshCw,X} from 'lucide-react';
import {createWatchlistStore} from '../watchlist-store';
import {createCloudWatchlistStore} from '../cloud-watchlist-store';
import {isCloudRuntime} from '../intraday-config';
import '../watchlist.css';
const WatchlistContext=createContext(null);
export function WatchlistProvider({children,store:provided}){
 const [store]=useState(()=>provided||(isCloudRuntime()?createCloudWatchlistStore():createWatchlistStore()));
 const state=useSyncExternalStore(store.subscribe,store.getSnapshot,store.getSnapshot);
 const value=useMemo(()=>({...state,add:store.add,remove:store.remove,retry:store.retry,dismissInputError:store.dismissInputError,sync:store.sync}),[state,store]);
 return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}
export const useWatchlist=()=>useContext(WatchlistContext);
export function removeWatchItem(list,id,target){
 const card=target?.closest('.wl-card'),next=card?.nextElementSibling||card?.previousElementSibling,nextId=next?.getAttribute('data-security-id');
 list.remove(id);if(card)requestAnimationFrame(()=>{const focus=nextId?document.querySelector('[data-security-id="'+nextId+'"] .watch-button'):document.querySelector('.watchlist-page h1');focus?.focus({preventScroll:true});});
}
export function WatchButton({region,code,name,compact=false}){
 const list=useWatchlist();if(!list)return null;
 const id=`${region}:${String(code).toUpperCase()}`,saved=list.items.some(x=>x.id===id),label=`${saved?'移除自選':'加入自選'} ${code} ${name}`;
 return <button type="button" className={'watch-button'+(saved?' is-saved':'')+(compact?' compact':'')} aria-pressed={saved} aria-label={label} title={label} onClick={e=>saved?removeWatchItem(list,id,e.currentTarget):list.add({region,symbol:code,name})}><Star size={compact?16:14} fill={saved?'currentColor':'none'}/>{!compact&&<span>{saved?'已加入自選':'加入自選'}</span>}</button>;
}
export function WatchlistNotice(){const list=useWatchlist();if(!list)return null;return <>
 <span className="sr-only" role="status" aria-live="polite">{list.message}</span>
 {(list.error||list.inputError)&&<aside className="watch-notice" role="alert"><p>{list.inputError||list.error}</p><div>{list.error?<button type="button" onClick={list.retry}><RefreshCw size={13}/>{list.cloud?'重試同步':'重試儲存'}</button>:<button type="button" aria-label="關閉自選清單提示" onClick={list.dismissInputError}><X size={14}/>關閉</button>}</div></aside>}
 </>;}
