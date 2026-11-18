import React,{useMemo} from 'react';
import {assessPrice} from '../price-assessment';
import {format} from '../domain';
import '../price-assessment.css';
const Source=({url,children})=>url?<a className="text-link" href={url} target="_blank" rel="noopener noreferrer">{children} ↗</a>:null;
export default function PriceResearchSummary({stock,history,valuation,snapshot,region='TW',busy=false,term=t=>t}){
 const report=useMemo(()=>assessPrice({stock,history,valuation,snapshot,region}),[stock,history,valuation,snapshot,region]);
 const {technical,fundamental,peer}=report;
 return <section className="price-research panel" aria-label="價格合理性評估" aria-busy={busy}>
  <div className="price-research-heading"><div><span className="eyebrow">PRICE RESEARCH / 基本面 × 技術面 × 估值</span><h2>{busy?'已保存資料的初步評估':report.title}</h2><p>{stock.nameZh||stock.name} · {region}:{stock.code} · 行情日 {report.date||'尚未取得'} · {report.currency}</p></div><span className={'assessment-state '+(report.available&&!busy?'assessment-available':'')}>{busy?'正在查核更新':report.available?'歷史模型可驗算':'估值仍有缺口'}</span></div>
  {busy&&<p className="notice" role="status">正在查詢最新資料。下列先依已保存快照整理，日期與來源以各欄標示為準；查詢完成後會重新計算。</p>}
  <p className="price-research-conclusion">{report.conclusion}</p><p>{report.context}</p>
  <div className="assessment-grid">
   <article aria-label="價格估值摘要"><span className="mini-label">01 / 價格估值</span><h3>{report.available?'歷史倍數支持的參考區間':'缺少足夠資料，暫不給合理價'}</h3>
    {report.available?<><div className="assessment-range"><div><small>P25 下緣</small><strong>{format(report.low)}</strong></div><div><small>P50 中位數</small><strong>{format(report.median)}</strong></div><div><small>P75 上緣</small><strong>{format(report.high)}</strong></div></div><p>{report.currency}／股。現價相對下緣 {format(report.percentToLow)}%，相對上緣 {format(report.percentToHigh)}%；這是相對距離，沒有預測未來報酬。</p><p className="analysis-formula">EPS {format(report.ttm)} × {format(valuation.p25,4)}／{format(valuation.p50,4)}／{format(valuation.p75,4)} 倍<br/>有效月末樣本 {valuation.validSamples.length} 筆 · {valuation.validSamples[0]?.date} ～ {valuation.validSamples.at(-1)?.date}</p></>:<ul className="assessment-gaps">{report.reasons.map(r=><li key={r}>{r}</li>)}</ul>}
    {peer.available&&<details className="assessment-peer"><summary>補充：同業倍數位置（不換算合理價）</summary><p>官方估值日 {peer.date}，本益比 {format(peer.pe)} 倍，相對 {peer.count} 家同市場、同產業、同參考財報期 {peer.financialPeriod} 的正倍數公司，{peer.position==='below'?'低於':peer.position==='above'?'高於':'位於'} P25～P75 中段 {format(peer.p25)}～{format(peer.p75)} 倍（中位數 {format(peer.median)}）。</p>{!peer.quoteAligned&&<p className="notice">官方估值日與目前行情日不同，僅說明該日倍數分布，不當作今天的價格評等。</p>}<p>同業樣本排除自身與負倍數公司，可能存在選擇偏誤；成長與風險不同也會影響定價。本頁不從官方倍數倒推 EPS。</p><Source url={peer.source}>官方倍數來源</Source></details>}
    <p className="subtle">歷史區間不等於內在價值。技術面強弱不會改寫 EPS 或估值倍數。</p>
   </article>
   <article aria-label="基本面評估摘要"><span className="mini-label">02 / 基本面</span><h3>{fundamental.title}</h3><div className="assessment-facts">{fundamental.rows.map(row=><div key={row.key} className={row.caution?'assessment-caution':''}><span>{row.label}</span><strong>{row.available?row.text:'尚未核實'}</strong><small>{row.available?row.period:row.reason}</small>{row.available&&<div className="assessment-fact-sources">{row.sources.map((url,i)=><Source key={url} url={url}>來源 {i+1}</Source>)}</div>}</div>)}</div>
    {fundamental.risks.length>0&&<ul className="assessment-gaps">{fundamental.risks.map(r=><li key={r}>{r}</li>)}</ul>}
    {fundamental.gaps.length>0&&<details><summary>查看基本面缺口（{fundamental.gaps.length} 項）</summary><ul className="assessment-gaps">{fundamental.gaps.map(r=><li key={r}>{r}</li>)}</ul></details>}
    <p className="subtle">不同期間的數字分開閱讀。正營收成長不保證獲利品質，自由現金流減少也可能來自設備投資；需回原始財報核對。</p>
   </article>
   <article aria-label="技術面評估摘要"><span className="mini-label">03 / 技術面</span><h3>{technical.title}</h3>{technical.available?<>
    <p>資料日 {technical.date} · {technical.count} 筆日線。使用與 K 線相同口徑的日資料。</p><div className="table-scroll"><table className="assessment-ma-table"><thead><tr><th>日均線</th><th>數值</th><th>現價乖離</th><th>較前日方向</th></tr></thead><tbody>{technical.metrics.map(m=><tr key={m.period}><th>MA{m.period}</th><td>{format(m.value)}</td><td>{format(m.bias)}{m.complete?'%':''}</td><td>{m.slope===null?'資料不足':m.slope>0?'上揚':m.slope<0?'下彎':'走平'}</td></tr>)}</tbody></table></div>
    <p>成交量相對前 20 個交易日均量：{technical.volumeRatio===null?'資料不足':format(technical.volumeRatio)+' 倍'}。量比只描述成交活動，不推測買賣原因。</p>{technical.reason&&<p className="subtle">{technical.reason}</p>}
    <details><summary>展開技術面計算</summary>{technical.metrics.filter(m=>m.complete).map(m=><div key={m.period}><h4>MA{m.period}</h4><p className="analysis-formula">{m.rows[0]?.date} ～ {m.rows.at(-1)?.date}<br/>{m.rows.map(r=>format(r.close)).join(' ＋ ')}<br/>合計 {format(m.rows.reduce((sum,r)=>sum+r.close,0))} ÷ {m.period} ＝ {format(m.value,6)}<br/>乖離＝({format(report.price)} ÷ {format(m.value,6)} − 1) × 100% ＝ {format(m.bias,4)}%<br/>均線較前日差 {format(m.slope,6)} {report.currency}</p></div>)}{technical.volumeRatio!==null&&<p className="analysis-formula">{technical.volumeDays[0].date} ～ {technical.volumeDays.at(-1).date} 的前 20 日均量 {format(technical.volumeBase,2)}<br/>當日量 {format(technical.volume,0)} ÷ 前 20 日均量 ＝ {format(technical.volumeRatio,4)} 倍</p>}</details>
   </>:<ul className="assessment-gaps">{technical.reasons.map(r=><li key={r}>{r}</li>)}</ul>}
    <Source url={history?.sources?.at(-1)?.url||stock.sources?.quotes||stock.quote?.sourceURL}>日線／行情來源</Source><p className="subtle">均線只描述趨勢，不能單獨證明價格便宜，也不是買進訊號。</p>
   </article>
  </div>
  <details className="assessment-method"><summary>這份價格評估如何產生？</summary><ol><li>先確認標的、市場、行情日期與資料口徑，缺漏時停止對應模型。</li><li>歷史估值只使用已核實的連續四季稀釋 {term('EPS')} 與至少 24 個當時已公開財報的月末樣本；同業分布獨立列示。</li><li>基本面整理獲利、營收與現金流的原始數值和警訊，不把累計 EPS 當成近四季。</li><li>技術面以 MA5／20／60、逐日斜率、價格乖離及前 20 日量比描述現況。完整方向至少需要 61 個有效日線。</li><li>摘要由上述計算結果產生，不提供虛構分數、預測勝率或保證報酬。</li></ol></details>
 </section>;
}
