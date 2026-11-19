import React,{useEffect,useRef,useState} from 'react';
import {ChartNoAxesCombined,Info,X} from 'lucide-react';
import {glossary} from './glossary';
import {analysisHref,parseAnalysisAddress} from './security';
import StockAnalysis from './components/StockAnalysis';
import MarketOverview from './components/MarketOverview';
import WatchlistPage from './components/WatchlistPage';
import {WatchlistProvider,WatchlistNotice,useWatchlist} from './components/WatchlistContext';
import './analysis-shell.css';
import './dashboard.css';

const defaultRoute='analysis/TW/2330';
function readRoute(){
 try{const raw=decodeURIComponent(window.location.hash.slice(1));if(/^overview(?:\/TW)?$/i.test(raw))return 'overview/TW';const watch=raw.match(/^watchlist(?:\/(all|TW|US))?$/i);if(watch)return 'watchlist/'+(watch[1]?.toUpperCase()==='US'?'US':watch[1]?.toUpperCase()==='TW'?'TW':'all');return /^analysis(?:\/|$)/.test(raw)?raw:defaultRoute;}catch{return defaultRoute;}
}
function useAnalysisRoute(){
 const [route,setRoute]=useState(readRoute);
 useEffect(()=>{
  const previous=window.history.scrollRestoration;window.history.scrollRestoration='manual';
  const change=()=>{const next=readRoute();if(window.location.hash!=='#'+next)window.history.replaceState(null,'','#'+next);setRoute(next);};
  change();window.addEventListener('hashchange',change);return()=>{window.removeEventListener('hashchange',change);window.history.scrollRestoration=previous;};
 },[]);
 return route.split('/');
}
function TermDialog({term,onClose}){
 const ref=useRef();
 useEffect(()=>{if(term&&!ref.current.open)ref.current.showModal();if(!term&&ref.current.open)ref.current.close();},[term]);
 return <dialog ref={ref} className="term-dialog" aria-labelledby="term-title" onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===ref.current){const r=ref.current.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose();}}}>
  <button className="icon-button close-dialog" onClick={onClose} aria-label="關閉名詞解釋"><X size={20}/></button>{term&&<><span className="eyebrow">METRIC DEFINITION / 分析指標說明</span><h2 id="term-title">{term}</h2><p>{glossary[term]?.[0]||'此指標的定義尚待核實，請先查閱該欄原始來源與計算口徑。'}</p>{glossary[term]?.[1]&&<div className="analogy-box"><span className="mini-label">例子</span><p>{glossary[term][1]}</p></div>}</>}
 </dialog>;
}
export default function App(){return <WatchlistProvider><AnalysisApp/></WatchlistProvider>;}
function AnalysisApp(){
 const [page,param,symbol]=useAnalysisRoute(),[term,setTerm]=useState(null),lastAnalysis=useRef('#analysis/TW/2330'),lastWatchlist=useRef('#watchlist/all'),list=useWatchlist();
 const isOverview=page==='overview',isWatchlist=page==='watchlist',isAnalysis=!isOverview&&!isWatchlist,route=isOverview?{region:'TW',symbol:'2330'}:isWatchlist?{region:param==='all'?null:param,symbol:param==='US'?'AAPL':'2330'}:parseAnalysisAddress(param,symbol);
 useEffect(()=>{setTerm(null);document.title=isOverview?'市場總覽｜台美股個股分析':isWatchlist?'自選股｜台美股個股分析':'台美股個股分析｜行情・財報・估值';if(isAnalysis){lastAnalysis.current=analysisHref(route.region,route.symbol);window.scrollTo?.(0,0);}if(isWatchlist)lastWatchlist.current='#watchlist/'+param;},[page,param,symbol]);
 function termButton(t){return <button className="term-button" onClick={()=>setTerm(t)}>{t}<Info size={12}/></button>;}
 return <div className="analysis-app">
  <a className="skip-link" href="#main-content" onClick={e=>{e.preventDefault();document.getElementById('main-content')?.focus();}}>跳到主要內容</a>
  <header className="analysis-header">
   <div className="analysis-header-inner has-page-navigation">
    <a className="analysis-brand" href="#analysis/TW/2330"><span><ChartNoAxesCombined size={21}/></span><b>台美股個股分析</b></a>
    <nav className="primary-page-nav" aria-label="網站導覽"><a href={isAnalysis?analysisHref(route.region,route.symbol):lastAnalysis.current} aria-current={isAnalysis?'page':undefined}>個股分析</a><a href="#overview/TW" aria-current={isOverview?'page':undefined}>市場總覽</a><a href={isWatchlist?'#watchlist/'+param:lastWatchlist.current} aria-label="自選股" aria-current={isWatchlist?'page':undefined}>自選股{list.items.length>0&&<span className="watch-count" aria-hidden="true">{list.items.length}</span>}</a></nav>
    <nav className="analysis-market-switch" aria-label={isWatchlist?'自選股市場切換':'個股分析市場'}>
     {[['TW','台股','2330'],['US','美股','AAPL']].map(([region,label,code])=>{
      const current=route.region===region;
      return <a key={region} aria-current={current?'page':undefined} className={current?'selected':''} href={isWatchlist?'#watchlist/'+region:isOverview&&region==='TW'?'#overview/TW':analysisHref(region,current?route.symbol:code)}>{label} <small>{region}</small></a>;
     })}
    </nav>
   </div>
  </header>
  <main id="main-content" className="analysis-main" tabIndex={-1}><WatchlistNotice/>{isOverview?<MarketOverview/>:isWatchlist?<WatchlistPage key={param} market={param} term={termButton}/>:<StockAnalysis term={termButton} param={param} symbol={symbol}/>}</main>
  <footer className="analysis-footer"><span>台美股個股分析 <small>MARKET RESEARCH</small></span><p>{isOverview?'排行依已發布盤後資料，交易日期與來源詳列於本頁。':isWatchlist?'自選清單保存在此瀏覽器，行情與財報日期依各欄標示。':'歷史估值供研究參考，資料日期與來源依各欄標示。'}</p></footer>
  <TermDialog term={term} onClose={()=>setTerm(null)}/>
 </div>;
}
