// Current observations only: the MOPS comparison service has no filing date.
// This module intentionally does not export EPS or historical valuation inputs.
export function cashflowView(stock,now=new Date()){
 const r=stock?.fundamentals?.cashflow,p=stock?.fundamentals?.earnings?.period;
 const missing=reason=>({available:false,reason,amount:null,capex:null,freeCashFlow:null});
 if(!r)return missing(stock?.fundamentals?.cashflowStatus?.status==='failed'?`本次官方查詢失敗：${stock.fundamentals.cashflowStatus.reason}。尚無可沿用數值。`:'尚未取得此公司的合併現金流；排程將逐批補齊。');
 if(r.schemaVersion!==1||r.market!==stock.market||r.code!==stock.code)return missing('現金流與股票的市場或代號不符。');
 if(r.scope!=='consolidated'||r.basis!=='year-to-date'||r.currency!=='TWD'||r.unit!=='新台幣千元')return missing('現金流的合併範圍、幣別或累計口徑未核實。');
 if(!p||r.periodEnd!==p.end||r.periodStart!==`${p.year}-01-01`)return missing('現金流與目前損益表期間不一致，保留缺口。');
 const age=(now-Date.parse(r.periodEnd))/86400000,check=Date.parse(r.checkedAt);
 if(!Number.isFinite(age)||age<0||age>200||!Number.isFinite(check)||check>now.getTime()+300000)return missing('財報期間過舊、在未來，或查核日期無效。');
 let url;try{url=new URL(r.source);}catch{return missing('原始來源網址未提供。');}
 if(url.origin!=='https://mopsfin.twse.com.tw'||url.pathname!=='/compare/report'||!url.searchParams.getAll('companyId').includes(stock.code)||url.searchParams.get('ys')!==`${p.year}${p.quarter}`)return missing('原始來源的公司或財報期間不符。');
 const amount=Number.isFinite(r.amount)?r.amount:null,capex=Number.isFinite(r.capex)&&r.capex>=0?r.capex:null;
 const fcf=amount!==null&&capex!==null&&Number.isFinite(r.freeCashFlow)&&Math.abs(r.freeCashFlow-(amount-capex))<.001?r.freeCashFlow:null;
 return {...r,amount,capex,freeCashFlow:fcf,available:amount!==null||capex!==null,retained:stock.fundamentals.cashflowStatus?.status==='retained',checkOverdue:now-check>8*86400000,announcementKnown:false,reason:null};
}
