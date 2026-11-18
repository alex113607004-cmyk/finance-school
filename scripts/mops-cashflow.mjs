// Official MOPS comparison tables. These are current YTD observations, NOT
// first-release filings. Never feed their retrieval dates into PIT valuation.
import {JSDOM} from 'jsdom';
import crypto from 'node:crypto';
export const MOPS_ORIGIN='https://mopsfin.twse.com.tw';
export const PRIORITY_CODES=['2330','2317','6488','2454','2308','2382','2303','2603','3231','3711'];
export const recordKey=s=>`${s.market}:${s.code}`;
export function reportURL(codes,period){
 const u=new URL('/compare/report',MOPS_ORIGIN);
 u.searchParams.set('compareItem','CashflowStatement');u.searchParams.set('quarter','false');
 for(const code of codes)u.searchParams.append('companyId',code);
 u.searchParams.set('ys',`${period.year}${period.quarter}`);u.searchParams.set('ylabel','仟元');return u.href;
}
const clean=s=>s.replace(/[\s\u3000]/g,'');
function number(text){
 const s=text.trim().replaceAll(',','').replace(/^\((.*)\)$/,'-$1');
 return /^-?\d+(\.\d+)?$/.test(s)&&Number.isFinite(Number(s))?Number(s):null;
}
export function parseCashflow(html,{stocks,period,checkedAt,source}){
 const dom=new JSDOM(html),d=dom.window.document;
 try{
 if(d.querySelector('input[name="yearseason"]')?.value!==`${period.year}Q${period.quarter}`)throw Error('官方回應季度與請求不符');
 if(!/金額單位[：:]新台幣仟元/.test(clean(d.body.textContent)))throw Error('無法核實金額單位');
 const head=[...d.querySelectorAll('#headTable tbody tr')].map(r=>[...r.querySelectorAll('td')].map(c=>clean(c.textContent)));
 const rows=[...d.querySelectorAll('#bodyTable tbody tr')].map(r=>[...r.querySelectorAll('td')].map(c=>c.textContent.trim()));
 const header=[...d.querySelectorAll('#bodyTable thead tr')].map(r=>[...r.querySelectorAll('th')].map(c=>clean(c.textContent)));
 if(!head.length||head.length!==rows.length||header.length!==2||header[0].length!==stocks.length||header[1].length!==stocks.length||rows.some(r=>r.length!==stocks.length))throw Error('官方表格列數或公司欄位不完整');
 const locate=names=>{const ids=head.flatMap((r,i)=>r.length===1&&names.includes(r[0])?[i]:[]);if(ids.length>1)throw Error('重複會計科目');return ids[0];};
 const ocf=locate(['營業活動之淨現金流入（流出）','營業活動之淨現金流入(流出)']);
 const ppe=locate(['取得不動產、廠房及設備']);
 const hash=crypto.createHash('sha256').update(html).digest('hex'),end=new Date(Date.UTC(period.year,period.quarter*3,0)).toISOString().slice(0,10),records=[];
 const seen=new Set();
 for(let col=0;col<stocks.length;col++){
  const title=header[1][col],code=title.match(/^([0-9A-Z]{4,6})(?=[^0-9A-Z]|$)/)?.[1],stock=stocks.find(s=>s.code===code);
  if(!stock||seen.has(code))throw Error('官方回應公司識別不符或重複');seen.add(code);
  if(!title.includes(stock.market==='TWSE'?'(上市':'(上櫃'))throw Error('官方回應與預期上市櫃市場不符');
  if(header[0][col]!=='合併')continue; // Do not mix parent-only statements.
  const amount=ocf===undefined?null:number(rows[ocf][col]),rawCapex=ppe===undefined?null:number(rows[ppe][col]);
  const capex=rawCapex!==null&&rawCapex<=0?-rawCapex:null;
  if(amount===null&&capex===null)continue;
  records.push({schemaVersion:1,market:stock.market,code,periodStart:`${period.year}-01-01`,periodEnd:end,year:period.year,quarter:period.quarter,scope:'consolidated',basis:'year-to-date',currency:'TWD',unit:'新台幣千元',amount,capex,freeCashFlow:amount!==null&&capex!==null?amount-capex:null,rawCapex,announcedOn:null,checkedAt,source,sourceHash:hash,firstObservedAt:checkedAt,pointInTimeEligible:false,notes:['年初至季末累計值，不是單季，也不能與其他累計季度相加。','來源未列首次公告日；擷取日不作為公告日，不納入歷史 EPS 估值。',...(rawCapex>0?['設備取得現金流符號異常，資本支出與自由現金流暫不適用。']:[])]});
 }
 return records;
 }finally{dom.window.close();}
}
export function updateRecord(old,next){
 const samePeriod=old?.market===next.market&&old?.code===next.code&&old?.periodEnd===next.periodEnd;
 const values=r=>JSON.stringify([r.amount,r.rawCapex,r.capex,r.freeCashFlow,r.scope,r.currency]);
 const changed=samePeriod&&values(old)!==values(next);
 return {...next,firstObservedAt:samePeriod?old.firstObservedAt:next.firstObservedAt,revisions:[...(old?.revisions||[]),...(changed?[{observedAt:old.checkedAt,sourceHash:old.sourceHash,periodEnd:old.periodEnd,amount:old.amount,rawCapex:old.rawCapex,freeCashFlow:old.freeCashFlow}]:[])],changedSincePreviousObservation:!!changed};
}
export function markBatchFailure(cache,stocks,error,now=new Date()){
 for(const stock of stocks)cache.attempts[recordKey(stock)]={status:'failed',period:stock.fundamentals.earnings.period.end,at:now.toISOString(),reason:error.message};
 cache.warnings.push(`${stocks.map(s=>s.code).join('、')}：${error.message}；保留前次數值與原查核日期。`);
 if(error.status===403||error.status===429)cache.blockedUntil=new Date(now.getTime()+86400000).toISOString();
}
export function eligibleStocks(stocks,now=new Date()){
 return Object.values(stocks).filter(s=>{
  const p=s.fundamentals?.earnings?.period,age=p?(now-Date.parse(p.end))/86400000:Infinity;
  return ['TWSE','TPEX'].includes(s.market)&&s.securityKind==='stock'&&s.fundamentals?.kind==='company'&&p&&Number.isInteger(p.year)&&[1,2,3,4].includes(p.quarter)&&age>=0&&age<200;
 });
}
export function planBatches(stocks,cache,{now=new Date(),maxBatches=12,batchSize=10,ttlDays=7}={}){
 const due=eligibleStocks(stocks,now).filter(s=>{const r=cache.records[recordKey(s)],attempt=cache.attempts?.[recordKey(s)],target=s.fundamentals.earnings.period;
  if(attempt?.period===target.end&&attempt?.status==='failed'&&now-Date.parse(attempt.at)<86400000)return false;
  return !r||r.periodEnd!==target.end||now-Date.parse(r.checkedAt)>=ttlDays*86400000;
 }).sort((a,b)=>{
  const ar=cache.records[recordKey(a)],br=cache.records[recordKey(b)];
  // Fill missing/new-period companies before revisiting older existing values.
  const missing=s=>!cache.records[recordKey(s)]||cache.records[recordKey(s)].periodEnd!==s.fundamentals.earnings.period.end;
  const priority=s=>{const i=PRIORITY_CODES.indexOf(s.code);return i<0?999:i;};
  return Number(missing(b))-Number(missing(a))||priority(a)-priority(b)||String(ar?.checkedAt||'').localeCompare(br?.checkedAt||'')||a.code.localeCompare(b.code);
 });
 const groups=new Map();for(const s of due){const p=s.fundamentals.earnings.period,k=`${s.market}:${p.year}:${p.quarter}`;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(s);}
 const batches=[];const lists=[...groups.values()];
 // Round robin market/period groups so OTC is not starved by the larger TWSE list.
 for(let i=0;lists.some(list=>i<list.length);i+=batchSize)for(const list of lists)if(i<list.length)batches.push(list.slice(i,i+batchSize));
 return batches.slice(0,maxBatches);
}
export function attachCashflows(universe,cache,now=new Date()){
 const eligible=eligibleStocks(universe.stocks,now);
 let covered=0,complete=0;
 for(const stock of Object.values(universe.stocks)){
  const r=cache.records[recordKey(stock)],period=stock.fundamentals?.earnings?.period;
  const attempt=cache.attempts?.[recordKey(stock)];
  if(attempt?.status==='failed'&&attempt.period===period?.end)stock.fundamentals.cashflowStatus={status:r?.periodEnd===period?.end?'retained':'failed',reason:attempt.reason,attemptedAt:attempt.at};
  if(!r||stock.securityKind!=='stock'||r.market!==stock.market||r.code!==stock.code||r.periodEnd!==period?.end)continue;
  stock.fundamentals.cashflow=r;stock.sources.cashflow=r.source;stock.sourceChecks.cashflow=r.checkedAt;
  stock.fundamentals.cashflowStatus=attempt?.status==='failed'&&attempt.period===period.end?{status:'retained',reason:attempt.reason,attemptedAt:attempt.at}:{status:'verified',checkedAt:r.checkedAt};
  if(eligible.some(s=>s===stock)){covered++;if([r.amount,r.capex,r.freeCashFlow].every(Number.isFinite))complete++;}
 }
 universe.financialCoverage={source:'公開資訊觀測站－財務比較 E 點通',sourceURL:MOPS_ORIGIN,eligible:eligible.length,covered,complete,attemptedAt:cache.attemptedAt,updatedAt:cache.updatedAt||null,frequency:'每次排程最多 12 批、每批 10 檔；逐批補齊，既有財報至少相隔 7 天重新查核。',warnings:cache.warnings||[]};
 return universe;
}
