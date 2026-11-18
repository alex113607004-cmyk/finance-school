import React,{useEffect,useMemo,useState} from 'react';
import {Search,RefreshCw} from 'lucide-react';
import fallback from '../generated/us-summary.json';
import {loadUSPublication,searchUS} from '../us-client';
import {analysisHref,marketDate,quoteStatus} from '../security';
import {analyzeUSValuation} from '../us-valuation';
import {scenario} from '../stock-analysis';
import {format} from '../domain';
import AnalysisChart from './AnalysisChart';
import PriceResearchSummary from './PriceResearchSummary';
import {SectionNav,QuickFacts} from './StockPageChrome';
import ResearchFundamentals,{ETFReference} from './ResearchFundamentals';
const Link=({href,children})=>href?<a className="text-link" href={href} target="_blank" rel="noopener noreferrer">{children} ↗</a>:<span>{children}：尚未提供</span>;
export function USScenario({value}){
 const [eps,setEPS]=useState(value.ttm?.eps?.toString()||''),[low,setLow]=useState(value.p25?.toFixed(6)||''),[high,setHigh]=useState(value.p75?.toFixed(6)||'');
 const result=scenario(eps,low,high);
 return <section className="analysis-scenario" aria-label="美股使用者假設情境試算"><h3>調整 EPS／倍數，觀察假設的影響</h3><p>下面是使用者假設，不會補上行情或改寫歷史估值。</p><div className="analysis-scenario-fields">{[['假設近四季 EPS（USD／股）',eps,setEPS],['假設本益比下限（倍）',low,setLow],['假設本益比上限（倍）',high,setHigh]].map(([label,v,set])=><label key={label}>{label}<input type="number" step="any" value={v} onChange={e=>set(e.target.value)}/></label>)}</div><output role="status" className="analysis-scenario-result">{result.available?`假設價格區間 USD ${format(result.low)} ～ ${format(result.high)}／股`:result.reason}</output></section>;
}
export function USValuation({stock,value}){
 const latest=stock.snapshot?.metrics?.eps,prior=stock.snapshot?.prior?.metrics?.eps;
 return <section className="panel analysis-section" aria-label="美股歷史估值驗算"><span className="eyebrow">VALUATION / POINT IN TIME</span><h2>估值與情境試算</h2><p>{value.title}</p>{value.available?<><p>現價 USD {format(stock.quote.price)}，{value.title}。以最新直接申報四季稀釋 EPS {format(value.ttm.eps)} × P25 {format(value.p25)} 至 P75 {format(value.p75)}，得到 USD {format(value.low)} ～ {format(value.high)}／股；中位數 USD {format(value.median)}。</p><p>歷史倍數能否延續與獲利能否維持，是最影響結果的兩個假設。區間不保證報酬，也不等於買進指令。</p></>:<ul>{value.reasons.map(r=><li key={r}>{r}</li>)}</ul>}
  <p>最新已公告近四季 {value.ttm?.available?format(value.ttm.eps)+' USD／股':'EPS 待核實'}；有效月末樣本 {value.validSamples.length}／{value.samples.length} 筆，最低 24 筆。樣本期間 {value.validSamples[0]?.date||'尚無'} ～ {value.validSamples.at(-1)?.date||'尚無'}。</p>
  {latest?.available&&prior?.available&&<p>獲利比較：{latest.start} ～ {latest.end} 稀釋 EPS {format(latest.value)}，對照 {prior.start} ～ {prior.end} 的 {format(prior.value)} USD／股{prior.value>0?`，變化 ${format((latest.value/prior.value-1)*100)}%`:'；去年非正 EPS，不計百分比'}。這只描述已公告獲利，不把成長率當成未來預測。</p>}
  <details className="analysis-calculation"><summary>展開估值：文件版本、樣本與公式</summary><p>月末實際未還原收盤 ÷ 該日已公開且股數基準一致的四季稀釋 EPS。申報次日起採用；P25／50／75 採排序位置 (N−1)×p 線性內插。不使用後來的更正回填過去。</p><p className="analysis-formula">最新 EPS × P25 ＝ 下緣；最新 EPS × P50 ＝ 中位數；最新 EPS × P75 ＝ 上緣</p><div className="table-scroll"><table><thead><tr><th>月末</th><th>實際收盤 USD</th><th>當時 EPS</th><th>本益比</th><th>文件／排除原因</th></tr></thead><tbody>{value.samples.map(s=><tr key={s.date}><td>{s.date}</td><td>{format(s.close)}</td><td>{format(s.eps)}</td><td>{format(s.pe,4)}</td><td>{s.reason||s.reports.map(r=><p key={r.periodEnd}><Link href={r.source}>FY{r.year} Q{r.quarter} · {r.accession}</Link> · 公告 {r.announcedOn} · EPS {format(r.eps)}</p>)}</td></tr>)}</tbody></table></div>{!value.samples.length&&<p>尚無合格歷史行情，因此沒有可計算的倍數分布。</p>}</details>
  {stock.securityKind!=='etf'&&<USScenario key={stock.id+'-'+value.ttm?.eps} value={value}/>}
 </section>;
}
export default function USStockAnalysis({param='AAPL',term=t=>t}){
 const [publication,setPublication]=useState(fallback),[query,setQuery]=useState(''),[code,setCode]=useState(param.toUpperCase()),[error,setError]=useState(''),[warning,setWarning]=useState(''),[busy,setBusy]=useState(true),[refresh,setRefresh]=useState(0);
 useEffect(()=>{setCode(param.toUpperCase());setQuery('');setError('');},[param]);
 useEffect(()=>{let active=true;setBusy(true);loadUSPublication().then(p=>{if(active){setPublication(p);setWarning('');}}).catch(e=>{if(active)setWarning(e.message+'；保留最後已核實快照與原始查核日期。');}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};},[refresh]);
 const stock=publication.stocks['US:'+code],suggestions=searchUS(publication.stocks,query),value=useMemo(()=>stock?analyzeUSValuation(stock):null,[stock]);
 function choose(s){setCode(s.code);setQuery('');setError('');window.location.hash=analysisHref('US',s.code);}
 function submit(e){e.preventDefault();if(suggestions.length===1){choose(suggestions[0]);return;}const match=suggestions.find(s=>s.code.toUpperCase()===query.trim().toUpperCase());if(match){choose(match);return;}setError(query.trim()?'此代號或公司名稱尚未涵蓋，請選擇 AAPL、MSFT 或 SPY。':'請輸入美股代號或公司名稱。');}
 const q=stock?.quote,status=quoteStatus(q),fund=stock?.securityKind==='etf';
 return <div className="stock-analysis-page"><div className="page-title compact-title"><h1>美股個股研究</h1><p>Apple・Microsoft・SPY</p></div>
  <div className="analysis-stock-finder"><form className="market-search" onSubmit={submit}><Search size={18}/><label className="sr-only" htmlFor="us-analysis-search">搜尋美股代號或公司名稱</label><input id="us-analysis-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="AAPL、Apple、蘋果、MSFT、微軟" autoComplete="off"/><button className="primary">分析美股</button></form>{query&&suggestions.length>0&&<ul className="analysis-suggestions" aria-label="美股搜尋結果">{suggestions.map(s=><li key={s.id}><button onClick={()=>choose(s)}><b>{s.code}</b><span>{s.nameZh}<small>{s.name}</small></span><em>{s.market}</em></button></li>)}</ul>}</div>
  <div className="analysis-recent">{Object.values(publication.stocks).map(s=><button key={s.id} className={'secondary '+(s.code===code?'selected':'')} onClick={()=>choose(s)}>{s.nameZh} <small>{s.code}</small></button>)}</div>{error&&<p role="alert" className="error-message">{error}</p>}{warning&&<p className="notice" role="status">{warning}</p>}
  {!stock?<section className="panel empty-state"><h2>美股資料尚未涵蓋</h2><p>{code} 尚無經核實的財報與行情，請選擇搜尋結果。</p></section>:<>
   <section className="panel analysis-quote" aria-label="美股行情狀態"><div className="quote-layout"><div><span className="eyebrow">{stock.id} · {stock.market}</span><h2>{stock.nameZh} <span className="analysis-tag">{status.label}</span></h2><p className="quote-company">{stock.name}</p><div className="analysis-price"><strong>{status.usable?format(q.price):'—'}</strong><span>USD／{fund?'受益權單位':'股'}</span>{status.usable&&Number.isFinite(q.changePercent)&&<b className={q.change>0?'gain':q.change<0?'loss':''}>{format(q.change)}（{format(q.changePercent)}%）</b>}</div></div><div className="quote-actions"><button className="secondary refresh-quote" disabled={busy} onClick={()=>setRefresh(n=>n+1)}><RefreshCw size={14} className={busy?'is-spinning':''}/>{busy?'查詢中…':'重新查詢美股'}</button><p>{status.usable?`交易日 ${q.date}`:'SEC 財報資料'}<br/>幣別 USD</p>{status.usable&&<p>成交量 {format(q.volume,0)} 股<br/>{q.timestamp}</p>}</div></div>
    {!status.usable&&<p className="notice">行情資料暫不可用，可先查看已核實財報；價格與估值不以模擬數字補齊。</p>}
    {status.usable&&<p className="quote-market-meta">來源 {q.source} · {q.exchangeCoverage} · {status.label} · 延遲 {q.delayMinutes??'未提供'} 分鐘</p>}
    {!fund&&<QuickFacts term={term} items={[
     {label:'EPS',value:format(stock.snapshot?.ttm?.available?stock.snapshot.ttm.eps:null),unit:'USD／股',note:'近四季直接稀釋 EPS'},
     {label:'YoY',value:format(stock.snapshot?.metrics?.revenueYoY?.value),unit:'%',note:'季度營收年增'},
     {label:'毛利率',value:format(stock.snapshot?.metrics?.grossMargin?.value),unit:'%',note:`FY${stock.snapshot?.latest?.fiscalYear} Q${stock.snapshot?.latest?.fiscalQuarter}`},
     {label:'自由現金流',value:format(stock.snapshot?.metrics?.freeCashFlow?.available?stock.snapshot.metrics.freeCashFlow.value/1e6:null),unit:'USD 百萬元',note:`${stock.snapshot?.latest?.start} ～ ${stock.snapshot?.latest?.end}`},
    ]}/>}
    {Object.values(q.sessions||{}).some(Boolean)&&<div className="research-session-grid">{[['pre','盤前'],['regular','正常盤'],['post','盤後']].filter(([key])=>q.sessions?.[key]).map(([key,label])=><div key={key}>{label}<b>{format(q.sessions[key].price)} USD</b><small>{q.sessions[key].timestamp}</small></div>)}</div>}
   </section>
   <SectionNav/>
   <section id="stock-chart" tabIndex={-1} className="panel analysis-section chart-panel"><div className="section-title"><div><span className="eyebrow">PRICE ACTION</span><h2>價格走勢</h2></div><span className="chart-basis-tag">{status.usable?status.label:'行情尚未提供'}</span></div>{stock.history?.rows?.length?<AnalysisChart key={stock.id} history={{...stock.history,currencyLabel:'USD／股',volumeUnit:'股'}} asOf={marketDate(new Date(),'US')} term={term}/>:<div className="chart-empty" role="status"><Search size={28}/><h3>此標的暫無可用行情</h3><p>財報可正常查閱，日／週／月 K 與均線等待行情資料。</p></div>}</section>
   <div id="stock-assessment" tabIndex={-1}><PriceResearchSummary stock={stock} history={stock.history} valuation={value} snapshot={stock.snapshot} region="US" busy={busy} term={term}/></div>
   <div id="stock-fundamentals" tabIndex={-1}>{fund?<ETFReference quote={q} nav={stock.nav} source={stock.sources.issuer}/>:<ResearchFundamentals snapshot={stock.snapshot} term={term} notes={stock.code==='AAPL'?'Apple 採 52／53 週會計年度。FY2026 四季直接 EPS 相加 8.97，與全年加權股數法 8.98 不混用。':'Microsoft 於 6 月結束會計年度。FY2026 Q4 直接 EPS 4.81，不以全年減前三季的 4.80 代替。'}/>}</div>
   <div id="stock-valuation" tabIndex={-1}><USValuation stock={stock} value={value}/></div>
   <div id="stock-sources" tabIndex={-1}><details className="panel disclosure-panel source-panel"><summary>資料來源與查核<span>SEC 原始文件與資料狀態</span></summary><div className="disclosure-content"><p>{publication.policy?.secAutomaticUpdate?'財報隨排程查核，來源可能延後或失敗。':'SEC 自動更新未啟用，使用已核實財報快照。重新查詢會讀最新已發布版本。'}</p>{stock.sourceChecks&&Object.entries(stock.sourceChecks).map(([k,s])=><p key={k}><Link href={s.url}>{k==='facts'?'SEC Company Facts':'SEC Submissions'}</Link> · 查核 {s.checkedAt||'尚未成功'}</p>)}<p>CIK {stock.cik||'不適用'}。各指標的會計期間、申報日與文件編號詳列於原始數字。</p>{!status.usable&&<p>{q.reason||status.reason}</p>}{q.sourceURL&&<Link href={q.sourceURL}>行情來源與涵蓋範圍</Link>}{stock.warnings?.map((w,i)=><p className="notice" key={i}>{w}</p>)}</div></details></div>
  </>}
 </div>;
}
