// All calculations use unadjusted TWD ordinary-share prices and first-release diluted EPS.
export const ANALYSIS_MAS=[5,20,60];
const finite=Number.isFinite;
const iso=d=>d.toISOString().slice(0,10);
export const taipeiDay=(now=new Date())=>iso(new Date(new Date(now).getTime()+8*3600000));
export const quarterId=r=>r.year*4+r.quarter;
export function quantile(values,p){
  if(!values.length||values.some(v=>!finite(v)))return null;
  const a=[...values].sort((x,y)=>x-y),i=(a.length-1)*p,l=Math.floor(i);
  return a[l]+(a[Math.ceil(i)]-a[l])*(i-l);
}
export function validCandle(r){return /^\d{4}-\d{2}-\d{2}$/.test(r?.date)&&[r.open,r.high,r.low,r.close].every(n=>finite(n)&&n>0)&&finite(r.volume)&&r.volume>=0&&r.high>=Math.max(r.open,r.close)&&r.low<=Math.min(r.open,r.close)&&r.high>=r.low;}
export function dailyAverages(rows,{partial=false}={}){
  // Never bridge a broken/missing monthly source by silently dropping it.
  const invalid=partial||rows.some(r=>!validCandle(r))||new Set(rows.map(r=>r.date)).size!==rows.length;
  return [...rows].filter(validCandle).sort((a,b)=>a.date.localeCompare(b.date)).map((r,i,all)=>({...r,...Object.fromEntries(ANALYSIS_MAS.map(n=>['ma'+n,!invalid&&i>=n-1?all.slice(i-n+1,i+1).reduce((s,x)=>s+x.close,0)/n:null]))}));
}
export function calendarPeriod(date,kind){
  const d=new Date(date+'T00:00:00Z');
  if(kind==='month')return {start:date.slice(0,7)+'-01',end:iso(new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)))};
  if(kind==='week'){
    const start=new Date(d);start.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);
    const end=new Date(start);end.setUTCDate(start.getUTCDate()+6);return {start:iso(start),end:iso(end)};
  }
  return {start:date,end:date};
}
export function aggregateCandles(rows,kind,{asOf=taipeiDay(),coverageStart=rows[0]?.date,partial=false}={}){
  if(kind==='day')return dailyAverages(rows,{partial}).map(r=>({...r,start:r.date,end:r.date,count:1,unfinished:false}));
  const groups=new Map();
  for(const r of [...rows].filter(validCandle).sort((a,b)=>a.date.localeCompare(b.date))){
    const p=calendarPeriod(r.date,kind),old=groups.get(p.start);
    if(old){old.high=Math.max(old.high,r.high);old.low=Math.min(old.low,r.low);old.close=r.close;old.volume+=r.volume;old.date=r.date;old.count++;}
    else groups.set(p.start,{...r,...p,count:1,unfinished:p.end>=asOf,truncated:coverageStart>p.start});
  }
  return [...groups.values()];
}
export function trailingEPS(reports,asOf){
  const available=(reports||[]).filter(r=>r.availableFrom<=asOf&&r.verified&&r.epsBasis==='單季稀釋 EPS／合併／新台幣元／普通股').sort((a,b)=>quarterId(a)-quarterId(b));
  const four=available.slice(-4);
  if(four.length!==4||four.some((r,i)=>!finite(r.eps)||(i>0&&quarterId(r)!==quarterId(four[i-1])+1)))return {available:false,reason:'當時已公告的連續四季稀釋 EPS 不足或口徑未確認。',reports:four};
  // Sum cents to avoid accumulating floating-point cents. Never sum YTD EPS.
  return {available:true,eps:four.reduce((s,r)=>s+Math.round(r.eps*100),0)/100,reports:four,latest:four.at(-1)};
}
export function historicalSamples(history,filings,asOf){
  const months=aggregateCandles(history?.rows||[],'month',{asOf,coverageStart:filings?.coverageStart});
  const complete=new Set((history?.completeMonths||[]));
  return months.filter(m=>m.end<asOf&&complete.has(m.start.slice(0,7))).map(m=>{
    const ttm=trailingEPS(filings?.reports,m.date);
    const reason=!ttm.available?ttm.reason:ttm.eps<=0?'當時近四季 EPS 非正值。':null;
    return {date:m.date,close:m.close,source:m.source,eps:ttm.eps??null,reports:ttm.reports,pe:reason?null:m.close/ttm.eps,reason};
  });
}
export function historicalValuation({quote,history,filings,expectedPeriod,now=new Date(),minSamples=24}){
  const asOf=quote?.date,base={available:false,title:'暫無適用估值',reasons:[],samples:[],validSamples:[],ttm:null};
  if(!asOf||!finite(quote.close)||quote.close<=0)return {...base,reasons:['尚無有效盤後收盤價。']};
  const ttm=trailingEPS(filings?.reports,asOf),samples=historicalSamples(history,filings,asOf),valid=samples.filter(s=>finite(s.pe)&&s.pe>0);
  const reasons=[];
  // Quarterly first-release facts do not expire every few days. A later full quarter
  // cannot be reported before it ends. Once one has ended, a failed/stale check can
  // no longer establish that our latest quarter is still current: fail closed then.
  const currentDay=taipeiDay(now),currentQuarter={year:Number(currentDay.slice(0,4)),quarter:Math.floor((Number(currentDay.slice(5,7))-1)/3)+1};
  const newerQuarterEnded=ttm.latest&&quarterId(currentQuarter)>quarterId(ttm.latest)+1;
  if(!filings?.basisConfirmed||filings?.reviewRequired)reasons.push('財報版本或普通股每股口徑尚待確認。');
  if(!filings?.checkedAt||!finite(Date.parse(filings.checkedAt)))reasons.push('公司公告查核時間未確認。');
  if(newerQuarterEnded&&filings?.warnings?.some(s=>s.startsWith('公司公告更新失敗')))reasons.push('下一季已結束且公司公告查核失敗，暫不能確認最新已公告財報。');
  if(!ttm.available)reasons.push(ttm.reason);else if(ttm.eps<=0)reasons.push('近四季 EPS 為零或負值，本益比法不適用。');
  if(expectedPeriod&&ttm.latest&&quarterId(expectedPeriod)>quarterId(ttm.latest))reasons.push('官方資料已有更新季報，尚未核實該季首次公告 EPS。');
  if(ttm.latest&&Number(new Date(asOf)-new Date(ttm.latest.periodEnd))/86400000>200)reasons.push('財報涵蓋期間過舊，請確認有無新公告。');
  if(newerQuarterEnded&&filings?.checkedAt&&Number(new Date(now)-new Date(filings.checkedAt))/86400000>8)reasons.push('下一季已結束且公司公告逾 8 日未成功查核，不能確認是否仍為最新版本。');
  if(history?.partial||history?.rows?.some(r=>!validCandle(r))||new Set(history?.rows?.map(r=>r.date)).size!==(history?.rows?.length||0))reasons.push('行情月份缺漏、重複日期或 K 線欄位無效，停止估值與均線判讀。');
  if(Number(new Date(taipeiDay(now))-new Date(asOf))/86400000>10)reasons.push('盤後行情距今逾 10 日，請更新後再分析現價。');
  if(valid.length<minSamples)reasons.push(`有效月末樣本 ${valid.length} 筆，至少需要 ${minSamples} 筆。`);
  const common={...base,ttm,samples,validSamples:valid,reasons};
  if(reasons.length)return common;
  const p25=quantile(valid.map(s=>s.pe),.25),p50=quantile(valid.map(s=>s.pe),.5),p75=quantile(valid.map(s=>s.pe),.75),low=ttm.eps*p25,high=ttm.eps*p75;
  const position=quote.close<low?'below':quote.close>high?'above':'within';
  return {...common,available:true,p25,p50,p75,low,high,pe:quote.close/ttm.eps,position,title:{below:'低於歷史估值區間',within:'位於歷史估值區間',above:'高於歷史估值區間'}[position]};
}
export function maPosition(quote,history){
  if(history?.partial)return {available:false,text:'月份資料缺漏，暫不判讀 20 日均線。'};
  const rows=dailyAverages(history?.rows||[]),last=rows.at(-1);
  if(!last||last.date!==quote?.date||last.close!==quote.close||!finite(last.ma20))return {available:false,text:'同日行情不足 20 筆或價格日期不一致，暫不判讀。'};
  const distance=(quote.close/last.ma20-1)*100;
  return {available:true,average:last.ma20,distance,position:distance>0?'above':distance<0?'below':'equal',rows:rows.slice(-20),sum:rows.slice(-20).reduce((s,r)=>s+r.close,0)};
}
export function scenario(eps,lowPE,highPE){
  const values=[eps,lowPE,highPE].map(v=>typeof v==='string'&&v.trim()===''?NaN:Number(v));
  if(!finite(values[0]))return {available:false,reason:'請完整輸入有限數值。'};
  if(values[0]<=0)return {available:false,reason:'EPS 為零或負值，本益比法不適用，暫無適用估值。'};
  if(!values.every(finite))return {available:false,reason:'請完整輸入有限數值。'};
  if(values[1]<=0||values[2]<=0||values[1]>values[2])return {available:false,reason:'倍數須為正值，下限不可大於上限。'};
  const low=values[0]*values[1],high=values[0]*values[2];
  return finite(low)&&finite(high)?{available:true,low,high}:{available:false,reason:'數字超出可計算範圍。'};
}
