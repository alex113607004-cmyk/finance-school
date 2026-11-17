import {aggregateCandles,quantile,validCandle,scenario} from './stock-analysis.js';
import {usTrailingEPS} from './sec-financials.js';
import {alignEPSForSplits,quoteStatus,marketDate} from './security.js';
export function analyzeUSValuation(stock,{now=new Date(),minSamples=24}={}){
 const quote=stock?.quote,history=stock?.history||{},financials=stock?.financials;
 const base={available:false,title:'暫無適用估值',reasons:[],samples:[],validSamples:[],excluded:[],ttm:stock?.snapshot?.ttm||null};
 if(stock?.securityKind==='etf')return {...base,reasons:['ETF 使用淨值及折溢價，不套用公司 EPS 本益比法。']};
 const status=quoteStatus(quote,{now,region:'US'}),reasons=[];
 if(!status.usable)reasons.push(status.reason||'尚無可用行情。');
 if(!financials)reasons.push('尚無可追溯歷史文件版本的 EPS。');
 if(quote?.currency&&quote.currency!=='USD')reasons.push('行情與 SEC EPS 幣別不同。');
 if(!history.corporateActionsVerified)reasons.push('價格與 EPS 的分割／股數基準尚未核實。');
 if(history.adjustment&&history.adjustment!=='unadjusted')reasons.push('估值須使用實際未還原價格；含股利調整價格不與 EPS 混算。');
 if(history.partial||history.rows?.some(r=>!validCandle(r))||new Set((history.rows||[]).map(r=>r.date)).size!==(history.rows||[]).length)reasons.push('歷史行情缺漏、重複日期或 OHLCV 無效。');
 const asOf=quote?.date||marketDate(now,'US'),ttm=financials?usTrailingEPS(financials,asOf):stock?.snapshot?.ttm;
 if(ttm?.latest&&Date.parse(asOf)-Date.parse(ttm.latest.periodEnd)>200*86400000)reasons.push('財報期間距行情已逾 200 日，需核實較新季報。');
 if(!ttm?.available)reasons.push(ttm?.reason||'連續四季 EPS 尚未核實。');else if(ttm.eps<=0)reasons.push('近四季 EPS 為零或負值，本益比法不適用。');
 const months=aggregateCandles(history.rows||[],'month',{asOf,coverageStart:history.coverageStart}),complete=new Set(history.completeMonths||[]);
 const samples=months.filter(m=>m.end<asOf&&complete.has(m.start.slice(0,7))).map(m=>{
  const raw=financials?usTrailingEPS(financials,m.date):null,eps=raw&&alignEPSForSplits({...raw,end:raw.latest?.periodEnd},m.date,history.corporateActions||[],history.epsShareBases||[]);
  const reason=!eps?.available?eps?.reason||'當時 EPS 不足':eps.eps<=0?'當時 EPS 非正值':null;
  return {date:m.date,close:m.close,eps:eps?.eps??null,pe:reason?null:m.close/eps.eps,reason,reports:raw?.reports||[],source:m.source};
 });
 const valid=samples.filter(s=>Number.isFinite(s.pe)&&s.pe>0);
 if(valid.length<minSamples)reasons.push(`有效月末樣本 ${valid.length} 筆，至少需要 ${minSamples} 筆。`);
 const common={...base,reasons:[...new Set(reasons)],samples,validSamples:valid,excluded:samples.filter(s=>s.reason),ttm};
 if(reasons.length)return common;
 const aligned=alignEPSForSplits({...ttm,end:ttm.latest?.periodEnd},asOf,history.corporateActions||[],history.epsShareBases||[]);
 if(!aligned.available)return {...common,reasons:[aligned.reason]};
 const p25=quantile(valid.map(s=>s.pe),.25),p50=quantile(valid.map(s=>s.pe),.5),p75=quantile(valid.map(s=>s.pe),.75),low=aligned.eps*p25,high=aligned.eps*p75,price=quote.price??quote.close,position=price<low?'below':price>high?'above':'within';
 return {...common,available:true,p25,p50,p75,low,median:aligned.eps*p50,high,position,title:{below:'低於歷史估值區間',within:'位於歷史估值區間',above:'高於歷史估值區間'}[position],ttm:aligned,pe:price/aligned.eps};
}
export {scenario};
