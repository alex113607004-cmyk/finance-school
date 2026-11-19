import {quoteStatus,marketDate} from './security.js';
import {approvedCitation} from './institutional-forecasts.js';
export const isFund=stock=>['etf','etn','reit'].includes(stock?.securityKind);
const dateOK=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
export function forwardPE(stock,{estimate=stock?.forwardEPS,region=stock?.region||'TW',now=new Date()}={}){
 const quote=stock?.quote||{},price=quote.price??quote.close,currency=quote.currency||stock?.currency||(region==='TW'?'TWD':'USD'),reasons=[];
 if(isFund(stock))return {available:false,inapplicable:true,reasons:['ETF／基金改以淨值與折溢價評估，不套公司前瞻本益比。']};
 if(!estimate)return {available:false,reasons:['尚無可核實、可公開展示的預估 EPS；不以已公告近四季 EPS 冒充預估值。']};
 const today=marketDate(now,region),observed=quote.date||today;
 const citation=approvedCitation(estimate);
 if(estimate.id!==region+':'+stock.code)reasons.push('預估 EPS 的市場／股票識別不符。');
 if(!estimate.verified||!estimate.license?.publicDisplayAllowed&&!citation||!/^https:\/\//.test(estimate.source||'')||!estimate.provider)reasons.push('預估 EPS 原始來源、核實狀態或引用方式未確認。');
 if(estimate.sourceReviewRequired)reasons.push('來源內容已變更，需重新核對預估數值。');
 if(estimate.publishedAt&&(!Number.isFinite(Date.parse(estimate.publishedAt))||Date.parse(estimate.publishedAt)>now.getTime()))reasons.push('預估報導尚未發布或發布時間無效。');
 if(!dateOK(estimate.asOf)||estimate.asOf>today||(Date.parse(today)-Date.parse(estimate.asOf))/86400000>120)reasons.push('預估報導發布日在未來、過舊或尚未核實。');
 const days=(Date.parse(estimate.periodEnd)-Date.parse(estimate.periodStart))/86400000;
 if(!['FY','NTM'].includes(estimate.horizon)||!dateOK(estimate.periodStart)||!dateOK(estimate.periodEnd)||days<300||days>380||estimate.periodEnd<=today)reasons.push('尚缺涵蓋一年且尚未結束的預估期間；季度 EPS 不當作年度 EPS。');
 if(!Number.isFinite(estimate.eps)||estimate.eps<=0)reasons.push('預估 EPS 為零、負值或未提供，前瞻本益比不適用。');
 if(currency!==estimate.currency||estimate.basis!=='diluted'&&!(citation&&estimate.basis==='reported-unspecified'&&estimate.basisNote)||!estimate.shareBasisVerified||estimate.priceAdjustment!=='unadjusted')reasons.push('價格與預估 EPS 的幣別、EPS口徑或分割股數基準尚未對齊。');
 if(!dateOK(estimate.shareBasisDate)||estimate.shareBasisDate>today||(stock.history?.corporateActions||[]).some(a=>a.type==='split'&&a.date>estimate.shareBasisDate&&a.date<=observed))reasons.push('預估 EPS 的股數基準日期未核實或尚未涵蓋分割事件。');
 const dataAvailable=!reasons.length;
 if(estimate.asOf>observed)reasons.push(`預估報導日 ${estimate.asOf} 晚於股價日 ${observed}，暫停將新預估套用舊價格；仍可查閱預估原始資料。`);
 if(estimate.shareBasisDate>observed)reasons.push('預估 EPS 股數基準日期晚於股價日，等待價格日期對齊。');
 if(!quoteStatus(quote,{region,now}).usable)reasons.push('行情暫不可用或已過期。');
 return {available:!reasons.length,dataAvailable,reasons,price,currency,estimate,citation,value:reasons.length?null:price/estimate.eps};
}
export function forwardScenario(stock,input,{region=stock?.region||'TW',now=new Date()}={}){
 if(isFund(stock))return {available:false,reason:'ETF 不套前瞻本益比。'};
 if(String(input).trim()==='')return {available:false,reason:'輸入你假設的未來 12 個月稀釋 EPS，試算前瞻本益比。'};
 const eps=Number(input);if(!Number.isFinite(eps)||eps<=0)return {available:false,reason:'預估 EPS 為零、負值或無效，前瞻本益比不適用。'};
 if(!quoteStatus(stock.quote,{region,now}).usable)return {available:false,reason:'尚無有效行情，暫無法以現價試算。'};
 const price=stock.quote.price??stock.quote.close;return {available:true,value:price/eps,price,eps};
}
