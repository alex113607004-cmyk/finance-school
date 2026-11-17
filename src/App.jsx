import React,{useEffect,useRef,useState} from 'react';
import {GraduationCap,BookOpen,Bookmark,Search,ArrowUpRight,ArrowRight,ChevronRight,CheckCircle2,Sparkles,ChartNoAxesCombined,CandlestickChart,Activity,Layers,ShieldCheck,Globe2,FolderHeart,Menu,X,Info,Library,PlayCircle} from 'lucide-react';
import {stages,units,resources,glossary,REVIEWED_AT} from './data.js';
import {filterUnits,parseStoredList} from './domain.js';
import Market from './components/Market';
import StockAnalysis from './components/StockAnalysis';
import UsStockAnalysis from './components/UsStockAnalysis';
import {VisitRefreshStatus} from './MarketDataContext';
import {LearningUnit,UnitCard,SourceLibrary} from './components/Learning';

const ids=units.map(u=>u.id),stageIcons={candles:CandlestickChart,chart:ChartNoAxesCombined,activity:Activity,layers:Layers,shield:ShieldCheck};
const retired=/^(tools|cases|case|lesson)(\/|$)/;
function useRoute(){
 const read=()=>{try{const raw=decodeURIComponent(window.location.hash.slice(1)||'learn');return retired.test(raw)?'learn':raw}catch{return'learn'}};
 const [route,setRoute]=useState(read);
 useEffect(()=>{const change=()=>{if(retired.test(window.location.hash.slice(1)))window.history.replaceState(null,'','#learn');setRoute(read());window.scrollTo?.(0,0)};change();window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change)},[]);
 return route.split('/');
}
function useSavedList(key){
 const [warning,setWarning]=useState(false),[items,setItems]=useState(()=>{try{return parseStoredList(localStorage.getItem(key),ids)}catch{return[]}});
 useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(items))}catch{setWarning(true)}},[items,key]);
 useEffect(()=>{const sync=e=>{if(e.key===key)setItems(parseStoredList(e.newValue,ids))};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync)},[key]);
 return[items,id=>setItems(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]),warning];
}
function Progress({value}){return <div className="progress-track" role="progressbar" aria-label="總學習進度" aria-valuenow={value} aria-valuemin="0" aria-valuemax="100"><span style={{width:value+'%'}}/></div>}
function TermDialog({term,onClose}){
 const ref=useRef();useEffect(()=>{if(term&&!ref.current.open)ref.current.showModal();if(!term&&ref.current.open)ref.current.close()},[term]);
 return <dialog ref={ref} className="term-dialog" aria-labelledby="term-title" onCancel={e=>{e.preventDefault();onClose()}} onClick={e=>{if(e.target===ref.current){const r=ref.current.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose()}}}>
  <button className="icon-button close-dialog" onClick={onClose} aria-label="關閉名詞解釋"><X size={20}/></button>{term&&<><span className="eyebrow">QUICK DEFINITION / 名詞解釋</span><h2 id="term-title">{term}</h2><p>{glossary[term]?.[0]}</p><div className="analogy-box"><span className="mini-label">舉個例子</span><p>{glossary[term]?.[1]}</p></div><a className="text-link" href="#glossary" onClick={onClose}>開啟完整詞典 <ArrowUpRight size={14}/></a></>}
 </dialog>;
}
function LearningHero({next,completed}){return <section className="learning-hero">
 <div><span className="hero-badge"><span className="tiny-dot"/>給新手的來源導讀</span><h1>先懂重點，<br/>再讀<span>可靠來源。</span></h1><p>從股票入門到財報、圖表與風險。<br/>先看本站整理，再跟著原文與官方教學深入理解。</p><div className="button-row"><a className="primary" href={'#unit/'+next.id}>{completed.length?'繼續我的學習':'從第一單元開始'} <ArrowUpRight size={17}/></a><button className="secondary" onClick={()=>document.getElementById('learning-topics')?.scrollIntoView?.({behavior:'smooth'})}>按主題選讀 <BookOpen size={15}/></button></div></div>
 <div className="learning-hero-note"><BookOpen size={30}/><span className="eyebrow">YOUR LEARNING FLOW</span><ol><li><span>01</span><div><b>先看三個重點</b><p>每條摘要都能回到來源核對。</p></div></li><li><span>02</span><div><b>讀文章，或看官方教學</b><p>保留發布機構、語言與適用範圍。</p></div></li><li><span>03</span><div><b>用自己的話整理</b><p>留下理解，再標記學習進度。</p></div></li></ol></div>
 </section>}
export default function App(){
 const [view,param,symbol]=useRoute(),[stage,setStage]=useState('all'),[query,setQuery]=useState(''),[status,setStatus]=useState('all'),[mobile,setMobile]=useState(false),[term,setTerm]=useState(null),[kind,setKind]=useState('all');
 const [completed,toggleDone,progressWarning]=useSavedList('finance-school.completed.v3');
 const [bookmarks,toggleBookmark,bookmarkWarning]=useSavedList('finance-school.bookmarks.v3');
 const percent=Math.round(completed.length/units.length*100),currentUnit=units.find(u=>u.id===param),isBookmarks=view==='bookmarks';
 const filtered=filterUnits(units,{stage,query,bookmarked:isBookmarks,bookmarks}).filter(u=>status==='all'||(status==='done'?completed.includes(u.id):!completed.includes(u.id)));
 const next=units.find(u=>!completed.includes(u.id))||units[0];
 const nav=[['learn',BookOpen,'學習主題'],['sources',Library,'精選教材'],['analysis',CandlestickChart,'個股分析'],['market',ChartNoAxesCombined,'台美股看盤'],['glossary',Globe2,'名詞知識庫'],['bookmarks',FolderHeart,'我的收藏']];
 function goStage(id){setStage(id);setQuery('');setStatus('all');setMobile(false);if(view!=='learn')window.location.hash='learn';}
 function termButton(t){return <button className="term-button" onClick={()=>setTerm(t)}>{t}<Info size={12}/></button>}
 useEffect(()=>{setMobile(false);document.title=(view==='analysis'?(param==='us'?'美股':'台股')+'個股分析｜':view==='unit'&&currentUnit?currentUnit.title+'｜':'')+'新手財經小學堂：台美股實戰知識庫'},[view,param,currentUnit]);
 return <>
  <a className="skip-link" href="#main-content" onClick={e=>{e.preventDefault();document.getElementById('main-content')?.focus()}}>跳到主要內容</a>
  <aside className={'sidebar '+(mobile?'mobile-open':'')}>
   <a className="brand" href="#learn"><span><GraduationCap size={24}/></span><div><b>新手財經小學堂</b><small>THE INVESTING CLASSROOM</small></div></a>
   <button className="mobile-close icon-button" onClick={()=>setMobile(false)} aria-label="關閉導覽"><X size={20}/></button>
   <div className="sidebar-caption">你的投資學習空間</div><nav aria-label="功能導航">{nav.map(([id,Icon,label])=><a key={id} href={'#'+id} className={'nav-item '+(view===id||id==='learn'&&view==='unit'?'active':'')}><Icon size={18}/><span>{label}</span>{id==='bookmarks'&&<small>{bookmarks.length}</small>}</a>)}</nav>
   <div className="sidebar-divider"/><div className="sidebar-caption">五個學習主題 <span>05</span></div><nav className="stage-nav" aria-label="主題導航">{stages.map((s,i)=>{const total=units.filter(u=>u.stage===s.id).length,count=units.filter(u=>u.stage===s.id&&completed.includes(u.id)).length;return <button key={s.id} className={(stage===s.id&&view==='learn'?'selected ':'')+s.color} onClick={()=>goStage(s.id)}><span className="stage-number">0{i+1}</span><span>{s.name}</span><small>{count}/{total}</small></button>})}</nav>
   <div className="sidebar-progress"><div className="progress-head"><span><Sparkles size={15}/>理解，一點一滴累積。</span><b>{percent}%</b></div><Progress value={percent}/><small>已學會 {completed.length} / {units.length} 個新單元</small><a href={'#unit/'+next.id}>繼續我的學習 <ArrowRight size={14}/></a></div><div className="sidebar-bottom"><span className="tiny-dot"/>原文可查，理解有據。</div>
  </aside>
  {mobile&&<button className="nav-backdrop" onClick={()=>setMobile(false)} aria-label="關閉側邊導覽"/>}
  <div className="app-shell"><header className="topbar"><div className="topbar-title"><button className="mobile-menu icon-button" onClick={()=>setMobile(true)} aria-label="開啟導覽"><Menu size={22}/></button><span>知識是你最好的投資</span><ChevronRight size={13}/><b>{view==='unit'?'學習單元':nav.find(n=>n[0]===view)?.[2]||'學習主題'}</b></div><label className="global-search"><Search size={17}/><input type="search" aria-label="搜尋所有教學單元" placeholder="搜尋主題、重點、發布機構…" value={query} onChange={e=>{setQuery(e.target.value);setStage('all');if(!['learn','bookmarks','glossary','sources'].includes(view))window.location.hash='learn'}}/><kbd>⌕</kbd></label><span className="top-avatar" aria-label="本機學習空間">學</span></header>
  <main id="main-content" className="main-content" tabIndex={-1}><VisitRefreshStatus/>
   {(progressWarning||bookmarkWarning)&&<p role="status" className="notice">瀏覽器無法儲存資料；本次操作仍有效，但關閉頁面後可能不保留。</p>}
   {view==='analysis'?(param==='us'?<UsStockAnalysis term={termButton} symbol={symbol}/>:<StockAnalysis term={termButton} param={param}/>):view==='market'?<Market term={termButton}/>:view==='unit'&&currentUnit?<LearningUnit key={param} u={currentUnit} {...{completed,bookmarks,toggleDone,toggleBookmark}} term={{has:t=>!!glossary[t],render:termButton}}/>:view==='unit'?<div className="empty-state"><h1>這個單元已更新</h1><p>請從新版主題教材繼續學習。</p><a className="primary" href="#learn">回到學習主題</a></div>:view==='sources'?<SourceLibrary {...{query,kind,setKind}}/>:view==='glossary'?<>
    <div className="page-title"><span className="eyebrow">YOUR INVESTING DICTIONARY</span><h1>把陌生名詞，變成理解。</h1><p>用上方搜尋篩選定義與例子，再到相關單元閱讀來源。</p></div><div className="dictionary-grid">{Object.entries(glossary).filter(([k,v])=>(k+v.join('')).toLocaleLowerCase().includes(query.toLocaleLowerCase())).map(([k,v])=><article className="panel dictionary-entry" key={k}><h2>{termButton(k)}</h2><p>{v[0]}</p><div className="example-small">例如：{v[1]}</div>{units.find(u=>u.tags.includes(k))&&<a className="text-link" href={'#unit/'+units.find(u=>u.tags.includes(k)).id}>閱讀相關單元 <ArrowUpRight size={14}/></a>}</article>)}</div>
   </>:<>
    {!isBookmarks&&!query&&stage==='all'?<LearningHero next={next} completed={completed}/>:<div className="page-title"><span className="eyebrow">{isBookmarks?'YOUR READING COLLECTION':'EXPLORE BY TOPIC'}</span><h1>{isBookmarks?'留下想深入讀的內容。':query?'找到你現在想理解的事。':stages.find(s=>s.id===stage)?.name||'學習主題'}</h1><p>{isBookmarks?'收藏整個單元，連同重點與原始教材一起保存。':'從中文重點開始，接著閱讀原文或觀看官方教學。'}</p></div>}
    <div className="learning-overview" aria-label="教材概況"><div><b>{units.length}</b><span>全新閱讀單元</span></div><a href="#sources"><b>{resources.length}</b><span>項原始教材 <ArrowUpRight size={13}/></span></a><div><b>{resources.filter(r=>r.kind==='video').length}</b><span>支官方教學影片</span></div><div><b>{completed.length}/{units.length}</b><span>我的完成進度</span></div></div>
    <section id="learning-topics" className="learning-library"><div className="section-title"><div><span className="eyebrow">FIVE TOPICS / SOURCE-FIRST LEARNING</span><h2>{isBookmarks?'你的閱讀收藏':'選一個主題，開始理解。'}</h2><p>每個單元都從來源重點開始，查核日 {REVIEWED_AT}。</p></div><label className="status-filter"><span className="sr-only">完成狀態篩選</span><select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">全部學習狀態</option><option value="unread">尚未學會</option><option value="done">已學會</option></select></label></div>
    <div className="stage-pills" aria-label="主題篩選"><button className={stage==='all'?'selected':''} onClick={()=>setStage('all')}>全部主題 <small>{units.length}</small></button>{stages.map((s,i)=><button key={s.id} className={stage===s.id?'selected':''} onClick={()=>setStage(s.id)}>0{i+1} {s.name}</button>)}</div>
    {query&&<p className="search-summary" role="status">「{query}」找到 {filtered.length} 個單元 <button onClick={()=>setQuery('')}>清除搜尋 <X size={12}/></button></p>}
    {filtered.length?stages.filter(s=>filtered.some(u=>u.stage===s.id)).map(s=>{const Icon=stageIcons[s.icon];return <section className={'stage-section '+s.color} key={s.id}><div className="stage-heading"><div className="stage-symbol"><Icon size={21}/></div><div><span className="eyebrow">{s.english}</span><h3>{s.name}</h3><p className="subtle">{s.desc}</p></div></div><div className="units-grid">{filtered.filter(u=>u.stage===s.id).map(u=><UnitCard key={u.id} u={u} done={completed.includes(u.id)} saved={bookmarks.includes(u.id)} onBookmark={toggleBookmark}/>)}</div></section>}):<div className="empty-state"><Bookmark size={28}/><h3>{isBookmarks&&!bookmarks.length?'還沒有收藏，先留下一個想讀的單元。':'沒有符合的單元。'}</h3><button className="secondary" onClick={()=>{setQuery('');setStage('all');setStatus('all');if(isBookmarks)window.location.hash='learn'}}>查看全部單元</button></div>}
    </section><p className="curriculum-note">這是重新編寫的教材，完成進度依新單元記錄。中文重點為本站整理，完整內容與制度更新請以原發布機構為準。</p>
   </>}
  </main><footer><span><GraduationCap size={16}/>新手財經小學堂 <small>來源導讀與投資學習</small></span><p>先理解資料，再形成判斷。投資教育用途。</p><span className="footer-note">進度與收藏僅保存在此瀏覽器</span></footer></div>
  <TermDialog term={term} onClose={()=>setTerm(null)}/>
 </>;
}
