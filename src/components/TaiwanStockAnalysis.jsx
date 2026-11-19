import React,{useEffect,useMemo,useState} from 'react';
import {Search,RefreshCw,ArrowUpRight,Calculator,Info} from 'lucide-react';
import baseline from '../generated/analysis.json';
import marketBaseline from '../generated/market.json';
import catalog from '../generated/universe-catalog.json';
import {createAnalysisClient,emptyHistory,mergeHistory,quoteFromHistory} from '../analysis-client';
import {MARKET_NAMES,KIND_NAMES,searchStocks,resolveStock,universeCounts} from '../stock-universe';
import {historicalValuation,scenario,taipeiDay} from '../stock-analysis';
import {format} from '../domain';
import {taipeiTime,freshness} from '../freshness';
import AnalysisChart from './AnalysisChart';
import PriceResearchSummary from './PriceResearchSummary';
import FinancialDataStatus from './FinancialDataStatus';
import {dataReadiness} from '../data-readiness';
import {DataReadinessSummary,readinessId} from './DataReadiness';
import {SectionNav,QuickFacts} from './StockPageChrome';
import {cashflowView} from '../tw-cashflow';
import QuoteSnapshot from './QuoteSnapshot';
import ResearchFundamentals,{researchSnapshotTW,ETFReference} from './ResearchFundamentals';
import extra2330 from '../../data/2330-research-metrics.json';
import {analysisHref} from '../security';
import '../stock-analysis.css';

const Link=({href,children})=>!href?<span className="subtle">{children}（尚未取得來源）</span>:<a className="text-link" href={href} target="_blank" rel="noopener noreferrer">{children} <ArrowUpRight size={13}/></a>;
const qlabel=r=>r?`${r.year} Q${r.quarter}`:'—';
function Computation({value}){
 const a=value.validSamples,sorted=a.map(s=>s.pe).sort((x,y)=>x-y);
 return <details className="analysis-calculation"><summary><Calculator size={16}/> 展開計算：EPS、歷史倍數與價格區間</summary>
  <h3>1. 原始 EPS：只加單季，不加累計</h3><p>採合併稀釋 EPS，單位為新台幣元／普通股。各季值來自該季首次財報新聞稿；四捨五入值相加可能與全年加權股數計算的 EPS 略有差異。本頁自行重算本益比，與證交所公布倍數的分母口徑可能不同。</p>
  <div className="table-scroll"><table><thead><tr><th>會計期間</th><th>單季 EPS（元／股）</th><th>首次公告日</th><th>保守可用日</th><th>來源與版本</th></tr></thead><tbody>{value.ttm?.reports.map(r=><tr key={r.periodEnd}><td>{qlabel(r)}<br/>{r.periodStart} ～ {r.periodEnd}</td><td>{format(r.eps)}</td><td>{r.announcedOn}</td><td>{r.availableFrom}</td><td><Link href={r.source}>公司首次新聞稿</Link><br/>{r.version}</td></tr>)}</tbody></table></div>
  <p className="analysis-formula">{value.ttm?.reports.map(r=>format(r.eps)).join(' ＋ ')} ＝ {format(value.ttm?.eps)} 元／股</p>
  <h3>2. 用當時已公開財報重算每個月末本益比</h3><p>公告當日可能已收盤，統一從公告次日才納入，避免使用盤後才知道的數字。只取已結束且來源完整的曆月之最後交易日，不含本月期中值。以下每列可展開該時點的四季 EPS 與來源。</p>
  <div className="table-scroll analysis-samples"><table><thead><tr><th>月末交易日／行情來源</th><th>收盤（元）</th><th>當時近四季 EPS</th><th>收盤 ÷ EPS（倍）</th><th>當時已公開財報</th></tr></thead><tbody>{value.samples.map(s=><tr key={s.date}><td><Link href={s.source}>{s.date}</Link></td><td>{format(s.close)}</td><td>{format(s.eps)}</td><td>{format(s.pe,4)}{s.reason&&<small>{s.reason}</small>}</td><td><details><summary>{s.reports.map(qlabel).join('、')}</summary>{s.reports.map(r=><p key={r.periodEnd}><Link href={r.source}>{qlabel(r)}：{format(r.eps)}</Link> · 公告 {r.announcedOn}，{r.availableFrom} 起納入</p>)}</details></td></tr>)}</tbody></table></div>
  {value.available&&<><h3>3. 排序後取第 25、50 與第 75 百分位</h3><p>採線性內插：0 起算位置 h = (N − 1) × p，q = 排序值[floor(h)] ＋ 小數部分 ×（下一值 − 前一值）。保留全精度計算，頁面顯示才四捨五入。</p>{[[.25,value.p25],[.5,value.p50],[.75,value.p75]].map(([p,q])=>{const h=(a.length-1)*p,l=Math.floor(h);return <p className="analysis-formula" key={p}>P{p*100}：h = ({a.length} − 1) × {p} = {format(h,2)}<br/>{format(sorted[l],6)} ＋ {format(h-l,2)} × ({format(sorted[Math.ceil(h)],6)} − {format(sorted[l],6)}) = {format(q,6)} 倍</p>})}<p className="analysis-formula">下緣 {format(value.ttm.eps)} × {format(value.p25,6)} ＝ {format(value.low)} 元<br/>上緣 {format(value.ttm.eps)} × {format(value.p75,6)} ＝ {format(value.high)} 元</p></>}
 </details>;
}
function Scenario({value}){
 const [eps,setEPS]=useState(value.ttm?.eps?.toString()||''),[low,setLow]=useState(value.p25?.toFixed(6)||''),[high,setHigh]=useState(value.p75?.toFixed(6)||'');
 const result=scenario(eps,low,high);
 return <section className="analysis-scenario" aria-label="使用者假設情境試算"><div className="section-title"><div><h3>換個假設，自己算一次</h3><p>下方均為使用者假設，不會改寫原始財報與歷史估值判讀。</p></div><span className="analysis-tag">情境試算</span></div><div className="analysis-scenario-fields">{[['假設近四季 EPS（元／股）',eps,setEPS],['假設本益比下限（倍）',low,setLow],['假設本益比上限（倍）',high,setHigh]].map(([label,v,set])=><label key={label}>{label}<input type="number" step="any" value={v} onChange={e=>set(e.target.value)}/></label>)}</div><output role="status" className="analysis-scenario-result">{result.available?`假設區間 ${format(result.low)} ～ ${format(result.high)} 元／股` :result.reason}</output><p className="subtle">情境用到的倍數與 EPS 由你決定；零或負 EPS 不套用本益比法。這是敏感度分析，不是目標價。</p><button className="secondary" onClick={()=>{setEPS(value.ttm?.eps?.toString()||'');setLow(value.p25?.toFixed(6)||'');setHigh(value.p75?.toFixed(6)||'')}}>還原原始資料的起始值</button></section>;
}
function Fundamentals({stock,filings,ttm,term}){
 const f=stock.fundamentals||{},revenue=f.revenue,verifiedCash=cashflowView(stock),cash=filings?.cashflow||(verifiedCash.available?verifiedCash:null),e=f.earnings;
 const fund=['etf','etn','reit'].includes(stock.securityKind),financial=f.kind==='financial';
 return <section className="panel analysis-section" aria-label="個股基本面">
  <span className="eyebrow">BUSINESS DATA / 各項期間分開列示</span><h2>{fund?'基金資料':'營運與財務指標'}</h2>
  {fund?<p>此標的是 {KIND_NAMES[stock.securityKind]}，不以單一公司的 EPS、毛利率或營業現金流衡量；應查看基金淨值、折溢價、成分、費用及公開說明書。本頁提供真實行情與日線，不套用公司本益比估值。</p>:<>
  <div className="analysis-fund-grid">
   <article><span>{ttm?.available?'近四季稀釋 ':'年初至季末累計基本 '}{term('EPS')}</span><strong>{format(ttm?.available?ttm.eps:e?.epsYtd)} <small>元／股</small></strong>
    <p>{ttm?.available?`${ttm.reports[0].periodStart} ～ ${ttm.latest.periodEnd}`:e?.period?.label||'來源尚未提供財報期間'}</p>
    {ttm?.available?<><p>最新季首次公告 {ttm.latest.announcedOn}</p><Link href={ttm.latest.source}>公司首次財報新聞稿</Link><p className="subtle">合併、單季稀釋 EPS 四季相加；非年初累計基本 EPS。</p></>:<><Link href={stock.sources?.earnings}>官方綜合損益表</Link><p className="subtle">出表日 {e?.tableDate||'—'}，不等於公告日。此為累計值，不能當成單季或近四季 EPS。首次公告日與連續四季尚未核實。</p></>}
   </article>
   <article><span>{term('單月營收')} 年增率 {term('YoY')}</span><strong>{format(revenue?.yoy)} <small>%</small></strong><p>{revenue?.month||'尚未取得'} · {revenue?.unit||'新台幣千元'}<br/>本月 {format(revenue?.amount,0)}<br/>去年同月 {format(revenue?.priorYear,0)}</p><Link href={stock.sources?.revenue}>官方公司申報資料</Link><p className="subtle">(本月 − 去年同月) ÷ 去年同月 × 100%；出表日 {revenue?.tableDate||'—'}（非首次公告日）。擷取 {taipeiTime(stock.sourceChecks?.revenue)}。</p></article>
   <article><span>{term('營業現金流')}（活動淨額）</span><strong>{format(cash?.amount,0)} <small>{cash?.unit||'新台幣千元'}</small></strong>
    {cash?<><p>{cash.periodStart} ～ {cash.periodEnd}<br/>公告 {cash.announcedOn||'來源未提供'} · {cash.unaudited?'首次公告未經查核摘要':'合併財報'}</p><Link href={cash.source}>公司現金流表{cash.page?`第 ${cash.page} 頁`:''}</Link><p className="subtle">{cash.basis==='year-to-date'?'年初至季末累計；最近成功查核 '+taipeiTime(cash.checkedAt):cash.basis}。不與其他累計季度相加，也不等於自由現金流。</p></>:<><p>{verifiedCash.reason}不從淨利推估現金流。</p><Link href="https://mopsfin.twse.com.tw/">公開資訊觀測站財務比較 E 點通</Link><p className="subtle">可用代號 {stock.code} 查原始財報；本站採批次快取逐步回補。</p></>}
   </article>
  </div>
  <div className="analysis-ratios">{[['毛利率',financial?null:stock.profit?.gross,'%',stock.profit?.period],['營業利益率',financial?null:stock.profit?.operating,'%',stock.profit?.period],['淨利率',financial?null:stock.profit?.net,'%',stock.profit?.period],['負債比率',f.balance?.debtRatio,'%',f.balance?.period?.label],['流動比率',financial?null:f.balance?.currentRatio,'%',f.balance?.period?.label]].map(([name,v,u,period])=><div key={name}>{term(name)}<b>{format(v)} {u}</b><small>{financial&&['毛利率','營業利益率','淨利率','流動比率'].includes(name)?'金融業不套一般業比率':period||'尚未提供'}</small></div>)}</div>
  <p className="subtle">財報比率為年初至季末累計，資產負債表為季末時點。公司資料來源：<Link href={stock.sources?.earnings}>損益表</Link>　<Link href={stock.sources?.balance}>資產負債表</Link>。不同會計期間不混加。</p>
  </>}
  {!fund&&stock.code!=='2330'&&<div className="analysis-ratios"><div>{term('資本支出')}<b>{format(verifiedCash.capex,0)}</b><small>{verifiedCash.capex!==null?`${verifiedCash.unit} · ${verifiedCash.periodStart} ～ ${verifiedCash.periodEnd}；現金設備支出正值。`:'尚缺同期間現金購置設備與原始財報。'}</small></div><div>{term('自由現金流')}<b>{format(verifiedCash.freeCashFlow,0)}</b><small>{verifiedCash.freeCashFlow!==null?`${verifiedCash.unit} · 同期間 OCF − 現金設備支出；年初累計。`:'不以淨利或累計 EPS 代替 OCF − 資本支出。'}</small></div>{financial&&<div>ROE<b>—</b><small>尚缺可比較平均權益與同期淨利；保留官方 P/B。</small></div>}</div>}
  <div className="analysis-links">{stock.company?.website&&<Link href={stock.company.website}>公司網站</Link>}</div>
 </section>;
}
function OfficialValuation({stock,term}){
 const v=stock.valuation,peer=stock.officialPeer;
 return <section className="panel analysis-section" aria-label="官方估值與獲利觀察"><span className="eyebrow">OFFICIAL METRICS / 與歷史 EPS 模型分開</span><h2>先讀官方倍數，再理解比較限制。</h2><div className="analysis-ratios">{[['本益比',v?.pe,'倍'],['股價淨值比',v?.pb,'倍'],['殖利率',v?.yield,'%']].map(([name,n,unit])=><div key={name}>{term(name)}<b>{format(n)} {unit}</b><small>資料日 {v?.date||'尚未提供／不適用'}</small></div>)}</div>
  <p>{v?.pe>0?`官方本益比為 ${format(v.pe)} 倍，表示此日價格相對官方盈餘參考基準的倍數。`:['etf','etn','reit'].includes(stock.securityKind)?'基金不適用單一公司的本益比法。':'官方未提供有效正本益比，可能涉及虧損、財報不足或不適用；不顯示 0 倍作為便宜訊號。'} {v?.date&&v.date!==stock.quote?.date&&`估值日 ${v.date} 與行情日 ${stock.quote?.date} 不同，本頁不將兩者混算成 EPS。`}</p>
  {peer&&v?.pe>0&&<div className="analysis-peer"><h3>{v.pe<peer.p25?'官方倍數低於同業分布中段':v.pe>peer.p75?'官方倍數高於同業分布中段':'官方倍數位於同業分布中段'}</h3><p>同日 {peer.count} 家同市場、同產業正本益比公司（排除自己），P25 {format(peer.p25)}、中位數 {format(peer.median)}、P75 {format(peer.p75)} 倍。資料日 {peer.date}。</p><p className="subtle">{peer.basis} 同業倍數較低不保證低估；這也不是本頁的自身歷史估值區間。</p></div>}
  {stock.fundamentals?.earnings?.epsYtd!==null&&Number.isFinite(stock.fundamentals?.earnings?.epsYtd)&&<p className="subtle">已申報累計 EPS {format(stock.fundamentals.earnings.epsYtd)} 元（{stock.fundamentals.earnings.period?.label}）；{stock.fundamentals.earnings.epsYtd<=0?'本期累計未獲利，應先釐清虧損與現金流，不因股價下跌就推論便宜。':'仍需核實完整四季及現金流，再評估獲利是否持續。'}</p>}
  <Link href={stock.sources?.valuation}>{stock.market==='TWSE'?'證交所':'櫃買中心'}官方估值來源</Link>
 </section>;
}
const fallbackStocks={...catalog.stocks,...Object.fromEntries(Object.entries(marketBaseline.stocks).map(([code,s])=>[code,{...s,market:'TWSE',securityKind:catalog.stocks[code]?.securityKind||(/^00/.test(code)?'etf':'stock')}]))};
export default function TaiwanStockAnalysis({term,param}){
 const [client]=useState(()=>{let storage=null;try{storage=localStorage;}catch{}return createAnalysisClient({baseUrl:document.baseURI,storage});});
 const [universe,setUniverse]=useState({stocks:fallbackStocks,generatedAt:catalog.generatedAt}),[curated,setCurated]=useState(baseline),[query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[focused,setFocused]=useState(false),[activeOption,setActiveOption]=useState(0),[searchError,setSearchError]=useState(''),[code,setCode]=useState(param||'2330'),[loaded,setLoaded]=useState(null),[refresh,setRefresh]=useState(0),[publication,setPublication]=useState({busy:true,warnings:[]}),[checking,setChecking]=useState(false),[progress,setProgress]=useState(null),[recent,setRecent]=useState(()=>{try{return JSON.parse(localStorage.getItem('finance-school.recent-stocks')||'[]').filter(x=>typeof x==='string').slice(0,6);}catch{return [];}});
 const selected=Object.hasOwn(universe.stocks,code)?universe.stocks[code]:null,counts=universeCounts(universe.stocks),suggestions=searchStocks(universe.stocks,query,{market:filter,limit:12});
 useEffect(()=>{setCode(param||'2330');setFocused(false);},[param]);
 useEffect(()=>{let active=true;setPublication({busy:true,warnings:[]});client.publications().then(r=>{if(!active)return;if(r.universe)setUniverse(r.universe);if(r.curated)setCurated(r.curated);setPublication({busy:false,warnings:r.warnings});});return()=>{active=false;};},[client,refresh]);
 useEffect(()=>{
  if(!selected)return;let active=true;setChecking(true);setProgress(null);
  client.loadHistory(selected,{force:refresh>0,onProgress:p=>{if(active)setProgress(p);}}).then(history=>{if(active)setLoaded({code,history,checkedAt:new Date(),error:null});}).catch(e=>{if(active)setLoaded({code,history:null,checkedAt:new Date(),error:e.message});}).finally(()=>{if(active)setChecking(false);});
  return()=>{active=false;};
 },[client,code,selected?.market,refresh]);
 function choose(stock){setCode(stock.code);setQuery('');setFocused(false);setSearchError('');setLoaded(null);window.location.hash=analysisHref('TW',stock.code);const r=[stock.code,...recent.filter(c=>c!==stock.code)].slice(0,6);setRecent(r);try{localStorage.setItem('finance-school.recent-stocks',JSON.stringify(r));}catch{}}
 function submit(e){e.preventDefault();if(focused&&query&&activeOption>0&&suggestions[activeOption]){choose(suggestions[activeOption]);return;}const found=resolveStock(universe.stocks,query);if(found){choose(found);return;}if(!query.trim()){setSearchError('請輸入股票代號或名稱。');return;}if(suggestions.length){setFocused(true);setSearchError('找到多個相關標的，請從搜尋結果選擇。');return;}setCode(query.trim());setLoaded(null);setFocused(false);setSearchError('');window.location.hash=analysisHref('TW',query.trim());}
 const currentLoad=loaded?.code===code?loaded:null,entry=Object.hasOwn(curated.stocks,code)?curated.stocks[code]:null,history=useMemo(()=>mergeHistory(entry?.history,currentLoad?.history)||emptyHistory(code,selected?.market),[entry,currentLoad,code,selected?.market]);
 const baseStock=selected||null,stock=baseStock?quoteFromHistory(baseStock,history):null;
 const knownQuote=entry?.quote;
 const quote=stock&&knownQuote&&(knownQuote.date>stock.quote?.date||knownQuote.date===stock.quote?.date&&knownQuote.checkedAt>(stock.sourceChecks?.quotes||''))?knownQuote:stock?.quote;
 const effectiveStock=knownQuote&&quote===knownQuote?{...stock,quote,sources:{...stock?.sources,quotes:knownQuote.source},sourceChecks:{...stock?.sourceChecks,quotes:knownQuote.checkedAt}}:stock;
 const filings=entry?.filings||{reports:[],warnings:[],basisConfirmed:false,checkedAt:null},value=historicalValuation({quote,history,filings,expectedPeriod:stock?.fundamentals?.earnings?.period});
 const researchSnapshot=code==='2330'?researchSnapshotTW(extra2330,value.ttm):undefined;
 const fund=['etf','etn','reit'].includes(selected?.securityKind),busy=checking||publication.busy;
 const warnings=[...publication.warnings,...(selected?.warnings||[]),...(entry?.warnings||[]),...(filings.warnings||[]),currentLoad?.error,history.reason].filter(Boolean);
 const readiness=selected?dataReadiness({stock:effectiveStock,history,valuation:value,filings,snapshot:researchSnapshot,coverage:universe.financialCoverage,busy,refreshWarnings:warnings}):null;
 const priceUnit=/^\d{5}[CK]$/.test(code)?'原交易幣別／受益權單位（幣別待核實）':'新台幣元／'+(fund?'受益權單位':'股');
 return <div className="stock-analysis-page">
  <div className="page-title compact-title"><h1>台股個股研究</h1><p>上市・上櫃・興櫃，共 {Object.values(counts).reduce((a,b)=>a+b,0).toLocaleString()} 檔標的</p></div>
  <div className="analysis-stock-finder"><form className="market-search" onSubmit={submit}><Search size={18}/><label className="sr-only" htmlFor="analysis-search">搜尋個股代號或名稱</label><input id="analysis-search" role="combobox" aria-autocomplete="list" aria-expanded={focused&&!!query&&!!suggestions.length} aria-controls="stock-search-results" aria-activedescendant={focused&&suggestions[activeOption]?'stock-option-'+suggestions[activeOption].code:undefined} autoComplete="off" onBlur={e=>{if(!e.currentTarget.parentElement.parentElement.contains(e.relatedTarget))setFocused(false);}} value={query} onFocus={()=>setFocused(true)} onChange={e=>{setQuery(e.target.value);setActiveOption(0);setFocused(true);}} onKeyDown={e=>{if(e.key==='Escape')setFocused(false);if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();setFocused(true);setActiveOption(i=>Math.max(0,Math.min(suggestions.length-1,i+(e.key==='ArrowDown'?1:-1))));}}} placeholder="搜尋代號或名稱，例如 2330"/><button className="primary">分析個股</button></form>
   {focused&&query&&suggestions.length>0&&<ul className="analysis-suggestions" role="listbox" id="stock-search-results" aria-label="股票搜尋結果">{suggestions.map((s,i)=><li role="option" id={'stock-option-'+s.code} aria-selected={i===activeOption} key={s.code} onMouseDown={e=>e.preventDefault()}><button type="button" onClick={()=>choose(s)}><b>{s.code}</b><span>{s.name}<small>{s.company?.fullName}</small></span><em>{MARKET_NAMES[s.market]} · {KIND_NAMES[s.securityKind]||'股票'}</em></button></li>)}</ul>}
  </div>
  <div className="analysis-search-controls"><label>搜尋範圍 <select aria-label="股票市場篩選" value={filter} onChange={e=>{setFilter(e.target.value);setActiveOption(0);setFocused(true);}}><option value="all">全市場</option>{Object.keys(MARKET_NAMES).map(m=><option key={m} value={m}>{MARKET_NAMES[m]}</option>)}</select></label><div className="analysis-recent">{[...new Set([...recent,'2330','2317','6488','0050'])].slice(0,7).filter(c=>universe.stocks[c]).map(c=><button key={c} className={'secondary '+(c===code?'selected':'')} onClick={()=>choose(universe.stocks[c])}>{universe.stocks[c].name} <small>{c}</small></button>)}</div></div>
  {searchError&&<p role="alert" className="error-message">{searchError}</p>}
  {!selected?<section className="panel empty-state" role="status"><Info size={24}/><h2>{publication.busy?'正在更新全市場清單':'查無代號或名稱'}</h2><p>「{code}」未出現在目前官方清單。請核對代號或選擇搜尋結果；不含權證、個別債券及已下市標的。</p><button className="primary" onClick={()=>choose(universe.stocks['2330'])}>查看台積電</button></section>:<>
  <SectionNav/>
  <DataReadinessSummary report={readiness} detailsId={readinessId('TW',code)}/>
  <div className="stock-overview">
  <section className="panel analysis-quote" aria-label="個股盤後行情">
   <div className="quote-layout">
    <div className="quote-heading">
     <h2>{selected.name} <span className="quote-symbol">{selected.code}</span></h2>
     <p className="quote-company">{selected.company?.fullName}</p>
     <p className="quote-market">{selected.market} · {MARKET_NAMES[selected.market]} · {KIND_NAMES[selected.securityKind]||'股票'} · {selected.market==='ESB'?'成交快照':'盤後'}</p>
    </div>
    <button className="secondary refresh-quote" disabled={busy} onClick={()=>setRefresh(r=>r+1)}><RefreshCw size={14} className={busy?'is-spinning':''}/>{busy?progress?`載入日線 ${progress.finished}/${progress.total}`:'查詢中…':'重新查詢'}</button>
    <div className="analysis-price"><strong>{format(quote?.close)}</strong><span>{priceUnit}</span>{Number.isFinite(quote?.change)&&<b className={quote.change>0?'gain':quote.change<0?'loss':''}>{quote.change>0?'+':''}{format(quote.change)}（{quote.changePercent>0?'+':''}{format(quote.changePercent)}%）</b>}</div>
    <div className="quote-meta">
     <p>{selected.market==='ESB'?'成交日期':'交易日'} <b>{quote?.date||'尚未取得'}</b><br/>{quote?.time&&quote.time.replace(/(\d{2})(\d{2})(\d{2})/,'$1:$2:$3')} {freshness(quote?.date).label}</p>
     <p>成交量 <b>{format(quote?.volume,0)}</b> {fund?'受益權單位':'股'}<br/><Link href={effectiveStock?.sources?.quotes}>{selected.market==='TWSE'?'臺灣證券交易所':'證券櫃檯買賣中心'}</Link></p>
    </div>
   </div>
   {!Number.isFinite(quote?.close)&&<p role="status" className="notice">尚無有效成交價，可能暫停交易、今日無成交或來源尚未更新。</p>}
   {!fund&&<QuickFacts term={term} items={[
    {label:'EPS',value:format(value.ttm?.available?value.ttm.eps:effectiveStock.fundamentals?.earnings?.epsYtd),unit:'元／股',note:value.ttm?.available?'近四季稀釋 EPS':`${effectiveStock.fundamentals?.earnings?.period?.label||'期間待確認'} · 累計基本 EPS`},
    {label:'本益比',value:format(readiness.pe?.value??effectiveStock.valuation?.pe),unit:'倍',note:readiness.pe?`本頁重算 · ${readiness.pe.date}`:`官方倍數${readiness.mismatches.length?'（不同日）':''} · ${effectiveStock.valuation?.date||'尚未提供'}`},
    {label:'營業利益率',value:format(effectiveStock.fundamentals?.kind==='financial'?null:effectiveStock.profit?.operating),unit:'%',note:effectiveStock.fundamentals?.kind==='financial'?'金融業不套一般業比率':effectiveStock.profit?.period||'期間待確認'},
    {label:'YoY',value:format(effectiveStock.fundamentals?.revenue?.yoy),unit:'%',note:`單月營收年增 · ${effectiveStock.fundamentals?.revenue?.month||'月份待確認'}`},
   ]}/>}
   {warnings.length>0&&<details className="quote-update-note"><summary>有 {new Set(warnings).size} 項資料待確認，查看詳情</summary><p className="notice" role="status">{[...new Set(warnings)].join('；')}{filings.warnings?.some(w=>w.startsWith('公司公告更新失敗'))&&value.available?'；沿用已核實首次公告快照及原查核時間，下一季結束仍未核實時停止估值。':''}</p></details>}
  </section>
  <section id="stock-chart" tabIndex={-1} className="panel analysis-section chart-panel"><div className="section-title"><h2>價格走勢</h2><span className="chart-basis-tag">盤後 · 未還原價格</span></div>{history.rows.length?<AnalysisChart key={code} history={{...history,currencyLabel:priceUnit,volumeUnit:fund?'受益權單位':'股'}} asOf={taipeiDay()} term={term}/>:<div className="chart-empty" role="status"><Info size={28}/><h3>{checking?'正在載入官方日線':'日線資料暫不可用'}</h3><p>{history.reason||currentLoad?.error||'此標的尚無可核實的日線資料。'}</p></div>}</section>
  </div>
  <div id="stock-assessment" tabIndex={-1}><PriceResearchSummary stock={{...effectiveStock,quote,currency:/^\d{5}[CK]$/.test(code)?'幣別尚未核實':'TWD'}} history={history} valuation={value} snapshot={researchSnapshot} region="TW" busy={busy} term={term}/></div>
  {import.meta.env.DEV&&import.meta.env.VITE_TWSTOCK_LOCAL==='1'&&['TWSE','TPEX'].includes(selected.market)&&<QuoteSnapshot key={code} code={code} priceUnit={priceUnit} estimate={value}/>}
  <div id="stock-fundamentals" tabIndex={-1}>
   {code==='2330'&&<ResearchFundamentals snapshot={researchSnapshot} term={term} label="TSMC IR" notes="單季、合併財報。淨利歸屬母公司，資本支出採現金購置設備。"/>}
   {fund&&<ETFReference quote={{...quote,currency:'TWD'}} nav={{available:false}} source={code==='0050'?'https://www.yuantaetfs.com/product/detail/0050/Basic_information':'https://www.twse.com.tw/zh/ETFortune/index'}/>}
   {!fund&&(code==='2330'?<details className="panel disclosure-panel"><summary>月營收與累計財報<span>更多財務指標</span></summary><Fundamentals stock={effectiveStock} filings={filings} ttm={value.ttm} term={term}/></details>:<Fundamentals stock={effectiveStock} filings={filings} ttm={value.ttm} term={term}/>)}
   <details className="panel disclosure-panel"><summary>官方估值與同業比較<span>本益比・股價淨值比・殖利率</span></summary><OfficialValuation stock={effectiveStock} term={term}/></details>
  </div>
  <section id="stock-valuation" tabIndex={-1} className="panel analysis-section" aria-label="歷史估值驗算"><div className="section-title"><h2>{fund?'基金估值適用範圍':'估值與情境試算'}</h2><span className="analysis-tag">{value.validSamples.length} 筆有效月末樣本</span></div>
   {fund?<h3>基金不適用公司本益比法</h3>:<p>最新已公告近四季 {term('EPS')} × 歷史{term('本益比')} P25～P75。假設可調整，原始資料維持不變。</p>}
   <details className="valuation-data-notes"><summary>估值樣本與查核日期</summary><div className="analysis-metadata"><span>有效樣本 <b>{value.validSamples.length}／{value.samples.length} 筆（最低 24）</b></span><span>樣本期間 <b>{value.validSamples[0]?.date||'尚未建立'} ～ {value.validSamples.at(-1)?.date||'—'}</b></span><span>首次公告查核 <b>{taipeiTime(filings.checkedAt)}</b></span></div></details>
   {entry&&<Computation value={value}/>}{!fund&&<Scenario key={`${code}-${quote?.date}-${value.ttm?.eps}-${value.p25}`} value={value}/>}
  </section>
  <div id="stock-sources" tabIndex={-1}>
   <FinancialDataStatus stock={effectiveStock} history={history} valuation={value} report={readiness}/>
   <details className="panel disclosure-panel source-panel"><summary>資料來源與價格口徑<span>查看擷取日期與原始連結</span></summary><div className="disclosure-content"><p>行情擷取 {taipeiTime(effectiveStock?.sourceChecks?.quotes)} · 日線查詢 {taipeiTime(currentLoad?.checkedAt)}。價格與均線採同一未還原口徑，不計股利再投資及稅費。</p><p>全市場快照 {taipeiTime(universe.generatedAt)}；{history.rows.length?`日線 ${history.rows[0].date} ～ ${history.rows.at(-1).date}，${history.rows.length} 筆。`:'日線尚未提供。'}累計與單季財報分開列示，出表日不當作公告日。</p>
    {selected.market==='ESB'&&<p>興櫃提供最新成交與前日均價，不視為集中市場收盤價。</p>}
    {universe.warnings?.length>0&&<details><summary>來源更新狀態（{universe.warnings.length} 項）</summary>{universe.warnings.map((w,i)=><p key={i}>{w}</p>)}</details>}
    {history.sources.length>0&&<details><summary>歷史行情原始來源</summary><div className="analysis-source-list">{history.sources.map(s=><p key={s.url}><Link href={s.url}>{s.label||s.month||s.date} {MARKET_NAMES[selected.market]}原始行情</Link> · {taipeiTime(s.checkedAt)}</p>)}</div></details>}
   </div></details>
  </div>
  </>}
 </div>;
}
