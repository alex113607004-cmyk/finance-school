import React,{useMemo,useState} from 'react';
import {PanelLeftClose,RefreshCw,Search,Star} from 'lucide-react';
import {useWatchlist,WatchButton} from './WatchlistContext';
import {useWatchlistData} from '../use-watchlist-data';
import {latestWatchQuote} from '../watchlist-data';
import {analysisHref,quoteStatus} from '../security';
import {forwardPE,isFund} from '../forward-pe';
import {selectNAV,etfPremium} from '../etf-nav';
import {watchTrend,miniGeometry} from '../watchlist-trend';
import {useIntraday} from '../use-intraday';
import {format} from '../domain';
import WatchlistSearch from './WatchlistSearch';
import {useForecasts} from '../ForecastContext';
import {defaultForecast} from '../institutional-forecasts';
import IntradayAccess from './IntradayAccess';
import {configuredIntradayOrigin} from '../intraday-config';
export function MiniTrend({trend}){
 const [cursor,setCursor]=useState(null);
 if(trend.mode!=='intraday')return <div className="mini-trend-empty" aria-label={trend.label} title={trend.note}>分時資料待接入</div>;
 const {x,y,openY,path}=miniGeometry(trend),selected=cursor===null?null:trend.points[Math.min(cursor,trend.points.length-1)],last=trend.points.at(-1),time=p=>new Intl.DateTimeFormat('en-GB',{timeZone:trend.currency==='TWD'?'Asia/Taipei':'America/New_York',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(p.time));
 const move=e=>{const rect=e.currentTarget.getBoundingClientRect(),target=trend.start+Math.max(0,Math.min(1,((e.clientX-rect.left)/rect.width*120-4)/112))*(trend.end-trend.start);setCursor(trend.points.reduce((best,p,i)=>Math.abs(p.time-target)<Math.abs(trend.points[best].time-target)?i:best,0));};
 return <div className="mini-intraday"><svg viewBox="0 0 120 40" role="img" tabIndex="0" aria-label={trend.label+'價格走勢，虛線為開盤價 '+format(trend.open)} onPointerMove={move} onPointerDown={move} onPointerLeave={()=>setCursor(null)} onFocus={()=>setCursor(trend.points.length-1)} onBlur={()=>setCursor(null)} onKeyDown={e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();setCursor(i=>Math.max(0,Math.min(trend.points.length-1,(i??trend.points.length-1)+(e.key==='ArrowLeft'?-1:1))));}}}><title>{trend.date} · {trend.provider} · {trend.note} 開盤 {format(trend.open)} {trend.currency}；最後分時 {time(last)}：{format(last.value)}。可用左右鍵查看。</title><line x1="4" x2="116" y1={openY} y2={openY} className="mini-open-line" strokeDasharray="3 3"/><path d={path} className="mini-price-path"/>{selected?<><line x1={x(selected.time)} x2={x(selected.time)} y1="3" y2="37" className="mini-cursor"/><circle cx={x(selected.time)} cy={y(selected.value)} r="2.5" className="mini-last-point"/></>:<circle cx={x(last.time)} cy={y(last.value)} r="2" className="mini-last-point"/>}</svg><span className="mini-open-label">┄ 開 {format(trend.open)}</span><output className="mini-readout">{selected?time(selected)+' · '+format(selected.value):time(last)+' 分時快照'}</output></div>;
}
export default function WatchlistSidebar({open=true,onClose=()=>{},market='all',onMarketChange=()=>{},currentId,term=t=>t}){
 const list=useWatchlist(),[query,setQuery]=useState(''),{data,busy,warnings,request,refresh}=useWatchlistData(!!list?.items.length,open);
 const [intradayRevision,setIntradayRevision]=useState(0),[intradayPassword,setIntradayPassword]=useState(''),intraday=useIntraday(list?.items||[],open,intradayRevision,intradayPassword);
 const {publication,choices}=useForecasts();
 const rows=useMemo(()=>list?.items.map(saved=>{
  const raw=saved.region==='TW'?data.universe.stocks?.[saved.symbol]:data.us.stocks?.[saved.id];
  if(!raw)return {...saved,available:false};
  const entry=data.curated.stocks?.[saved.symbol],stock=saved.region==='TW'?latestWatchQuote(raw,entry,data.overview):raw,quote=stock.quote||{},currency=quote.currency||stock.currency||(saved.region==='TW'?/^\d{5}[CK]$/.test(saved.symbol)?'未核實':'TWD':'USD');
  const usable=quoteStatus(quote,{region:saved.region}).usable,nav=saved.region==='TW'?selectNAV(data.etf,'TW',saved.symbol,quote.date):stock.nav;
  return {...saved,available:true,name:stock.nameZh||stock.name||saved.name,quote,currency,usable,fund:isFund(stock),forward:forwardPE({...stock,currency},{region:saved.region,estimate:stock.forwardEPS||defaultForecast(publication,stock,{region:saved.region,choiceKey:choices?.[saved.id]})}),premium:etfPremium({...quote,currency},nav,{region:saved.region}),trend:watchTrend({...stock,currency,intraday:intraday.stocks[saved.id]||stock.intraday,intradayAuthenticated:!!intradayPassword&&!!intraday.stocks[saved.id]},null,{region:saved.region})};
 })||[],[list?.items,data,publication,choices,intraday.stocks,intraday.clock,intradayPassword]);
 const filtered=rows.filter(s=>(market==='all'||s.region===market)&&(!query.trim()||[s.symbol,s.name].some(v=>v.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))));
 if(!list)return null;
 return <div className="watchlist-sidebar-content">
  <div className="sidebar-title"><div><Star size={16}/><h2>自選股 <small>{list.items.length} 檔</small></h2></div><button type="button" onClick={onClose} aria-label="收合自選股側邊欄"><PanelLeftClose size={19}/></button></div>
  <WatchlistSearch universe={data.universe} us={data.us} market={market} busy={busy} onSearch={request}/>
  <IntradayAccess configured={!!configuredIntradayOrigin()} active={!!intradayPassword} busy={intraday.busy} onConnect={value=>{setIntradayPassword(value);setIntradayRevision(n=>n+1);}} onDisconnect={()=>setIntradayPassword('')}/>
  <div className="sidebar-filters"><div role="group" aria-label="自選股市場">{[['all','全部'],['TW','台股'],['US','美股']].map(([m,label])=><button type="button" key={m} aria-pressed={m===market} onClick={()=>onMarketChange(m)}>{label}<small>{list.items.filter(s=>m==='all'||s.region===m).length}</small></button>)}</div><button type="button" aria-label="重新整理自選股資料" title="重新整理自選股資料" disabled={busy||intraday.busy} onClick={()=>{refresh();setIntradayRevision(n=>n+1);}}><RefreshCw size={14} className={busy||intraday.busy?'is-spinning':''}/></button></div>
  <label className="sidebar-list-filter"><Search size={13}/><input aria-label="篩選自選股" placeholder="篩選我的自選股" value={query} onChange={e=>setQuery(e.target.value)}/></label>
  <p className="sidebar-data-note">小圖只顯示當日分時；虛線為開盤價。收盤價與分時快照分開標示。</p>
  {intraday.warning&&<p className="sidebar-data-note" role="status">{intraday.warning}</p>}
  {warnings.length>0&&<details className="sidebar-warnings"><summary>部分資料沿用快照，查看來源狀態</summary>{warnings.map((w,i)=><p key={i}>{w}</p>)}</details>}
  {!list.items.length?<section className="sidebar-empty" aria-label="自選股空清單"><Star size={23}/><h3>建立你的觀察清單</h3><p>在上方搜尋代號或公司名稱，直接加入自選。</p></section>:!filtered.length?<div className="sidebar-empty"><p>此範圍沒有符合的自選股。</p><button type="button" onClick={()=>{setQuery('');onMarketChange('all');}}>顯示全部</button></div>:<ul className="sidebar-stocks" aria-label="自選股清單">{filtered.map(row=><li key={row.id} data-security-id={row.id} className={row.id===currentId?'is-current':''}>
   <div className="sidebar-stock-title"><a href={analysisHref(row.region,row.symbol)} aria-current={row.id===currentId?'page':undefined} aria-label={`分析自選股 ${row.symbol} ${row.name}`}><b>{row.name}</b><span>{row.region} · {row.symbol}</span></a><WatchButton region={row.region} code={row.symbol} name={row.name} compact/></div>
   {row.available?<><div className="sidebar-stock-values"><div><strong>{row.usable?format(row.quote.price??row.quote.close):'—'}<small>{row.currency}</small></strong><span className={row.quote.changePercent>0?'ov-gain':row.quote.changePercent<0?'ov-loss':''}>{row.usable&&Number.isFinite(row.quote.changePercent)?(row.quote.changePercent>0?'+':'')+format(row.quote.changePercent)+'%':'行情暫不可用'}</span></div><div className="sidebar-mini"><MiniTrend trend={row.trend}/><small title={row.trend.note}>{row.trend.label}</small></div></div><p className="sidebar-stock-date">{row.quote.date||'尚無合格行情'} · {row.usable?row.region==='TW'&&row.quote.type==='last-trade'?'最近成交快照':'最近收盤價':'行情未提供'}</p><div className="sidebar-stock-metric">{row.fund?<>{term('折溢價')}<b title={row.premium.reason}>{row.premium.available?(row.premium.value>0?'+':'')+format(row.premium.value)+'%':'待同日淨值'}</b></>:<>{term('前瞻本益比')}<b title={row.forward.available?`${row.forward.estimate.provider} · ${row.forward.estimate.asOf} · ${row.forward.estimate.statistic||'機構預估'}`:row.forward.reasons?.join('；')}>{row.forward.available?'FY'+(row.forward.estimate.fiscalYear||row.forward.estimate.periodEnd.slice(0,4))+' · '+format(row.forward.value)+' 倍':'預估 EPS 待補'}</b></>}</div></>:<p className="sidebar-stock-date">此標的目前資料不足，收藏仍保留。</p>}
  </li>)}</ul>}
  <p className="sidebar-storage-note">{list.persistent?'已保存在此瀏覽器':'目前僅在此分頁暫存'} · 最多100檔 · 不跨裝置同步</p>
 </div>;
}
