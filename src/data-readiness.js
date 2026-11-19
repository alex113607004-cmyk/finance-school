import {cashflowView} from './tw-cashflow.js';
import {freshness} from './freshness.js';
import {marketDate,quoteStatus} from './security.js';
import {format} from './domain.js';
import {etfPremium} from './etf-nav.js';
const DAY=86400000,finite=Number.isFinite;
export const READINESS_LABELS={ready:'可查閱',partial:'部分待核對',missing:'尚缺資料',stale:'需重新查核',inapplicable:'不適用'};
export function validDataDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&finite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
const safeSource=value=>{try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}};
function row(key,label,{value=null,unit='',period=null,announcedOn=null,checkedAt=null,source=null,reason='',state,asOf,checkedBefore=Date.now()+300000,available=true}={}){
 const known=available&&finite(value),dateOK=validDataDate(period?.end)&&period.end<=asOf&&(!period.start||validDataDate(period.start)&&period.start<=period.end);
 const announced=validDataDate(announcedOn)&&announcedOn<=asOf&&dateOK&&announcedOn>=period.end?announcedOn:null,link=safeSource(source);
 const checkTime=Date.parse(checkedAt),checkOK=finite(checkTime)&&checkTime<=checkedBefore;
 const status=state==='ready'&&(!link||!checkOK)?'partial':state||(known&&dateOK?(announced&&link&&checkOK?'ready':'partial'):'missing');
 return {key,label,value:known?value:null,available:known&&dateOK,unit,period:dateOK?period:null,announcedOn:announced,checkedAt:checkOK?checkedAt:null,source:link,state:status,reason:reason||(!known?'來源尚未提供可核實數值。':!dateOK?'資料期間未確認或在未來。':!announced?'首次公告日未提供；查核日不當成公告日。':!link?'原始來源連結尚待提供。':!checkOK?'成功查核時間尚待核實。':'')};
}
function periodLabel(period){return period?period.start&&period.start!==period.end?`${period.start} ～ ${period.end}`:period.end:'期間尚待確認';}
export function dataReadiness({stock={},history={},valuation={},filings={},snapshot,region='TW',now=new Date(),policy={},coverage,busy=false,refreshWarnings=[]}={}){
 const makeRow=(key,label,options)=>row(key,label,{...options,checkedBefore:now.getTime()+300000});
 const today=marketDate(now,region),currency=region==='US'?'USD':/^\d{5}[CK]$/.test(stock.code)?'未核實':stock.currency||'TWD',fund=['etf','etn','reit'].includes(stock.securityKind),q=stock.quote||{},price=q.price??q.close;
 const dateValid=validDataDate(q.date)&&q.date<=today,age=dateValid?(Date.parse(today)-Date.parse(q.date))/DAY:Infinity,quoteUsable=region==='US'?quoteStatus(q,{now,region}).usable:dateValid&&finite(price)&&price>0&&age<=10;
 const quoteState=!dateValid||!finite(price)||price<=0?'missing':currency==='未核實'?'partial':!quoteUsable?'stale':q.status==='disconnected'||q.status==='connecting'?'partial':'ready';
 const quoteRow=makeRow('quote','行情',{value:price,unit:currency+(fund?'／受益權單位':'／股'),period:{end:q.date},checkedAt:stock.sourceChecks?.quotes||q.checkedAt,source:stock.sources?.quotes||q.sourceURL,state:quoteState,asOf:today,reason:quoteUsable?(region==='TW'?freshness(q.date,now).label:quoteStatus(q,{now,region}).label):q.reason||'行情日期、價格或可用狀態尚待核實。'});
 const f=stock.fundamentals||{},ttm=valuation.ttm||snapshot?.ttm,latest=ttm?.latest||ttm?.reports?.at(-1),expectedEnd=f.earnings?.period?.end;
 const reports=ttm?.reports||[],epsPeriod={start:reports[0]?.periodStart,end:latest?.periodEnd},epsSource=latest?.source||latest?.sourceURL;
 const quarters=reports.map(r=>r.year*4+r.quarter),continuous=quarters.length===4&&quarters.every((id,i)=>Number.isInteger(id)&&[1,2,3,4].includes(reports[i].quarter)&&(i===0||id===quarters[i-1]+1));
 const epsVerified=ttm?.available&&continuous&&Math.abs(reports.reduce((sum,r)=>sum+r.eps,0)-ttm.eps)<.02&&reports.every(r=>finite(r.eps)&&validDataDate(r.periodEnd)&&validDataDate(r.announcedOn)&&r.announcedOn>=r.periodEnd&&r.announcedOn<=today&&safeSource(r.source||r.sourceURL))&&(region==='US'||filings.basisConfirmed&&!filings.reviewRequired);
 const olderEPS=expectedEnd&&epsPeriod.end<expectedEnd,oldReport=validDataDate(epsPeriod.end)&&(Date.parse(today)-Date.parse(epsPeriod.end))/DAY>200;
 const eps=makeRow('eps','近四季稀釋 EPS',{value:ttm?.eps,available:epsVerified,unit:currency+'／股',period:epsPeriod,announcedOn:latest?.announcedOn,checkedAt:filings.checkedAt||stock.sourceChecks?.facts?.checkedAt,source:epsSource,asOf:today,state:epsVerified&&(olderEPS||oldReport)?'stale':undefined,reason:olderEPS?'官方累計財報已有更新季度，近四季 EPS 尚待該季原始公告。':oldReport?'財報涵蓋期間超過 200 日，需確認較新公告。':!epsVerified?'缺少連續四季直接稀釋 EPS、原始文件或可核實公告日。':''});
 const financialRows=[];
 if(!fund){
  financialRows.push(eps);
  if(region==='TW'){
   const month=f.revenue?.month,start=typeof month==='string'&&/^\d{4}-\d{2}$/.test(month)?month+'-01':null,end=validDataDate(start)?new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),0)).toISOString().slice(0,10):null;
   financialRows.push(makeRow('revenue','月營收年增',{value:f.revenue?.yoy,unit:'%',period:{start,end},checkedAt:stock.sourceChecks?.revenue,source:stock.sources?.revenue,asOf:today,reason:'月營收期間為 '+(month||'尚未提供')+'；來源未列首次公告日。',state:validDataDate(end)&&(Date.parse(today)-Date.parse(end))/DAY>75?'stale':undefined}));
  }else{const m=snapshot?.metrics?.revenueYoY;financialRows.push(makeRow('revenue','季度營收年增',{value:m?.value,available:m?.available,unit:'%',period:{start:m?.current?.start||m?.start,end:m?.current?.end||m?.end},announcedOn:m?.current?.filed||m?.filed,checkedAt:stock.sourceChecks?.facts?.checkedAt,source:m?.current?.sources?.[0]?.source||m?.sources?.[0]?.source,asOf:today}));}
  const cash=region==='TW'?cashflowView(stock,now):null;
  for(const [key,label,cashKey]of [['operatingCashFlow','營業現金流','amount'],['capex','現金設備支出','capex'],['freeCashFlow','自由現金流','freeCashFlow']]){
   const m=snapshot?.metrics?.[key];
   if(m){const dates={start:m.start,end:m.end},wrongCurrency=m.currency!==currency;financialRows.push(makeRow(key,label,{value:m.value,available:m.available&&!wrongCurrency,unit:m.currency,period:dates,announcedOn:m.filed,checkedAt:snapshot?.checkedAt||stock.sourceChecks?.facts?.checkedAt,source:m.sources?.[0]?.source||m.source,asOf:today,reason:wrongCurrency?'財報與行情幣別尚未對齊。':''}));}
   else financialRows.push(makeRow(key,label,{value:cash?.[cashKey],available:cash?.available,unit:cash?.unit||'TWD 千元',period:{start:cash?.periodStart,end:cash?.periodEnd},announcedOn:cash?.announcedOn,checkedAt:cash?.checkedAt,source:cash?.source,asOf:today,state:cash?.checkOverdue||cash?.retained?'stale':undefined,reason:cash?.reason||'年初累計合併現金流；來源未列首次公告日，不納入歷史估值。'}));
  }
 }
 const financeAvailable=financialRows.filter(r=>r.available).length,financeReady=financialRows.filter(r=>r.state==='ready').length;
 const financeState=fund?'inapplicable':financeReady===financialRows.length?'ready':financeAvailable?'partial':'missing';
 const modelReasons=[...(valuation.reasons||[])];
 if(fund)modelReasons.unshift('基金應使用同日淨值與折溢價，不套公司本益比法。');
 else if(ttm?.available&&ttm.eps<=0)modelReasons.unshift('EPS 為零或負值，本益比歷史區間不適用。');
 const peAligned=finite(valuation.pe)&&ttm?.eps>0&&Math.abs(valuation.pe-price/ttm.eps)<.000001;
 const inapplicable=fund||ttm?.available&&ttm.eps<=0,modelState=inapplicable?'inapplicable':valuation.available&&quoteUsable&&quoteRow.state==='ready'&&eps.state==='ready'&&peAligned?'ready':'missing';
 if(modelState==='missing'&&!modelReasons.length)modelReasons.push('尚未取得可核實的歷史估值條件與樣本。');
 const pe=modelState==='ready'&&finite(valuation.pe)&&currency!=='未核實'?{value:valuation.pe,date:q.date,eps:ttm.eps,formula:`${format(price)} ÷ ${format(ttm.eps)} ＝ ${format(valuation.pe,4)} 倍`}:null;
 const officialPE=stock.valuation,dateMismatch=finite(officialPE?.pe)&&validDataDate(officialPE.date)&&officialPE.date!==q.date;
 const mismatches=dateMismatch?[`行情日期 ${q.date||'尚未提供'}，官方本益比日期 ${officialPE.date}；兩者不是同日資料。`]:[];
 const metrics=financialRows.map(r=>({...r,periodLabel:periodLabel(r.period)}));
 const latestEnd=metrics.filter(r=>r.available).map(r=>r.period.end).sort().at(-1);
 const feedPaused=validDataDate(coverage?.blockedUntil?.slice(0,10))&&Date.parse(coverage.blockedUntil)>now.getTime();
 const nav=stock.nav,premium=fund?etfPremium({...q,currency},nav,{region,now}):null;
 const navKnown=nav?.available&&finite(nav.value)&&nav.value>0&&validDataDate(nav.date)&&nav.date<=today,navVerified=navKnown&&safeSource(nav.source)&&finite(Date.parse(nav.checkedAt))&&Date.parse(nav.checkedAt)<=now.getTime()+300000;
 const fundGroups=fund?[{key:'quote',label:'行情',state:quoteRow.state,detail:q.date||'尚無合格行情',note:quoteRow.reason},{key:'financials',label:'基金淨值',state:navKnown?navVerified?'ready':'partial':'missing',detail:navKnown?`${format(nav.value,4)} ${nav.currency}／單位`:'正式淨值待補',note:navKnown?`淨值日 ${nav.date}；非盤中預估淨值。`:'尚缺可核實正式每日淨值。'},{key:'model',label:'折溢價',state:premium.available?navVerified?'ready':'partial':'missing',detail:premium.available?(premium.value>0?'+':'')+format(premium.value)+'%':'日期／資料待對齊',note:premium.available?'同日收盤價 ÷ 正式淨值 − 1；不套公司本益比法。':premium.reason}]:null;
 return {region,currency,today,busy,quote:quoteRow,financialRows:metrics,pe,officialPE:finite(officialPE?.pe)?{value:officialPE.pe,date:officialPE.date}:null,mismatches,
  groups:fundGroups||[{key:'quote',label:'行情',state:quoteRow.state,detail:q.date||'尚無合格行情',note:quoteRow.reason},{key:'financials',label:'財報',state:financeState,detail:`${financeAvailable}／${financialRows.length} 項有數值`,note:`最近期間 ${latestEnd||'尚未核實'}；公告日與期間詳列查核表。`},{key:'model',label:'歷史估值',state:modelState,detail:modelState==='ready'?`${valuation.validSamples?.length||0} 筆有效樣本`:inapplicable?'模型不適用':'尚未具備條件',note:[...new Set(modelReasons)].join('；')}],
  modelReasons:fund?(premium.available?[]:[premium.reason]):[...new Set(modelReasons)],refreshWarnings:refreshWarnings.filter(Boolean),coverage,feedPaused,secAutomaticUpdate:region==='US'?policy.secAutomaticUpdate:null};
}
