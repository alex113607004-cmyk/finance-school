import React from 'react';
import {ArrowUpRight,ArrowRight,Bookmark,Check,CheckCircle2,BookOpen,PlayCircle,ExternalLink,Clock,ShieldCheck,Globe2} from 'lucide-react';
import {stages,units,resources,sourceById,resourcesFor,REVIEWED_AT} from '../data.js';

export function ResourceCard({resource,compact=false}){
 const video=resource.kind==='video';
 return <article className={'resource-card '+(compact?'resource-compact':'')} aria-label={resource.title}>
  <div className="resource-type">{video?<PlayCircle size={18}/>:<BookOpen size={18}/>}<span>{video?'官方教學影片頁':'文章／官方說明'}</span><small>{resource.language}</small></div>
  <h3><a href={resource.url} target="_blank" rel="noopener noreferrer">{resource.title} <ArrowUpRight size={16}/></a></h3>
  <p className="resource-publisher">{resource.publisher}</p><p>{resource.focus}</p>
  <div className="resource-scope">{resource.scope}</div>
  <div className="resource-bottom"><small>來源查核 {resource.checkedAt}</small><a href={resource.url} target="_blank" rel="noopener noreferrer">{video?'到原站觀看':'閱讀原文'} <ExternalLink size={12}/></a></div>
 </article>;
}
export function UnitCard({u,done,saved,onBookmark}){
 const stage=stages.find(s=>s.id===u.stage),sources=resourcesFor(u),videos=sources.filter(s=>s.kind==='video').length;
 return <article className={'unit-card '+stage.color}>
  <div className="unit-card-top"><span className="unit-index">{String(units.indexOf(u)+1).padStart(2,'0')} <span>· 來源導讀</span></span><button className={'bookmark-button '+(saved?'saved':'')} aria-label={(saved?'取消收藏：':'收藏：')+u.title} aria-pressed={saved} onClick={()=>onBookmark(u.id)}><Bookmark size={17} fill={saved?'currentColor':'none'}/></button></div>
  <a href={'#unit/'+u.id} className="unit-card-link"><h3>{u.title}</h3><p>{u.goal}</p></a>
  <div className="learning-card-preview">{u.takeaways[0].text}</div>
  <div className="unit-tags"><span><BookOpen size={11}/>{sources.length-videos} 篇文章／說明</span>{videos>0&&<span><PlayCircle size={11}/>{videos} 支官方影片</span>}</div>
  <div className="unit-card-bottom"><span className={done?'done':''}>{done?<><CheckCircle2 size={14}/>已學會</>:<><Clock size={13}/>建議 {u.minutes} 分鐘</>}</span><a href={'#unit/'+u.id}>閱讀單元 <ArrowUpRight size={15}/></a></div>
 </article>;
}
export function LearningUnit({u,completed,bookmarks,toggleDone,toggleBookmark,term}){
 const stage=stages.find(s=>s.id===u.stage),index=units.indexOf(u),sources=resourcesFor(u);
 return <div className="reader source-reader">
  <div className="breadcrumb"><a href="#learn">學習主題</a><span>／</span><span>{stage.name}</span></div>
  <header className="lesson-heading"><span className="eyebrow">SOURCE-LED LEARNING / {String(index+1).padStart(2,'0')}</span><h1>{u.title}</h1><p>{u.goal}</p><div className="button-row"><button className="secondary" onClick={()=>toggleBookmark(u.id)} aria-pressed={bookmarks.includes(u.id)}><Bookmark size={15}/>{bookmarks.includes(u.id)?'已加入收藏':'收藏這個單元'}</button><span className="subtle">建議 {u.minutes} 分鐘 · 摘要查核 {REVIEWED_AT}</span></div></header>
  <section className="panel source-takeaways" aria-label="本單元重點整理"><div className="takeaway-heading"><span className="icon-tile"><ShieldCheck size={22}/></span><div><span className="eyebrow">READ THIS FIRST</span><h2>先讀這三個重點</h2></div></div>
   <ol>{u.takeaways.map((point,i)=><li key={point.text}><span className="takeaway-number">0{i+1}</span><div><p>{point.text}</p><div className="takeaway-citations">{point.sourceIds.map(id=><a href={sourceById[id].url} target="_blank" rel="noopener noreferrer" key={id} aria-label={'重點來源：'+sourceById[id].title}>來源 {u.sourceIds.indexOf(id)+1} · {sourceById[id].publisher} ↗</a>)}</div></div></li>)}</ol>
   <p className="subtle">以上為本站依原文整理的中文重點；可逐項開啟來源核對。影片為延伸教材，摘要依已核對的文章或官方頁面說明撰寫。</p>
  </section>
  <section className="panel lesson-resources" aria-label="文章與教學影片"><span className="eyebrow">01 / READ & WATCH</span><h2>閱讀原文，或觀看教學</h2><p className="subtle">保留原發布機構、語言與適用範圍。英文資源由上方中文摘要協助導讀；不同市場的制度須分別查核。</p><div className="resource-grid">{sources.map(resource=><ResourceCard key={resource.id} resource={resource}/>)}</div></section>
  <section className="panel"><span className="eyebrow">02 / READING GUIDE</span><h2>閱讀時，帶著這些問題</h2><ol className="reading-guide">{u.guide.map(item=><li key={item}>{item}</li>)}</ol></section>
  <section className="panel learning-reflection"><span className="eyebrow">03 / CHECK YOUR UNDERSTANDING</span><h2>用自己的話整理一次</h2><p>{u.reflection.question}</p><details><summary>展開整理方向</summary><p>{u.reflection.answer}</p><small>對照上方來源，再補上自己的理解。</small></details></section>
  <section className="panel"><h3>遇到陌生名詞，隨時查閱</h3><div className="term-cloud">{u.tags.filter(tag=>term.has(tag)).map(tag=><React.Fragment key={tag}>{term.render(tag)}</React.Fragment>)}</div><a className="text-link" href="#glossary">開啟完整名詞知識庫 <ArrowUpRight size={14}/></a></section>
  <div className="lesson-completion"><div><h3>讀完原文，再留下你的進度。</h3><p>完成狀態由你標記，不代表投資能力評等。</p></div><button className="primary" onClick={()=>toggleDone(u.id)} aria-pressed={completed.includes(u.id)}><Check size={16}/>{completed.includes(u.id)?'取消已學會標記':'標記已學會'}</button></div>
  <div className="reader-nav"><a href={index?'#unit/'+units[index-1].id:'#learn'}>← {index?'上一單元':'學習主題'}</a><a href={index<units.length-1?'#unit/'+units[index+1].id:'#learn'}>{index<units.length-1?'下一單元':'回到主題'} <ArrowRight size={15}/></a></div>
 </div>;
}
export function SourceLibrary({query='',stage='all',kind='all',setKind}){
 const ids=new Set(units.filter(u=>stage==='all'||u.stage===stage).flatMap(u=>u.sourceIds));
 const found=resources.filter(r=>ids.has(r.id)&&(kind==='all'||r.kind===kind)&&(r.title+r.publisher+r.focus+r.scope).toLocaleLowerCase().includes(query.toLocaleLowerCase()));
 return <><div className="page-title"><span className="eyebrow">CURATED ORIGINAL SOURCES</span><h1>把可靠教材，放在同一個地方。</h1><p>文章、官方說明與教學影片，逐一保留發布機構與原始連結。摘要查核日 {REVIEWED_AT}。</p></div><div className="tab-row" aria-label="教材類型">{[['all','全部教材'],['article','文章與說明'],['video','官方影片']].map(([id,label])=><button className={kind===id?'selected':''} key={id} onClick={()=>setKind(id)} aria-pressed={kind===id}>{label}</button>)}</div><p className="subtle">{found.length} 項教材 · 影片在原站觀看，無須登入本站。來源內容可能更新，制度請以原發布機構最新說明為準。</p><div className="source-library-grid">{found.map(r=><ResourceCard key={r.id} resource={r}/>)}</div>{!found.length&&<div className="empty-state"><Globe2 size={28}/><h3>沒有符合的教材。</h3><p>可調整搜尋詞或教材類型。</p></div>}</>;
}
