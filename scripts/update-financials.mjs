import fs from 'node:fs';
import {parseCashflow,recordKey,reportURL,planBatches,updateRecord,attachCashflows,markBatchFailure} from './mops-cashflow.mjs';
const file='data/mops-cashflows.json',output='src/generated/universe.json',offline=process.argv.includes('--offline');
const now=new Date(),universe=JSON.parse(fs.readFileSync(output,'utf8'));
let cache={schemaVersion:1,records:{},attempts:{}};try{cache=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}
if(cache.schemaVersion!==1||!cache.records)throw Error('現金流快取格式不符');
cache.attempts||={};cache.warnings||=[];
const maxBatches=Number(process.env.MOPS_MAX_BATCHES||12);
if(!Number.isInteger(maxBatches)||maxBatches<1||maxBatches>30)throw Error('MOPS_MAX_BATCHES 必須為 1～30');
cache.policy={maxBatches,batchSize:10,ttlDays:7};
if(!offline&&(!cache.blockedUntil||now>=Date.parse(cache.blockedUntil))){
 cache.warnings=[];
 cache.attemptedAt=now.toISOString();
 const batches=planBatches(universe.stocks,cache,{now,maxBatches});
 for(const [i,stocks]of batches.entries()){
  const period=stocks[0].fundamentals.earnings.period,source=reportURL(stocks.map(s=>s.code),period);
  try{
   // Serial, bounded, cached whole-batch requests. Stop on a rate/access block.
   const response=await fetch(source,{signal:AbortSignal.timeout(45000),headers:{Accept:'text/html'}});
   if(!response.ok)throw Object.assign(Error(`HTTP ${response.status}`),{status:response.status});
   const html=await response.text();
   if(/SECURITY REASONS|安全性考量/i.test(html))throw Object.assign(Error('官方來源暫時拒絕存取'),{status:403});
   const checkedAt=new Date().toISOString(),rows=parseCashflow(html,{stocks,period,source,checkedAt});
   for(const stock of stocks){const k=recordKey(stock),r=rows.find(r=>r.code===stock.code);if(r){cache.records[k]=updateRecord(cache.records[k],r);cache.attempts[k]={status:'ok',period:period.end,at:checkedAt};}else cache.attempts[k]={status:'failed',period:period.end,at:checkedAt,reason:'來源未提供可辨識的合併現金流欄位。'};}
   cache.updatedAt=checkedAt;
   console.log(JSON.stringify({cashflowBatch:i+1,total:batches.length,requested:stocks.length,verified:rows.length,period:period.label}));
  }catch(e){
   markBatchFailure(cache,stocks,e);
   console.warn(cache.warnings.at(-1));
   if(e.status===403||e.status===429)break;
  }
  fs.writeFileSync(file,JSON.stringify(cache)+'\n'); // Retain progress even if later requests fail.
  if(i<batches.length-1)await new Promise(r=>setTimeout(r,5000));
 }
}else if(!offline)cache.warnings=[`官方來源限制存取，暫停新請求至 ${cache.blockedUntil}，保留既有查核日期。`];
const result=attachCashflows(universe,cache);
fs.writeFileSync(file,JSON.stringify(cache)+'\n');
fs.writeFileSync(output+'.tmp',JSON.stringify(result)+'\n');fs.renameSync(output+'.tmp',output);
console.log(JSON.stringify(result.financialCoverage));
