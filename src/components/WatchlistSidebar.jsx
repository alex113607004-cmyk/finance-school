import React,{useMemo,useState} from 'react';
import {PanelLeftClose,RefreshCw,Search,Star} from 'lucide-react';
import {useWatchlist,WatchButton} from './WatchlistContext';
import {useWatchlistData} from '../use-watchlist-data';
import {latestWatchQuote} from '../watchlist-data';
import {analysisHref,quoteStatus} from '../security';
import {forwardPE,isFund} from '../forward-pe';
import {selectNAV,etfPremium} from '../etf-nav';
import {watchTrend} from '../watchlist-trend';
import {format} from '../domain';
import WatchlistSearch from './WatchlistSearch';
export function MiniTrend({trend}){
 if(trend.mode==='missing')return <div className="mini-trend-empty" aria-label={trend.label}>—</div>;
 if(trend.mode==='range'){
  const span=trend.high-trend.low||1,x=n=>6+(n-trend.low)/span*108;
  return <svg viewBox="0 0 120 36" role="img" aria-label={trend.label+'，非分時走勢'}><title>{trend.label}：低 {trend.low}、高 {trend.high}、開 {trend.open}、收 {trend.close}。{trend.note}</title><path d="M6 18H114" className="mini-range-track"/><path d={'M'+x(trend.low)+' 11V25M'+x(trend.high)+' 11V25'} className="mini-range-ticks"/><circle cx={x(trend.open)} cy="18" r="3" className="mini-range-open"/><circle cx={x(trend.close)} cy="18" r="4" className="mini-range-close"/></svg>;
 }
 const values=trend.points.map(p=>p.value),min=Math.min(...values),max=Math.max(...values),span=max-min||1,first=trend.points[0].time,timeSpan=trend.points.at(-1).time-first||1;
 const d=trend.points.map((p,i)=>(i?'L':'M')+(4+(p.time-first)/timeSpan*112).toFixed(2)+' '+(30-(p.value-min)/span*24).toFixed(2)).join(' ');
 return <svg viewBox="0 0 120 36" role="img" aria-label={trend.label+'價格走勢'}><title>{trend.label} {trend.from||''} ～ {trend.to||''}。{trend.note}</title><path d={d} fill="none" stroke="currentColor" strokeWidth="1.7" vectorEffect="non-scaling-stroke"/></svg>;
}
export default function WatchlistSidebar({open=true,onClose=()=>{},market='all',onMarketChange=()=>{},currentId,term=t=>t}){
 const list=useWatchlist(),[query,setQuery]=useState(''),{data,busy,warnings,request,refresh}=useWatchlistData(!!list?.items.length,open);
 const rows=useMemo(()=>list?.items.map(saved=>{
  const raw=saved.region==='TW'?data.universe.stocks?.[saved.symbol]:data.us.stocks?.[saved.id];
  if(!raw)return {...saved,available:false};
  const entry=data.curated.stocks?.[saved.symbol],stock=saved.region==='TW'?latestWatchQuote(raw,entry,data.overview):raw,quote=stock.quote||{},currency=quote.currency||stock.currency||(saved.region==='TW'?/^\d{5}[CK]$/.test(saved.symbol)?'未核實':'TWD':'USD');
  const usable=quoteStatus(quote,{region:saved.region}).usable,nav=saved.region==='TW'?selectNAV(data.etf,'TW',saved.symbol,quote.date):stock.nav;
  return {...saved,available:true,name:stock.nameZh||stock.name||saved.name,quote,currency,usable,fund:isFund(stock),forward:forwardPE(stock,{region:saved.region}),premium:etfPremium({...quote,currency},nav,{region:saved.region}),trend:watchTrend(stock,saved.region==='TW'?entry?.history:stock.history,{region:saved.region})};
 })||[],[list?.items,data]);
 const filtered=rows.filter(s=>(market==='all'||s.region===market)&&(!query.trim()||[s.symbol,s.name].some(v=>v.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))));
 if(!list)return null;
 return <div className="watchlist-sidebar-content">
  <div className="sidebar-title"><div><Star size={16}/><h2>自選股 <small>{list.items.length} 檔</small></h2></div><button type="button" onClick={onClose} aria-label="收合自選股側邊欄"><PanelLeftClose size={19}/></button></div>
  <WatchlistSearch universe={data.universe} us={data.us} market={market} busy={busy} onSearch={request}/>
  <div className="sidebar-filters"><div role="group" aria-label="自選股市場">{[['all','全部'],['TW','台股'],['US','美股']].map(([m,label])=><button type="button" key={m} aria-pressed={m===market} onClick={()=>onMarketChange(m)}>{label}<small>{list.items.filter(s=>m==='all'||s.region===m).length}</small></button>)}</div><button type="button" aria-label="重新整理自選股資料" title="重新整理自選股資料" disabled={busy} onClick={refresh}><RefreshCw size={14} className={busy?'is-spinning':''}/></button></div>
  <label className="sidebar-list-filter"><Search size={13}/><input aria-label="篩選自選股" placeholder="篩選我的自選股" value={query} onChange={e=>setQuery(e.target.value)}/></label>
  <p className="sidebar-data-note">收盤與來源日期分別標示；小圖期間依標籤，不視為即時行情。</p>
  {warnings.length>0&&<details className="sidebar-warnings"><summary>部分資料沿用快照，查看來源狀態</summary>{warnings.map((w,i)=><p key={i}>{w}</p>)}</details>}
  {!list.items.length?<section className="sidebar-empty" aria-label="自選股空清單"><Star size={23}/><h3>建立你的觀察清單</h3><p>在上方搜尋代號或公司名稱，直接加入自選。</p></section>:!filtered.length?<div className="sidebar-empty"><p>此範圍沒有符合的自選股。</p><button type="button" onClick={()=>{setQuery('');onMarketChange('all');}}>顯示全部</button></div>:<ul className="sidebar-stocks" aria-label="自選股清單">{filtered.map(row=><li key={row.id} data-security-id={row.id} className={row.id===currentId?'is-current':''}>
   <div className="sidebar-stock-title"><a href={analysisHref(row.region,row.symbol)} aria-current={row.id===currentId?'page':undefined} aria-label={`分析自選股 ${row.symbol} ${row.name}`}><b>{row.name}</b><span>{row.region} · {row.symbol}</span></a><WatchButton region={row.region} code={row.symbol} name={row.name} compact/></div>
   {row.available?<><div className="sidebar-stock-values"><div><strong>{row.usable?format(row.quote.price??row.quote.close):'—'}<small>{row.currency}</small></strong><span className={row.quote.changePercent>0?'ov-gain':row.quote.changePercent<0?'ov-loss':''}>{row.usable&&Number.isFinite(row.quote.changePercent)?(row.quote.changePercent>0?'+':'')+format(row.quote.changePercent)+'%':'行情暫不可用'}</span></div><div className="sidebar-mini"><MiniTrend trend={row.trend}/><small title={row.trend.note}>{row.trend.label}</small></div></div><p className="sidebar-stock-date">{row.quote.date||'尚無合格行情'} · {row.usable?row.region==='TW'&&row.quote.type==='last-trade'?'最近成交快照':'最近收盤價':'行情未提供'}</p><div className="sidebar-stock-metric">{row.fund?<>{term('折溢價')}<b title={row.premium.reason}>{row.premium.available?(row.premium.value>0?'+':'')+format(row.premium.value)+'%':'待同日淨值'}</b></>:<>{term('前瞻本益比')}<b title={row.forward.reasons?.join('；')}>{row.forward.available?format(row.forward.value)+' 倍':'預估 EPS 待補'}</b></>}</div></>:<p className="sidebar-stock-date">此標的目前資料不足，收藏仍保留。</p>}
  </li>)}</ul>}
  <p className="sidebar-storage-note">{list.persistent?'已保存在此瀏覽器':'目前僅在此分頁暫存'} · 最多100檔 · 不跨裝置同步</p>
 </div>;
}
