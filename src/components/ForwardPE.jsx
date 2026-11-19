import React,{useMemo,useState} from 'react';
import {forwardPE,forwardScenario,isFund} from '../forward-pe';
import {format} from '../domain';
import {useForecasts} from '../ForecastContext';
import {forecastOptions,defaultForecast} from '../institutional-forecasts';
export default function ForwardPE({stock,region='TW',term=t=>t}){
 const [eps,setEPS]=useState(''),[choice,setChoice]=useState(''),{publication,warning,choices,choose}=useForecasts();
 const id=region+':'+stock.code,options=useMemo(()=>forecastOptions(publication,stock,{region}),[publication,stock,region]),selected=options.find(e=>e.key===(choices?.[id]||choice))||stock.forwardEPS||defaultForecast(publication,stock,{region}),result=useMemo(()=>forwardPE(stock,{region,estimate:selected}),[stock,region,selected]),hypothesis=forwardScenario(stock,eps,{region});
 if(isFund(stock))return null;
 const currency=stock.quote?.currency||stock.currency||(region==='TW'?'TWD':'USD'),estimate=result.estimate;
 return <section className="panel forward-pe-panel" aria-label="前瞻本益比與預估 EPS">
  <div className="forward-pe-heading"><div><span className="eyebrow">FORWARD P/E</span><h2>{term('前瞻本益比')}</h2><p>引用具名機構的年度 EPS 預估，以最新可得價格重算倍數。</p></div><div className="forward-pe-number"><strong>{result.available?format(result.value):'—'}</strong><span>{result.available?`倍 · FY${estimate.fiscalYear||estimate.periodEnd.slice(0,4)}`:result.dataAvailable?'行情／日期待對齊':'預估資料待補'}</span></div></div>
  {options.length>0&&<label className="forecast-select">選擇預估來源與年度<select aria-label="預估來源與年度" value={selected?.key||''} onChange={e=>{setChoice(e.target.value);choose?.(id,e.target.value);}}>{options.map(e=><option value={e.key} key={e.key}>FY{e.fiscalYear} · {e.provider} · {e.statistic} · {e.asOf}</option>)}</select></label>}
  {estimate&&<div className="institutional-estimate" role="group" aria-label="機構預估原始資料"><div><span>{estimate.kind==='broker'?'單一法人預估':estimate.kind==='consensus-median'?'機構調查中位數':'機構預估'}</span><strong>{format(estimate.eps)} <small>{estimate.currency}／股</small></strong></div><p>{estimate.provider}{estimate.publisher&&` · ${estimate.publisher}公開報導轉述`}<br/>{estimate.periodStart} ～ {estimate.periodEnd} · {estimate.horizon}<br/>預估報導日 {estimate.asOf}{estimate.analysts?` · 原文該年度調查 ${estimate.analysts} 位分析師`:''}</p><p className="forecast-basis-note">{estimate.basisNote||'預估稀釋 EPS；與已公告 EPS 分開閱讀。'}</p>{region==='TW'&&estimate.publishedAt&&Date.parse(estimate.publishedAt)>Date.parse(estimate.asOf+'T13:30:00+08:00')&&<p className="forecast-basis-note">此報導在當日台股收盤後發布；倍數採報導發布後可得預估搭配最近收盤價。</p>}<a className="text-link" aria-label="預估 EPS 原始來源" href={estimate.source} target="_blank" rel="noopener noreferrer">預估 EPS 原始來源 ↗</a></div>}
  {result.available?<p className="analysis-formula">{format(result.price)} ÷ {estimate.basis==='reported-unspecified'?'報導預估 EPS':'預估稀釋 EPS'} {format(estimate.eps)} ＝ {format(result.value,4)} 倍</p>:<p className="forward-pe-gap">{result.reasons.join('；')}</p>}
  {options.length>0&&<p className="forecast-basis-note">保留公開報導的資料日期，不代表該機構最新全部修訂；不同機構與不同年度不混合平均。</p>}{warning&&<p className="notice">{warning}</p>}
  <details className="forward-pe-scenario"><summary>自行假設未來 EPS，試算前瞻本益比</summary><p>以下是你的假設，並非市場共識或公司財測；假設 EPS 已與現價的幣別及分割股數基準對齊。</p><label>假設未來 12 個月稀釋 EPS（{currency}／股）<input type="number" step="any" value={eps} onChange={e=>setEPS(e.target.value)} placeholder="自行輸入預估 EPS"/></label><output role="status">{hypothesis.available?`使用者假設：${format(hypothesis.price)} ÷ ${format(hypothesis.eps)} ＝ ${format(hypothesis.value,4)} 倍` :hypothesis.reason}</output><small>未來 12 個月自行情資料日 {stock.quote?.date||'待確認'} 起計，不等同所有公司的下一個會計年度。假設結果不改寫歷史估值。</small></details>
 </section>;
}
