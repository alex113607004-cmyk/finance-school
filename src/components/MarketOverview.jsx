import IndustrySelect from './IndustrySelect';
import catalog from '../generated/universe-catalog.json';
import React,{useEffect,useMemo,useState} from 'react';
import {Activity,ArrowDownRight,ArrowUpRight,ChevronLeft,ChevronRight,Flame,RefreshCw,TrendingDown,TrendingUp} from 'lucide-react';
import fallback from '../generated/market-overview.json';
import {OVERVIEW_MARKETS,OVERVIEW_CATEGORIES,overviewScope,rankOverview,withOverviewIndustries} from '../market-overview';
import {loadMarketOverview} from '../overview-client';
import {analysisHref} from '../security';
import {format} from '../domain';
import {taipeiTime,freshness} from '../freshness';
import {WatchButton} from './WatchlistContext';
import {overviewViewStore} from '../view-state';
import {useSavedView} from '../use-saved-view';
import '../market-overview.css';
const signed=v=>Number.isFinite(v)?`${v>0?'+':''}${format(v)}%`:'—';
const tone=s=>s.changePercent>0?'ov-gain':s.changePercent<0?'ov-loss':'';
const money=v=>v>=1e8?`${format(v/1e8)} 億`:v>=1e4?`${format(v/1e4)} 萬`:format(v,0);
const volume=s=>`${s.volume>=1e8?format(s.volume/1e8)+' 億':s.volume>=1e4?format(s.volume/1e4)+' 萬':format(s.volume,0)}${s.type==='etf'?'單位':'股'}`;
function LimitBadge({stock}){return stock.limit?.status==='up'?<span className="ov-limit ov-limit-up" title={`官方漲停價 ${stock.limit.upper}`}>漲停</span>:stock.limit?.status==='down'?<span className="ov-limit ov-limit-down" title={`官方跌停價 ${stock.limit.lower}`}>跌停</span>:null;}
export default function MarketOverview(){
 const [snapshot,setSnapshot]=useState(fallback),[refresh,setRefresh]=useState(0),[busy,setBusy]=useState(true),[error,setError]=useState('');
 const {view,change,tableRef,temporary}=useSavedView(overviewViewStore,{busy,version:snapshot});
 const {market,type,industry,category,metric,page}=view;
 const setMarket=market=>change({market,industry:'all',page:1}),setType=type=>change({type,industry:'all',page:1}),setMetric=metric=>change({metric,page:1});
 const setPage=page=>change(v=>({page:typeof page==='function'?page(v.page):page}));
 useEffect(()=>{let active=true;setBusy(true);loadMarketOverview().then(data=>{if(active){setSnapshot(data);setError('');}}).catch(e=>{if(active)setError(e.message+'，沿用已保存快照與原交易日期。');}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};},[refresh]);
 const classified=useMemo(()=>withOverviewIndustries(snapshot,catalog.stocks),[snapshot]);
 const baseScope=useMemo(()=>overviewScope(classified,{market,type}),[classified,market,type]);
 const industryEntries=useMemo(()=>baseScope.stocks.map(stock=>({stock,region:'TW'})),[baseScope.stocks]);
 const scope=useMemo(()=>overviewScope(classified,{market,type,industry}),[classified,market,type,industry]);
 const ranked=useMemo(()=>rankOverview(scope.stocks,{category,metric}),[scope.stocks,category,metric]),size=30,pages=Math.max(1,Math.ceil(ranked.length/size)),currentPage=Math.min(page,pages),rows=ranked.slice((currentPage-1)*size,currentPage*size),title=OVERVIEW_CATEGORIES.find(c=>c[0]===category)[1];
 const changeCategory=category=>change({category,page:1});
 useEffect(()=>{if(!busy&&page>pages)change({page:pages});},[busy,page,pages,change]);
 const retained=Object.entries(snapshot.markets).filter(([m,s])=>(market==='all'||market===m)&&s.status!=='ok');
 return <div className="market-overview">
  <div className="ov-heading"><div><span className="eyebrow">TAIWAN MARKET EXPLORER</span><h1>市場總覽</h1><p>從成交熱門與漲跌排行，找到想進一步研究的標的。</p></div><div className="ov-date"><span>盤後排行 · TWD</span><strong>{scope.date||'尚無交易資料'}</strong><small>{scope.date?freshness(scope.date).label:'來源尚未提供'}</small></div></div>
  <div className="ov-controls"><div className="ov-market-filter" role="group" aria-label="排行市場">{[['all','全部市場'],...Object.entries(OVERVIEW_MARKETS)].map(([key,label])=><button key={key} aria-pressed={market===key} onClick={()=>setMarket(key)}>{label}</button>)}</div><div className="ov-control-right"><label>標的類型 <select aria-label="排行標的類型" value={type} onChange={e=>setType(e.target.value)}><option value="stock">普通股</option><option value="etf">ETF</option><option value="all">股票＋ETF</option></select></label><IndustrySelect label="排行產業篩選" entries={industryEntries} value={industry} onChange={industry=>change({industry,page:1})}/><button className="secondary ov-refresh" disabled={busy} onClick={()=>setRefresh(n=>n+1)}><RefreshCw size={14} className={busy?'is-spinning':''}/>{busy?'更新中…':'重新整理'}</button></div></div>
  {temporary&&<p className="notice" role="status">瀏覽位置目前僅在此分頁暫存；同一分頁返回仍可還原。</p>}
  {error&&<p className="notice" role="status">{error}</p>}
  {retained.length>0&&<p className="notice" role="status">{retained.map(([m,s])=>`${OVERVIEW_MARKETS[m]}${s.status==='retained'?'沿用前次資料':'行情暫不可用'}`).join('；')}，請依標示交易日期閱讀。</p>}
  {scope.missingMarkets.length>0&&scope.date&&<p className="ov-data-note">{scope.date} 尚無{scope.missingMarkets.map(m=>OVERVIEW_MARKETS[m]).join('、')}同日資料，未混入較舊行情。可切換市場查看其最近快照。</p>}
  <div className="ov-stat-grid" aria-label="篩選範圍市場統計"><article><span><Activity size={14}/>有成交標的</span><strong>{format(scope.stats.total,0)}<small>檔</small></strong><p>上市／上櫃 · 依目前篩選範圍</p></article><article><span>範圍成交額</span><strong>{money(scope.stats.turnover)}<small>TWD</small></strong><p>同一交易日的成交金額加總</p></article><article><span>上漲／下跌</span><div className="ov-stat-pair"><strong className="ov-gain">{scope.stats.up}</strong><i>／</i><strong className="ov-loss">{scope.stats.down}</strong></div><p>平盤 {scope.stats.flat} · 漲跌未提供 {scope.stats.unknownChange}</p></article><article><span>收盤漲停／跌停</span><div className="ov-stat-pair"><button aria-label="查看收盤漲停" className="ov-gain" onClick={()=>changeCategory('limitUp')}>{scope.stats.limitUp}</button><i>／</i><button aria-label="查看收盤跌停" className="ov-loss" onClick={()=>changeCategory('limitDown')}>{scope.stats.limitDown}</button></div><p>{scope.stats.limitUnknown?`${scope.stats.limitUnknown} 檔停板價待核對`:'依官方停板價比對收盤'}</p></article></div>
  <section className="panel ov-ranking" aria-label="市場標的排行榜">
   <div className="ov-category-bar"><div className="ov-categories" role="group" aria-label="排行分類">{OVERVIEW_CATEGORIES.map(([key,label])=><button key={key} aria-pressed={category===key} onClick={()=>changeCategory(key)}>{key==='hot'?<Flame size={15}/>:key==='gainers'||key==='limitUp'?<TrendingUp size={15}/>:<TrendingDown size={15}/>}<span>{label}</span></button>)}</div>{category==='hot'&&<label className="ov-sort">排序依據 <select aria-label="熱門排序依據" value={metric} onChange={e=>setMetric(e.target.value)}><option value="volume">成交量</option><option value="turnover">成交金額</option></select></label>}</div>
   <div className="ov-ranking-caption"><h2>{title}<span>{ranked.length} 檔</span></h2><p>{category==='hot'?`依${metric==='volume'?'成交股數／受益權單位':'成交金額'}由高到低排列。`:category==='gainers'?'依當日漲幅由高到低排列。':category==='losers'?'依當日跌幅由大到小排列。':'僅列收盤價等於已核實同日官方停板價的標的，不含盤中曾觸及後打開者。'}點選標的可直接查看個股分析。</p></div>
   {ranked.length>0?<>
    <div className="ov-spotlights" aria-label="排行焦點標的">{ranked.slice(0,4).map((s,i)=><a key={s.id} href={analysisHref('TW',s.code)} className="ov-spotlight" aria-label={`分析 ${s.code} ${s.name}`}><div><span className="ov-rank-number">0{i+1}</span><span>{OVERVIEW_MARKETS[s.market]} · {s.code}</span><LimitBadge stock={s}/></div><h3 title={s.name}>{s.name}</h3><div className="ov-spotlight-price"><strong>{format(s.close)}</strong><span className={tone(s)}>{s.changePercent>0?<ArrowUpRight size={14}/>:s.changePercent<0?<ArrowDownRight size={14}/>:null}{signed(s.changePercent)}</span></div><p>成交量 {volume(s)}</p></a>)}</div>
    <div className="ov-table-scroll" ref={tableRef}><table><thead><tr><th>排行</th><th>自選</th><th>標的</th><th>市場／產業</th><th>收盤價</th><th>漲跌幅</th><th>成交量</th><th>成交金額</th><th>狀態</th></tr></thead><tbody>{rows.map((s,i)=><tr key={s.id}><td>{(currentPage-1)*size+i+1}</td><td className="ov-watch-cell"><WatchButton region="TW" code={s.code} name={s.name} compact/></td><td><a href={analysisHref('TW',s.code)} aria-label={`查看 ${s.code} ${s.name} 個股分析`}><b>{s.code}</b><span>{s.name}</span></a></td><td>{OVERVIEW_MARKETS[s.market]}<small>{s.type==='etf'?'ETF':s.industry?.label||'分類未提供'}</small></td><td>{format(s.close)}</td><td className={tone(s)}>{signed(s.changePercent)}</td><td>{volume(s)}</td><td>{money(s.turnover)}</td><td><LimitBadge stock={s}/>{s.limit.status==='unavailable'&&<small>待核對</small>}{s.limit.status==='unrestricted'&&<small>無一般限制</small>}</td></tr>)}</tbody></table></div>
    <div className="ov-pagination"><p>第 {(currentPage-1)*size+1}～{Math.min(currentPage*size,ranked.length)} 檔，共 {ranked.length} 檔</p><div><button className="secondary" aria-label="上一頁排行" disabled={currentPage===1} onClick={()=>setPage(n=>Math.max(1,n-1))}><ChevronLeft size={16}/></button><span>{currentPage}／{pages}</span><button className="secondary" aria-label="下一頁排行" disabled={currentPage===pages} onClick={()=>setPage(n=>Math.min(pages,n+1))}><ChevronRight size={16}/></button></div></div>
   </>:<div className="ov-empty" role="status"><Activity size={30}/><h3>{category==='limitUp'||category==='limitDown'?`此範圍尚無已確認的${category==='limitUp'?'收盤漲停':'收盤跌停'}標的`:'此範圍沒有符合條件的標的'}</h3><p>{scope.stats.limitUnknown&&(category==='limitUp'||category==='limitDown')?`有 ${scope.stats.limitUnknown} 檔缺少同日停板價，資料不足不當成零檔行情。`:'可切換市場、產業、標的類型或其他排行。'}</p><button className="secondary" onClick={()=>{setType('stock');changeCategory('hot');}}>查看成交熱門</button></div>}
  </section>
  <details className="panel ov-method"><summary>排行口徑、交易日期與官方來源</summary><p>本頁為最新已發布盤後快照，並非即時熱度或成交中報價。每日台灣時間 17:00、21:00 排程更新，來源與排程可能延後；重新整理會讀最新已發布版本。</p><p>熱門依成交量或成交金額排序，非搜尋人氣。範圍只含目前官方名單中的新台幣上市／上櫃普通股與 ETF、有有效價格及成交量者；不含興櫃、權證、外幣交易 ETF 櫃台及無合格行情的美股。不混用不同交易日或幣別排名。</p><p>產業依 TWSE／TPEx 公司名單及財務開放資料分類；ETF 是基金類型，不當成公司產業。分類筆數為目前市場、標的類型與同日行情範圍，切換產業會同步更新統計與排行；不回退到較舊行情尋找結果。</p><p>漲跌停直接比對官方價格，不以接近 ±10% 猜測。上市使用同日股價升降幅度表；上櫃使用已核對前一交易日日報的「次日」停板價，對齊本次交易日。缺少或無一般限制者不列入停板榜。</p>{Object.entries(snapshot.markets).map(([m,s])=><div key={m} className="ov-source"><b>{OVERVIEW_MARKETS[m]} · {s.date||'尚無資料'}</b><p><a href={s.quoteSource} target="_blank" rel="noopener noreferrer">官方整批行情 ↗</a> · 查核 {taipeiTime(s.checkedAt)}</p>{s.limitSource&&<p><a href={s.limitSource} target="_blank" rel="noopener noreferrer">官方停板價來源 ↗</a> · 查核 {taipeiTime(s.limitCheckedAt)}</p>}{s.warnings?.length>0&&<details><summary>來源狀態</summary>{s.warnings.map((w,i)=><p key={i}>{w}</p>)}</details>}</div>)}</details>
 </div>;
}
