import React from 'react';
import {SearchCheck} from 'lucide-react';
import {analyzeFundamentals} from '../fundamentals.js';
import {analyzeTechnicals,combineAnalysis} from '../technicals.js';
import {format} from '../domain.js';

export default function DecisionSummary({data,history,term,now=new Date(),updating=false}){
 const fundamental=analyzeFundamentals(data,now),technical=analyzeTechnicals(history,data,now),report=combineAnalysis(fundamental,technical);
 const effective=updating?{...report,status:'insufficient',title:'正在更新，綜合結論待確認',summary:'先顯示已查核數字；本次官方日線與估值完成後重新判讀。'}:report;
 return <section id="stock-decision" className="decision-summary" aria-label="基本面與均線綜合判讀">
  <div className={'panel investment-verdict verdict-'+effective.status}>
   <div className="verdict-icon"><SearchCheck size={26}/></div>
   <div><span className="mini-label">綜合基本面與均線，現在適合買嗎？</span><h2>{effective.title}</h2><p>{effective.summary}</p>
    <div className="decision-dimensions"><span>基本面：{fundamental.status==='candidate'?'初篩通過':fundamental.status==='watch'?'條件未齊':fundamental.status==='caution'?'有警訊':'資料／方法待補'}</span><span>均線：{technical.title}</span></div>
    <small>評估價格 {format(data?.quote?.close)} 元／股 · 收盤日 {data?.quote?.date||'—'} · 均線日 {technical.date||'—'} · 非盤中報價</small>
   </div>
  </div>
  {!updating&&report.reasons.length>0&&<div className="panel decision-reasons"><h3>判讀依據與待確認條件</h3><ul>{[...new Set(report.reasons)].map(reason=><li key={reason}>{reason}</li>)}</ul></div>}
  <section className="panel" aria-label="六種均線觀察"><h2>短、中、長期均線一起看</h2>
   <p className="subtle">使用最近 {technical.count} 個有效交易日的未還原收盤價，最新日 {technical.date||'—'}。週線採台股常用 MA5，與五日線相同；不是週 K 線，也不額外計分。</p>
   <div className="technical-grid">{technical.metrics.map(metric=><article className="technical-card" key={metric.label}>
    <div>{term(metric.label)}<span style={{color:metric.color}}>MA{metric.period}{metric.alias?' · 同五日線':''}</span></div>
    <strong>{format(metric.value)} <small>元／股</small></strong>
    <p>收盤位置：{metric.above===null?'資料不足':metric.above?'在線上':technical.close===metric.value?'與線相同':'在線下'}</p>
    <p>方向：{metric.slope===null?'需更多交易日':metric.slope>0?'▲ 上揚':metric.slope<0?'▼ 下彎':'持平'}{metric.slope!==null?'（'+format(metric.slope)+' 元／日）':''}</p>
    <p>{term('乖離率')}：<span className={metric.bias>0?'gain':metric.bias<0?'loss':''}>{Number.isFinite(metric.bias)?`${metric.bias>0?'▲ ':metric.bias<0?'▼ ':''}${format(metric.bias)}%`:'—'}</span></p>
   </article>)}</div>
   <details><summary>查看綜合規則、均線公式與限制</summary>
    <ol><li>SMA N＝最近 N 個有效交易日收盤價合計 ÷ N。斜率＝今日均線 − 前一交易日均線；乖離＝(收盤 ÷ 均線 − 1) ×100%。週線＝MA5，月／季／年線＝MA20／60／240。</li>
    <li>候選條件：基本面四項通過；價格高於全部五條獨立均線；均線均上揚，且 MA5 ≥ MA10 ≥ MA20 ≥ MA60 ≥ MA240；月線正乖離不超過 10%。這些是自訂研究條件，尚未回測，並非通用買點。</li>
    <li>五日線／週線只算一次。240 日年線不等於曆年平均；含斜率的年線需至少 241 筆。未滿、月份缺漏、日線與行情不同日、過期或來源更新失敗時，不產生完整候選結論。</li>
    <li>均線採未還原價格，除權息、減資與分割會影響數值。若偵測單日超過 35% 跳變，先停止綜合候選判讀並核對公司行動；較小調整仍可能影響趨勢。均線不是報酬指標或預測勝率。</li>
    <li>本頁未估算目標價、個人適合度及未來報酬；現金流、多年獲利及交易成本仍須另行研究。技術指標不能消除企業、流動性與市場風險。</li></ol>
   </details>
  </section>
 </section>;
}
