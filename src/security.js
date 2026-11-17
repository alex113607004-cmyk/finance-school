export function securityId(region,symbol){return `${region==='US'?'US':'TW'}:${String(symbol).trim().toUpperCase()}`;}
export function parseAnalysisAddress(param,symbol){
 const p=String(param||'');
 if(/^(TW|US)$/i.test(p))return {region:p.toUpperCase(),symbol:symbol||(/us/i.test(p)?'AAPL':'2330')};
 const prefixed=p.match(/^(US|TW):(.+)$/i);if(prefixed)return {region:prefixed[1].toUpperCase(),symbol:prefixed[2].toUpperCase()};
 return {region:'TW',symbol:p||'2330'};
}
export const analysisHref=(region,symbol)=>`#analysis/${region==='US'?'US':'TW'}/${encodeURIComponent(symbol)}`;
export function marketDate(now=new Date(),region='TW'){return new Intl.DateTimeFormat('en-CA',{timeZone:region==='US'?'America/New_York':'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function quoteStatus(quote,{region='US',now=new Date()}={}){
 if(!quote||!Number.isFinite(quote.price??quote.close)||(quote.price??quote.close)<=0)return {status:'unavailable',label:'行情資料暫不可用',usable:false,reason:quote?.reason||'尚未取得可核實行情。'};
 const timestamp=quote.timestamp||quote.timeISO,date=quote.date||timestamp?.slice(0,10),age=date?(Date.parse(marketDate(now,region))-Date.parse(date))/86400000:Infinity;
 if(!Number.isFinite(age)||age<0||age>(region==='US'?5:10)||quote.stale)return {status:'unavailable',label:'行情過期，停止價格估值',usable:false,reason:'行情日期過舊、無效、在未來或已由來源標示過期。'};
 const labels={realtime:'即時',delayed:'延遲',aftermarket:'盤後',disconnected:'連線中斷',connecting:'連線中'};
 const status=quote.status||'aftermarket';
 return {status,label:labels[status]||'行情資料暫不可用',usable:['realtime','delayed','aftermarket'].includes(status),reason:quote.reason||null};
}
export function alignEPSForSplits(eps,observationDate,actions=[],shareBases=[]){
 if(!eps?.available)return eps;
 if(eps.reports?.length){
  const adjusted=[];
  for(const report of eps.reports){
   const basis=shareBases.find(b=>b.accession===report.accession&&b.end===report.periodEnd&&b.verified);
   const through=basis?.basisThrough||report.basisThrough;
   const affected=actions.some(a=>a.type==='split'&&a.date>report.periodEnd&&a.date<=observationDate);
   if(affected&&!through)return {available:false,reason:'財報 EPS 的分割／重編股數基準未逐季核實，避免重複調整。'};
   const aligned=alignEPSForSplits({available:true,eps:report.eps,end:report.periodEnd,basisThrough:through},observationDate,actions);
   if(!aligned.available)return aligned;adjusted.push({...report,eps:aligned.eps});
  }
  return {...eps,reports:adjusted,unadjustedEPS:eps.eps,eps:adjusted.reduce((sum,r)=>sum+r.eps,0),basisThrough:observationDate};
 }
 const through=eps.basisThrough||eps.end;
 const applicable=actions.filter(a=>a.type==='split'&&a.date>through&&a.date<=observationDate);
 if(applicable.some(a=>!Number.isFinite(a.ratio)||a.ratio<=0||!a.verified))return {available:false,reason:'分割事件比例或驗證狀態不明。'};
 const factor=applicable.reduce((s,a)=>s*a.ratio,1);
 return {...eps,unadjustedEPS:eps.eps,eps:eps.eps/factor,splitFactor:factor,basisThrough:observationDate};
}
