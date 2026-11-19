import React,{useId,useMemo,useRef,useState} from 'react';
import {ArrowUpRight,Search,X} from 'lucide-react';
import {analysisHref} from '../security';
import {searchWatchTargets} from '../watchlist-search';
import {KIND_NAMES,MARKET_NAMES} from '../stock-universe';
import {WatchButton} from './WatchlistContext';

export default function WatchlistSearch({universe,us,market='all',busy=false,onSearch}){
 const [query,setQuery]=useState(''),[scope,setScope]=useState(market),[submitted,setSubmitted]=useState(false),input=useRef(null),id=useId();
 const {items,hasMore}=useMemo(()=>searchWatchTargets(universe,us,query,scope),[universe,us,query,scope]);
 const hasQuery=!!query.trim();
 function submit(e){e.preventDefault();setSubmitted(true);onSearch();input.current?.focus();}
 function clear(){setQuery('');setSubmitted(false);input.current?.focus();}
 return <section className="panel wl-discovery" aria-labelledby={id+'-title'}>
  <div className="wl-discovery-title"><div><h2 id={id+'-title'}>搜尋並加入標的</h2><p id={id+'-help'}>輸入代號或公司名稱，直接加入自選股，也可開啟個股分析。</p></div><span>台股 · 美股</span></div>
  <form className="wl-discovery-form" role="search" aria-label="尋找自選股標的" onSubmit={submit}>
   <label className="wl-discovery-market"><span className="sr-only">標的搜尋市場</span><select aria-label="標的搜尋市場" value={scope} onChange={e=>{setScope(e.target.value);onSearch();}}><option value="all">台股＋美股</option><option value="TW">台股</option><option value="US">美股</option></select></label>
   <div className="wl-discovery-input"><Search size={17}/><label className="sr-only" htmlFor={id+'-input'}>搜尋標的代號或公司名稱</label><input ref={input} id={id+'-input'} type="search" autoComplete="off" aria-describedby={id+'-help'} value={query} placeholder="例如 2330、台積電、AAPL、Apple" onFocus={onSearch} onChange={e=>{setQuery(e.target.value);setSubmitted(false);onSearch();}}/>{query&&<button type="button" className="wl-clear-search" onClick={clear} aria-label="清除標的搜尋"><X size={15}/></button>}</div>
   <button type="submit" className="primary wl-discovery-submit">搜尋標的</button>
  </form>
  <p className="wl-discovery-status" role="status" id={id+'-status'}>{hasQuery?items.length?`找到${hasMore?'超過 8':' '+items.length} 檔${hasMore?'，先顯示前 8 檔；可輸入更完整的代號或名稱':''}。點星號即可加入或移除。`:busy?'正在更新標的名單，暫無符合結果…':'查無符合的標的。請檢查代號、公司名稱或切換搜尋市場。':submitted?'請輸入股票代號或公司名稱。':'搜尋目前已涵蓋的股票與 ETF；美股先提供 AAPL、MSFT、SPY。'}{busy&&items.length>0?' 正在查核最新已發布名單。':''}</p>
  {hasQuery&&items.length>0&&<ul className="wl-search-results" aria-label="標的搜尋結果">{items.map(s=><li key={s.id} data-search-security-id={s.id}>
   <a href={analysisHref(s.region,s.code)} aria-label={`分析搜尋標的 ${s.code} ${s.name}`}><b>{s.code}</b><span className="wl-result-name">{s.name}{s.description&&s.description!==s.name&&<small>{s.description}</small>}</span><span className="wl-result-market">{s.region==='TW'?'台股':'美股'} · {MARKET_NAMES[s.market]||s.market}<small>{KIND_NAMES[s.securityKind]||'股票'}</small></span><ArrowUpRight size={15}/></a>
   <WatchButton region={s.region} code={s.code} name={s.name}/>
  </li>)}</ul>}
 </section>;
}
