import React from 'react';
import {compareMetrics,plainFinancialSummary} from '../sec-financials';
import {format} from '../domain';
const titles={revenue:'營收',revenueYoY:'營收年增率',grossMargin:'毛利率',operatingMargin:'營業利益率',netIncome:'淨利',operatingCashFlow:'營業現金流',capex:'資本支出',freeCashFlow:'自由現金流'};
const A=({href,children})=><a className="text-link" href={href} target="_blank" rel="noopener noreferrer">{children} ↗</a>;
export function FactSources({metric}){
 const sources=[...new Map((metric?.sources||[]).map(s=>[[s.accession,s.start,s.end,s.tag,s.value].join('|'),s])).values()];
 return <details className="research-fact-details"><summary>原始數字與算式</summary>{metric?.formula&&<p className="analysis-formula">{metric.formula}</p>}<p>本欄原始值：{format(metric?.value,metric?.unit==='percent'?4:2)} {metric?.unit}</p>{sources.map((s,i)=><div key={i}><b>{s.tag}：{format(s.value,2)} {s.unit}</b><p>{s.start||'時點'} ～ {s.end} · {s.currency||s.unit}<br/>公告／申報日 {s.filed} · {s.form}<br/>文件編號 {s.accession}</p><A href={s.source}>回查原始文件</A></div>)}</details>;
}
export function researchSnapshotTW(extra,ttm){
 const comparisons=Object.fromEntries(['revenue','netIncome','operatingCashFlow','capex','freeCashFlow'].map(k=>[k,compareMetrics(extra.metrics[k],extra.prior.metrics[k])]));
 return {available:true,latest:extra.latest,prior:extra.prior,ttm,metrics:{...extra.metrics,revenueYoY:comparisons.revenue},comparisons};
}
export default function ResearchFundamentals({snapshot,term= t=>t,label='SEC',notes}){
 const metrics=snapshot?.metrics||{};
 return <section className="panel analysis-section research-fundamentals" aria-label="可驗算季度基本面"><span className="eyebrow">FINANCIAL RESEARCH / {label}</span><h2>用相同期間，核對營運與現金。</h2>
  <p>{snapshot?.latest?`會計年度 FY${snapshot.latest.fiscalYear} Q${snapshot.latest.fiscalQuarter} · ${snapshot.latest.start||snapshot.latest.metrics?.revenue?.start||'起日待核實'} ～ ${snapshot.latest.end}`:'尚無完整可核實季度'}。金額以原幣百萬元顯示，展開可看未縮放原始值。</p>
  <div className="research-metric-grid">{['revenue','revenueYoY','grossMargin','operatingMargin','operatingCashFlow','capex','freeCashFlow'].map(key=>{
   const m=metrics[key],percent=['revenueYoY','grossMargin','operatingMargin'].includes(key),currency=m?.currency||metrics.revenue?.currency||'USD',unit=percent?'%':`${currency} 百萬元`;
   const first=m?.sources?.[0];const display=key==='revenueYoY'?m?.value:m?.value;
   return <article key={key}><span>{['grossMargin','operatingMargin','operatingCashFlow','capex','freeCashFlow'].includes(key)?term(titles[key]):titles[key]}</span><strong>{m?.available?format(percent?display:display/1e6,2):'—'} <small>{unit}</small></strong>
    {m?.available?<><p>{m.start||m.current?.start} ～ {m.end||m.current?.end}<br/>{key==='revenueYoY'?`比較期 ${m.prior?.start} ～ ${m.prior?.end}`:`公告／申報 ${m.filed||'待核實'}`}</p>{first&&<A href={first.source}>原始來源 {first.form}</A>}{key==='revenueYoY'?<div><p className="analysis-formula">({format(m.current.value,0)} ÷ {format(m.prior.value,0)} − 1) × 100%</p><p>本期公告 {m.current.filed} · 比較期版本公告 {m.prior.filed}</p><FactSources metric={m.current}/><FactSources metric={m.prior}/></div>:<FactSources metric={m}/>}</>:<p className="subtle">{m?.reason||'缺少可核對的原始數值與公告日，不以模擬資料補齊。'}</p>}
   </article>;
  })}</div>
  {snapshot?.ttm&&<div className="research-eps"><h3>近四季稀釋 EPS：{snapshot.ttm.available?format(snapshot.ttm.eps)+' '+(metrics.revenue?.currency||'USD')+'／股':'暫無可驗證數值'}</h3><p>依連續四個會計季度的直接稀釋 EPS 相加；不把年度累計值當成單季。{snapshot.ttm.reason}</p><div className="table-scroll"><table><thead><tr><th>會計年度／季度</th><th>期間</th><th>稀釋 EPS</th><th>公告／申報日</th><th>文件</th></tr></thead><tbody>{snapshot.ttm.reports?.map(r=><tr key={r.periodEnd}><td>FY{r.year} Q{r.quarter}</td><td>{r.periodStart} ～ {r.periodEnd}</td><td>{format(r.eps)} {r.currency||metrics.revenue?.currency||'USD'}／股</td><td>{r.announcedOn}</td><td>{r.source?<A href={r.source}>{r.accession||'公司首次公告'}</A>:'尚未核實'}</td></tr>)}</tbody></table></div>{snapshot.ttm.available&&<p className="analysis-formula">{snapshot.ttm.reports.map(r=>format(r.eps)).join(' ＋ ')} ＝ {format(snapshot.ttm.eps)}／股</p>}</div>}
  <div className="research-summary" aria-label="基本面白話摘要"><h3>這些變化可以怎麼讀？</h3>{plainFinancialSummary(snapshot||{available:false,reason:'目前沒有足夠財報數字產生摘要。'}).map((s,i)=><p key={i}>{s}</p>)}<p>營收增加不保證獲利品質改善，現金流也會受收付款時點影響；本頁沒有據此預測股價或保證買進報酬。</p></div>{notes&&<p className="subtle">{notes}</p>}
  <div className="analysis-course-links"><a href="#unit/fund-pe">EPS 與本益比課程 ↗</a><a href="#unit/fund-statements">財報與現金流課程 ↗</a></div>
 </section>;
}
export function etfPremium(quote,nav){
 const price=quote?.price??quote?.close;
 if(!nav?.available||!Number.isFinite(nav.value)||nav.value<=0)return {available:false,reason:'尚無可核實基金淨值。'};
 if(!Number.isFinite(price)||price<=0||quote.date!==nav.date||quote.currency!==nav.currency)return {available:false,reason:'價格與淨值未同日、同幣別，折溢價不混算。'};
 return {available:true,value:(price/nav.value-1)*100};
}
export function ETFReference({quote,nav,source}){const result=etfPremium(quote,nav);return <section className="panel analysis-section" aria-label="ETF 淨值與折溢價"><h2>ETF：看淨值與折溢價</h2><div className="analysis-ratios"><div>每單位淨值<b>{nav?.available?format(nav.value):'—'}</b><small>{nav?.date||'日期尚未取得'} · {nav?.currency||quote?.currency||'幣別待核實'}</small></div><div>折溢價<b>{result.available?format(result.value)+'%':'—'}</b><small>{result.reason||'（價格 ÷ 淨值 − 1）× 100%'}</small></div></div><p>ETF 不使用發行公司或成分股的 EPS 代替基金淨值。</p>{source&&<A href={source}>發行人／官方基金資料</A>}</section>}
