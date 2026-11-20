import React,{useMemo} from 'react';
import {ArrowDownRight,ArrowUpRight,Minus,ShieldCheck} from 'lucide-react';
import {assessPrice} from '../price-assessment';
import {format} from '../domain';
import {etfPremium} from '../etf-nav';
import '../price-assessment.css';
const Source=({url,children})=>url?<a className="text-link" href={url} target="_blank" rel="noopener noreferrer">{children} ↗</a>:null;
function Fact({row}){return <div className={row.caution?'assessment-caution':''}><span>{row.label}</span><strong>{row.available?row.text:'尚未核實'}</strong><small>{row.available?row.period:row.reason}</small>{row.available&&<div className="assessment-fact-sources">{row.sources.map((url,i)=><Source key={url} url={url}>來源 {i+1}</Source>)}</div>}</div>}
export default function PriceResearchSummary({stock,history,valuation,snapshot,region='TW',busy=false,term=t=>t}){
 const report=useMemo(()=>assessPrice({stock,history,valuation,snapshot,region}),[stock,history,valuation,snapshot,region]);
 const {technical,fundamental,peer}=report;
 const fund=fundamental.kind==='fund',nav=stock.nav,premium=fund?etfPremium({...stock.quote,currency:report.currency},nav,{region}):null;
 const primary=fundamental.rows.filter(r=>['eps','revenue','operatingMargin','margin','freeCashFlow'].includes(r.key)),other=fundamental.rows.filter(r=>!primary.includes(r));
 return <section className="price-research panel" aria-label="價格合理性評估" aria-busy={busy}>
  <div className="price-research-heading"><div><h2>{fund?premium.available?`ETF 市價${premium.position==='par'?'貼近':premium.position==='premium'?'高於':'低於'}淨值`:'ETF：等待同日淨值與價格':busy?'已保存資料的初步評估':report.title}</h2><p>{region}:{stock.code} · {report.date||'行情日期待確認'} · {report.currency}</p></div><span className={'assessment-state '+((fund?premium.available:report.available)&&!busy?'assessment-available':'')}><ShieldCheck size={13}/>{busy?'更新中':fund?premium.available?'同日折溢價可驗算':'淨值／行情待對齊':report.available?'歷史模型可驗算':'資料待補齊'}</span></div>
  {busy&&<p className="notice" role="status">正在查詢，先顯示已保存快照的評估。</p>}
  <p className="price-research-conclusion">{fund?premium.available?`${stock.quote?.kind==='live-snapshot'?'最新成交':'收盤'} ${format(premium.price)}、每單位淨值 ${format(premium.nav,4)} ${premium.currency}，${premium.label} ${format(Math.abs(premium.value),2)}%。這是相對基金資產淨值的位置，不是公司獲利估值。` :premium.reason+' 價格與正式淨值分別保留原日期，不以公司 EPS 補值。':report.conclusion}</p>
  <div className="assessment-grid">
   <article aria-label="價格估值摘要">{fund?<><h3>{term('折溢價')}</h3><div className="assessment-range"><div><small>正式每單位淨值</small><strong>{nav?.available?format(nav.value,4):'—'}</strong></div><div><small>同日折溢價</small><strong>{premium.available?(premium.value>0?'+':'')+format(premium.value)+'%':'—'}</strong></div></div><p>淨值日 {nav?.date||'尚未提供'} · {nav?.currency||'幣別待確認'}</p><p>{premium.available?'（收盤價 ÷ 正式淨值 − 1）× 100%':premium.reason}</p><Source url={nav?.source}>官方每日淨值來源</Source></>:<><h3>{report.available?'歷史估值區間':'暫無適用估值'}</h3>
    {report.available?<><div className="assessment-range">{[['P25 下緣',report.low],['P50 中位數',report.median],['P75 上緣',report.high]].map(([label,n])=><div key={label}><small>{label}</small><strong>{format(n)}</strong></div>)}</div><p>{report.currency}／股 · 現價相對下緣 {format(report.percentToLow)}%，相對上緣 {format(report.percentToHigh)}%。</p><details><summary>查看倍數與樣本</summary><p className="analysis-formula">EPS {format(report.ttm)} × {format(valuation.p25,4)}／{format(valuation.p50,4)}／{format(valuation.p75,4)} 倍<br/>{valuation.validSamples.length} 筆 · {valuation.validSamples[0]?.date} ～ {valuation.validSamples.at(-1)?.date}</p></details></>:<><ul className="assessment-gaps">{report.reasons.slice(0,2).map(r=><li key={r}>{r}</li>)}</ul>{report.reasons.length>2&&<details><summary>其餘估值缺口（{report.reasons.length-2} 項）</summary><ul className="assessment-gaps">{report.reasons.slice(2).map(r=><li key={r}>{r}</li>)}</ul></details>}</>}
    {peer.available&&<details className="assessment-peer"><summary>同業倍數比較</summary><p>{peer.date} 官方本益比 {format(peer.pe)} 倍；{peer.count} 家同市場、同產業、同參考期 {peer.financialPeriod} 公司，P25～P75 為 {format(peer.p25)}～{format(peer.p75)} 倍，中位數 {format(peer.median)}。</p>{!peer.quoteAligned&&<p className="notice">估值日與行情日不同，僅供該日比較。</p>}<p>排除自身與負倍數；同業價格不直接當成本股合理價。</p><Source url={peer.source}>官方倍數來源</Source></details>}
   </>}</article>
   <article aria-label="基本面評估摘要">{fund?<><h3>ETF 專用觀察</h3><p>以基金持有資產的每單位淨值為基準，搭配折溢價、費用、流動性與追蹤差異；不使用公司近四季或前瞻本益比。</p><p>溢價表示市價高於淨值；折價也不代表一定值得買，海外市場交易時差與匯率會影響淨值比較。</p></>:<><h3>{fundamental.title}</h3><div className="assessment-facts">{primary.map(row=><Fact key={row.key} row={row}/>)}</div>
    {fundamental.risks.length>0&&<p className="assessment-risk">{fundamental.risks[0]}</p>}
    {(other.length>0||fundamental.gaps.length>0||fundamental.risks.length>1)&&<details><summary>其他指標與待確認項目</summary><div className="assessment-facts">{other.map(row=><Fact key={row.key} row={row}/>)}</div><ul className="assessment-gaps">{[...fundamental.risks.slice(1),...fundamental.gaps].map(r=><li key={r}>{r}</li>)}</ul></details>}
   </>}</article>
   <article aria-label="技術面評估摘要"><h3>{technical.title}</h3>{technical.available?<>
    <div className="table-scroll"><table className="assessment-ma-table"><thead><tr><th>日均線</th><th>數值</th><th>現價乖離</th><th>方向</th></tr></thead><tbody>{technical.metrics.map(m=><tr key={m.period}><th>MA{m.period}</th><td>{format(m.value)}</td><td>{format(m.bias)}{m.complete?'%':''}</td><td>{m.slope===null?'—':m.slope>0?<span className="ma-direction rising"><ArrowUpRight size={14}/>上揚</span>:m.slope<0?<span className="ma-direction falling"><ArrowDownRight size={14}/>下彎</span>:<span className="ma-direction"><Minus size={12}/>走平</span>}</td></tr>)}</tbody></table></div>
    <div className="volume-ratio"><span>相對前 20 日均量</span><strong>{technical.volumeRatio===null?'—':format(technical.volumeRatio)+' 倍'}</strong></div>{technical.reason&&<p className="subtle">{technical.reason}</p>}
    <details><summary>展開技術面計算</summary>{technical.metrics.filter(m=>m.complete).map(m=><div key={m.period}><h4>MA{m.period}</h4><p className="analysis-formula">{m.rows[0]?.date} ～ {m.rows.at(-1)?.date}<br/>{m.rows.map(r=>format(r.close)).join(' ＋ ')}<br/>合計 {format(m.rows.reduce((sum,r)=>sum+r.close,0))} ÷ {m.period} ＝ {format(m.value,6)}<br/>乖離＝({format(report.price)} ÷ {format(m.value,6)} − 1) × 100% ＝ {format(m.bias,4)}%<br/>較前日差 {format(m.slope,6)} {report.currency}</p></div>)}{technical.volumeRatio!==null&&<p className="analysis-formula">{technical.volumeDays[0].date} ～ {technical.volumeDays.at(-1).date}<br/>當日量 {format(technical.volume,0)} ÷ 前 20 日均量 {format(technical.volumeBase,2)} ＝ {format(technical.volumeRatio,4)} 倍</p>}</details>
   </>:<ul className="assessment-gaps">{technical.reasons.map(r=><li key={r}>{r}</li>)}</ul>}
    <Source url={history?.sources?.at(-1)?.url||stock.sources?.quotes||stock.quote?.sourceURL}>日線／行情來源</Source>
   </article>
  </div>
  <details className="assessment-method"><summary>這份價格評估如何產生？</summary><p>{report.context}</p><ol><li>{fund?'ETF 採同日、同幣別收盤與正式淨值計算折溢價；不把盤中預估淨值當作正式淨值。':<>歷史估值採連續四季稀釋 {term('EPS')} 與至少 24 筆當時已公開財報的月末樣本。</>}</li><li>{fund?'折溢價與技術面分開閱讀，均線不改寫基金淨值。':'基本面分開閱讀單季與累計值；均線僅描述趨勢，不改寫估值區間。'}</li><li>摘要由已核實數據產生，不提供虛構分數、預測勝率或保證報酬。</li></ol></details>
 </section>;
}
