import React,{useEffect,useRef,useState} from 'react';
import {ChartNoAxesCombined,Info,X} from 'lucide-react';
import {glossary} from './glossary';
import StockAnalysis from './components/StockAnalysis';
import {VisitRefreshStatus} from './MarketDataContext';
import './analysis-shell.css';

const defaultRoute='analysis/TW/2330';
function readRoute(){
 try{const raw=decodeURIComponent(window.location.hash.slice(1));return /^analysis(?:\/|$)/.test(raw)?raw:defaultRoute;}catch{return defaultRoute;}
}
function useAnalysisRoute(){
 const [route,setRoute]=useState(readRoute);
 useEffect(()=>{
  const change=()=>{const next=readRoute();if(window.location.hash!=='#'+next)window.history.replaceState(null,'','#'+next);setRoute(next);window.scrollTo?.(0,0);};
  change();window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change);
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
export default function App(){
 const [,param,symbol]=useAnalysisRoute(),[term,setTerm]=useState(null);
 useEffect(()=>{setTerm(null);document.title='台美股個股分析｜行情・財報・估值';},[param,symbol]);
 function termButton(t){return <button className="term-button" onClick={()=>setTerm(t)}>{t}<Info size={12}/></button>;}
 return <div className="analysis-app">
  <a className="skip-link" href="#main-content" onClick={e=>{e.preventDefault();document.getElementById('main-content')?.focus();}}>跳到主要內容</a>
  <header className="analysis-header"><div className="analysis-header-inner"><a className="analysis-brand" href="#analysis/TW/2330"><span><ChartNoAxesCombined size={25}/></span><div><b>台美股個股分析</b><small>TW / US STOCK RESEARCH</small></div></a><span className="analysis-header-note"><span className="tiny-dot"/>行情・財報・估值</span></div></header>
  <main id="main-content" className="analysis-main" tabIndex={-1}><VisitRefreshStatus/><StockAnalysis term={termButton} param={param} symbol={symbol}/></main>
  <footer className="analysis-footer"><span>台美股個股分析</span><p>依原始資料分析，從來源核對每個數字。資料日期與缺口詳列於各欄。</p></footer>
  <TermDialog term={term} onClose={()=>setTerm(null)}/>
 </div>;
}
