import React,{useEffect,useMemo,useState} from 'react';
import {BookmarkPlus,ExternalLink,RefreshCw,Search,Star,Trash2} from 'lucide-react';
import catalog from '../generated/universe-catalog.json';
import marketBaseline from '../generated/market.json';
import analysisBaseline from '../generated/analysis.json';
import overviewBaseline from '../generated/market-overview.json';
import usBaseline from '../generated/us-summary.json';
import research2330 from '../../data/2330-research-metrics.json';
import {createAnalysisClient} from '../analysis-client';
import {loadUSPublication} from '../us-client';
import {loadMarketOverview} from '../overview-client';
import {watchlistRow} from '../watchlist-data';
import {analysisHref} from '../security';
import {format} from '../domain';
import {watchlistViewStores} from '../view-state';
import {useSavedView} from '../use-saved-view';
import {useWatchlist,WatchButton,removeWatchItem} from './WatchlistContext';
const fallbackTW={stocks:{...catalog.stocks,...Object.fromEntries(Object.entries(marketBaseline.stocks).map(([code,s])=>[code,{...s,market:'TWSE',securityKind:catalog.stocks[code]?.securityKind||'stock'}]))}};
const marketNames={TWSE:'上市',TPEX:'上櫃',ESB:'興櫃'};
export default function WatchlistPage({market='all',term=t=>t}){
 const list=useWatchlist(),[refresh,setRefresh]=useState(0),[busy,setBusy]=useState(true),[warnings,setWarnings]=useState([]),[data,setData]=useState({universe:fallbackTW,curated:analysisBaseline,overview:overviewBaseline,us:usBaseline,research2330});
 const {view,change,temporary}=useSavedView(watchlistViewStores[market],{busy,version:data});
 const query=view.query,setQuery=query=>change({query});
 const hasItems=!!list?.items.length;
 useEffect(()=>{if(!hasItems){setBusy(false);setWarnings([]);return;}let active=true;setBusy(true);const client=createAnalysisClient({baseUrl:document.baseURI});Promise.allSettled([client.publications(),loadUSPublication(),loadMarketOverview()]).then(results=>{if(!active)return;const [tw,us,overview]=results;setData(old=>({...old,...(tw.status==='fulfilled'?{universe:tw.value.universe||old.universe,curated:tw.value.curated||old.curated}:{}),...(us.status==='fulfilled'?{us:us.value}:{}),...(overview.status==='fulfilled'?{overview:overview.value}:{})}));setWarnings([...results.flatMap((r,i)=>r.status==='rejected'?[['台股資料','美股資料','排行行情'][i]+'讀取失敗，保留原日期快照。']:[]),...(tw.status==='fulfilled'?tw.value.warnings:[])]);setBusy(false);});return()=>{active=false;};},[refresh,hasItems]);
 const resolved=useMemo(()=>{const now=new Date();return list?list.items.map(s=>watchlistRow(s,{...data,now})):[];},[list?.items,data]);
 const rows=resolved.filter(s=>(market==='all'||s.region===market)&&(!query||[s.symbol,s.name,list.items.find(e=>e.id===s.id)?.name||''].some(v=>v.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))));
 if(!list)return null;
 return <div className="watchlist-page">
  <div className="wl-heading"><div><span className="eyebrow">YOUR WATCHLIST</span><h1 tabIndex={-1}>自選股<span>{list.items.length} 檔</span></h1><p>把關心的標的留在一起，查看最新已發布的行情、基本面與估值狀態。</p></div><a className="secondary wl-browse" href="#overview/TW"><BookmarkPlus size={15}/>瀏覽市場找標的</a></div>
  <div className="wl-toolbar"><nav className="wl-markets" aria-label="自選股市場">{[['all','全部'],['TW','台股'],['US','美股']].map(([key,label])=><a key={key} href={'#watchlist/'+key} aria-current={market===key?'page':undefined}>{label}<small>{list.items.filter(s=>key==='all'||s.region===key).length}</small></a>)}</nav><label className="wl-filter"><Search size={14}/><span className="sr-only">篩選自選股</span><input aria-label="篩選自選股" value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜尋清單內的代號或名稱"/></label><button className="secondary wl-refresh" disabled={busy||!hasItems} onClick={()=>setRefresh(n=>n+1)}><RefreshCw size={14} className={busy?'is-spinning':''}/>{busy?'更新中…':'重新整理資料'}</button></div>
  {warnings.length>0&&<details className="wl-source-warning"><summary>部分資料沿用快照，查看來源狀態</summary>{warnings.map((w,i)=><p key={i}>{w}</p>)}</details>}
  {temporary&&<p className="notice">瀏覽位置目前僅在此分頁暫存。</p>}
  <p className="wl-storage-note"><Star size={12}/>{list.persistent?'清單已保存在此瀏覽器':'清單目前僅在此分頁暫存'} · 最多 100 檔。清除瀏覽器資料會刪除清單；不同裝置不會同步。</p>
  {!list.items.length?<section className="wl-empty panel" aria-label="自選股空清單"><Star size={32}/><h2>開始建立你的觀察清單</h2><p>在個股頁或市場排行按星號，即可加入。行情與財報各自保留原始日期。</p><div><a className="primary" href="#overview/TW">瀏覽熱門標的</a><a className="secondary" href="#analysis/TW/2330">查看台積電</a><a className="secondary" href="#analysis/US/AAPL">查看 Apple</a></div></section>:!rows.length?<section className="wl-empty panel"><h2>這個範圍沒有符合的自選股</h2><p>可切換市場或清除關鍵字。</p><button className="secondary" onClick={()=>setQuery('')}>清除清單搜尋</button><a href="#watchlist/all" className="text-link">顯示全部自選股</a></section>:<section className="wl-grid" aria-label="自選股清單">{rows.map(row=><article className="panel wl-card" key={row.id} data-security-id={row.id}>
   <div className="wl-card-top"><a href={analysisHref(row.region,row.symbol)} aria-label={`分析自選股 ${row.symbol} ${row.name}`}><span>{row.region==='TW'?'台股':'美股'} · {marketNames[row.market]||row.market||'資料待確認'}</span><h2>{row.name}<small>{row.symbol}</small></h2></a><WatchButton region={row.region} code={row.symbol} name={row.name} compact/></div>
   {!row.available?<p className="wl-gap">{row.reason}</p>:<>
    <div className="wl-price"><strong>{row.quoteUsable?format(row.quote.price??row.quote.close):'—'}<small>{(row.currency==='未核實'?'幣別待核實':row.currency)}</small></strong><span className={row.quote.changePercent>0?'ov-gain':row.quote.changePercent<0?'ov-loss':''}>{row.quoteUsable&&Number.isFinite(row.quote.changePercent)?(row.quote.changePercent>0?'+':'')+format(row.quote.changePercent)+'%':row.quoteUsable?'漲跌幅未提供':'行情暫不可用'}</span></div><p className="wl-quote-date">{row.quote.date||'尚無合格行情'} · {row.quoteStatus.state==='stale'?'資料需重新查核':row.region==='TW'?row.market==='ESB'?'最近成交快照':'盤後收盤':row.quote.status==='delayed'?'延遲行情':row.quote.status==='realtime'?'即時行情':row.quoteUsable?'盤後行情':'行情未提供'}{row.quoteSource&&<a href={row.quoteSource} target="_blank" rel="noopener noreferrer">來源<ExternalLink size={10}/></a>}</p>
    <div className="wl-facts">{row.facts.filter(r=>['eps','revenue'].includes(r.key)).map(f=><div key={f.key}><span>{f.key==='eps'?<>{f.label.replace('EPS','')}{term('EPS')}</>:<>{f.label} {term('YoY')}</>}</span><b>{f.available?f.text:'尚未核實'}</b><small>{f.available?f.period:f.reason}</small></div>)}</div>
    <div className={'wl-model '+(row.modelStatus.state==='ready'?'is-ready':'')}><span>歷史估值</span><b>{row.modelTitle}</b>{row.low!==null&&<p>{format(row.low)} ～ {format(row.high)} {row.currency}／股</p>}</div>
    <details className="wl-details"><summary>基本面、估值缺口與來源</summary><p>{row.financialStatus.detail}；各數值期間分別列示。</p>{row.facts.map(f=><div key={f.key}><b>{f.key==='freeCashFlow'?term('自由現金流'):f.label}：{f.available?f.text:'尚未核實'}</b><p>{f.available?f.period:f.reason}</p>{(f.sources||[]).filter(Boolean).map((url,i)=><a key={url} href={url} target="_blank" rel="noopener noreferrer">原始來源 {i+1} ↗</a>)}</div>)}{row.modelReasons.length>0&&<ul>{row.modelReasons.map(r=><li key={r}>{r}</li>)}</ul>}{row.pe&&<p>本頁重算本益比（{row.pe.date}）：{row.pe.formula}</p>}</details>
   </>}
   <div className="wl-card-footer"><a href={analysisHref(row.region,row.symbol)}>開啟完整個股分析<ExternalLink size={12}/></a><button type="button" aria-label={`從清單移除 ${row.symbol} ${row.name}`} onClick={e=>removeWatchItem(list,row.id,e.currentTarget)}><Trash2 size={13}/>移除</button></div>
  </article>)}</section>}
 </div>;
}
