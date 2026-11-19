import React,{useMemo,useState} from 'react';
import {forwardPE,forwardScenario,isFund} from '../forward-pe';
import {format} from '../domain';
export default function ForwardPE({stock,region='TW',term=t=>t}){
 const [eps,setEPS]=useState(''),result=useMemo(()=>forwardPE(stock,{region}),[stock,region]),hypothesis=forwardScenario(stock,eps,{region});
 if(isFund(stock))return null;
 const currency=stock.quote?.currency||stock.currency||(region==='TW'?'TWD':'USD'),estimate=result.estimate;
 return <section className="panel forward-pe-panel" aria-label="前瞻本益比與預估 EPS">
  <div className="forward-pe-heading"><div><span className="eyebrow">FORWARD P/E</span><h2>{term('前瞻本益比')}</h2><p>以未來獲利預估衡量價格，與已公告近四季本益比分開閱讀。</p></div><div className="forward-pe-number"><strong>{result.available?format(result.value):'—'}</strong><span>{result.available?'倍 · 已核實預估':'預估資料待補'}</span></div></div>
  {result.available?<><p className="analysis-formula">{format(result.price)} ÷ 預估稀釋 EPS {format(estimate.eps)} ＝ {format(result.value,4)} 倍</p><p>{estimate.horizon} · {estimate.periodStart} ～ {estimate.periodEnd} · {estimate.currency}／股 · 預估發布 {estimate.asOf} · {estimate.provider}</p><a className="text-link" href={estimate.source} target="_blank" rel="noopener noreferrer">預估 EPS 原始來源 ↗</a></>:<p className="forward-pe-gap">{result.reasons.join('；')}</p>}
  <details className="forward-pe-scenario"><summary>自行假設未來 EPS，試算前瞻本益比</summary><p>以下是你的假設，並非市場共識或公司財測；假設 EPS 已與現價的幣別及分割股數基準對齊。</p><label>假設未來 12 個月稀釋 EPS（{currency}／股）<input type="number" step="any" value={eps} onChange={e=>setEPS(e.target.value)} placeholder="自行輸入預估 EPS"/></label><output role="status">{hypothesis.available?`使用者假設：${format(hypothesis.price)} ÷ ${format(hypothesis.eps)} ＝ ${format(hypothesis.value,4)} 倍` :hypothesis.reason}</output><small>未來 12 個月自行情資料日 {stock.quote?.date||'待確認'} 起計，不等同所有公司的下一個會計年度。假設結果不改寫歷史估值。</small></details>
 </section>;
}
