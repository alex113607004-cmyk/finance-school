import fs from 'node:fs';
import crypto from 'node:crypto';
import {extractFacts,fiscalPeriods,financialSnapshot,plainFinancialSummary} from '../src/sec-financials.js';
import companies from '../data/us-companies.json' with {type:'json'};
import {marketDate} from '../src/security.js';
import {publicQuoteBundle} from './us-quote-provider.mjs';
import {alpacaPublication} from './us-alpaca-provider.mjs';
const now=new Date(),asOf=marketDate(now,'US'),offline=process.argv.includes('--offline'),registry=JSON.parse(fs.readFileSync('data/sec/quarter-eps-exhibits.json','utf8'));
let ua=process.env.SEC_UPDATES_ENABLED==='true'?(process.env.SEC_USER_AGENT||''):'',lastStarted=0;
// Identity is supplied explicitly by the maintainer. Never infer a contact from
// GitHub profiles or send a personal address without the user's choice.
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function secRead(url){
 if(!ua||!/@/.test(ua))throw Error('未設定 SEC_USER_AGENT 的可識別聯絡資料。');
 for(let attempt=0;attempt<4;attempt++){
  await pause(Math.max(0,1100-(Date.now()-lastStarted)));lastStarted=Date.now();
  const r=await fetch(url,{headers:{'User-Agent':ua,Accept:'application/json,text/html','Accept-Encoding':'identity'},signal:AbortSignal.timeout(40000)});
  if(r.ok)return {text:await r.text(),checkedAt:new Date().toISOString()};
  if(r.status===403)throw Error('SEC 回覆 403；停止重試並保留已核實快照。');
  if(![429,500,502,503,504].includes(r.status))throw Error('SEC HTTP '+r.status);
  if(attempt===3)throw Error('SEC HTTP '+r.status+'，退避後仍失敗。');
  const retry=Number(r.headers.get('retry-after'));await pause(Math.min(60000,retry>0?retry*1000:2000*2**attempt));
 }
}
const path='src/generated/us.json';
const stocks={};
for(const company of companies){
 const warnings=[],name=company.ticker,cik=company.cik,factsURL=`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`,submissionsURL=`https://data.sec.gov/submissions/CIK${cik}.json`,metaFile=`data/sec/${name}-source-checks.json`;
 let checks;try{checks=JSON.parse(fs.readFileSync(metaFile,'utf8'));}catch{checks={facts:{url:factsURL,checkedAt:null},submissions:{url:submissionsURL,checkedAt:null}};}
 if(!offline&&!ua)warnings.push('SEC 自動更新尚未啟用；保留最後已核實快照與原查核時間。');
 if(!offline&&ua){
  try{
   const facts=await secRead(factsURL),submissions=await secRead(submissionsURL),f=JSON.parse(facts.text),s=JSON.parse(submissions.text);
   if(Number(f.cik)!==Number(cik)||Number(s.cik)!==Number(cik)||!s.tickers?.includes(name))throw Error('SEC CIK／ticker 識別不符。');
   fs.writeFileSync(`data/sec/${name}-facts.json`,facts.text);fs.writeFileSync(`data/sec/${name}-submissions.json`,submissions.text);
   checks={facts:{url:factsURL,checkedAt:facts.checkedAt,sha256:crypto.createHash('sha256').update(facts.text).digest('hex')},submissions:{url:submissionsURL,checkedAt:submissions.checkedAt,sha256:crypto.createHash('sha256').update(submissions.text).digest('hex')}};fs.writeFileSync(metaFile,JSON.stringify(checks,null,2)+'\n');
  }catch(e){warnings.push(e.message);}
 }
 let cf,sub;try{cf=JSON.parse(fs.readFileSync(`data/sec/${name}-facts.json`,'utf8'));sub=JSON.parse(fs.readFileSync(`data/sec/${name}-submissions.json`,'utf8'));}catch(e){stocks['US:'+name]={...company,id:'US:'+name,region:'US',code:name,market:company.exchange,securityKind:'stock',dataStatus:'unavailable',warnings:['尚無可核實 SEC 快照。']};continue;}
 const extraEPS=[];
 for(const e of registry.filter(e=>e.ticker===name)){
  if(!offline&&ua&&!extraEPS.some(x=>x.source===e.source)){
   try{const source=await secRead(e.source),sha=crypto.createHash('sha256').update(source.text).digest('hex');if(sha!==e.sha256){warnings.push('第四季 EPS 原始 exhibit 版本已變更，暫不使用待人工核對。');continue;}}
   catch(err){warnings.push('第四季 exhibit 本次未能重查，保留原查核版本：'+err.message);}
  }
  // A verified original document stays a dated version; never renew its publication date.
  extraEPS.push(e);
 }
 const facts=extractFacts(cf,sub),periods=fiscalPeriods(facts,sub,extraEPS),financials={facts,periods,extraEPS},snapshot=financialSnapshot(financials,asOf);
 stocks['US:'+name]={id:'US:'+name,region:'US',code:name,ticker:name,cik,name:company.name,nameZh:company.nameZh,market:company.exchange,securityKind:'stock',currency:'USD',fiscalYearEnd:sub.fiscalYearEnd,latestFiscalEnd:periods.filter(p=>p.fiscalQuarter===4).at(-1)?.end,financials,snapshot,summary:plainFinancialSummary(snapshot),sourceChecks:checks,sources:{facts:factsURL,submissions:submissionsURL},dataStatus:warnings.length?'last-verified':'verified',warnings,quote:{status:'unavailable',currency:'USD',price:null,source:null,reason:'公開版尚無已確認展示權的美股行情來源；不轉載 yfinance／Yahoo 試用資料。'},history:{code:name,market:company.exchange,region:'US',rows:[],sources:[],partial:false,completeMonths:[],corporateActionsVerified:false,reason:'沒有已授權的美股歷史行情，K 線、均線與價格估值暫不可用。'}};
 console.log(JSON.stringify({ticker:name,period:snapshot.latest?.end,ttmEPS:snapshot.ttm?.eps,status:stocks['US:'+name].dataStatus,warnings}));
}
// ETF fields are explicit gaps; ETF issuer corporate earnings are never substituted.
stocks['US:SPY']={id:'US:SPY',region:'US',code:'SPY',ticker:'SPY',market:'NYSE Arca',name:'SPDR S&P 500 ETF Trust',nameZh:'標普 500 ETF',securityKind:'etf',currency:'USD',dataStatus:'partial',sources:{issuer:'https://www.ssga.com/us/en/individual/etfs/spdr-sp-500-etf-trust-spy'},quote:{status:'unavailable',price:null,currency:'USD',reason:'未設定可公開展示的 ETF 行情來源。'},nav:{available:false,reason:'尚無同日、同幣別且可展示的基金淨值，折溢價不計算。'},history:{code:'SPY',market:'NYSE Arca',region:'US',rows:[],sources:[],completeMonths:[],partial:false},warnings:[]};
// Replaceable backend contract: a provider creates this file after verifying its
// display/cache agreement. Neither the raw payload nor credentials are published.
if(!offline&&process.env.US_PUBLISH_MARKET_DATA==='1')for(const company of companies){
 try{const input=await alpacaPublication(company);if(input)Object.assign(stocks['US:'+company.ticker],publicQuoteBundle(input,{publicDisplayConfirmed:true}));}
 catch{stocks['US:'+company.ticker].warnings.push('Alpaca 行情取得或展示／快取條款檢查失敗，未發布行情。');}
}
if(process.env.US_PUBLIC_QUOTE_FILE){
 try{const inputs=JSON.parse(fs.readFileSync(process.env.US_PUBLIC_QUOTE_FILE,'utf8'));
  for(const input of inputs.stocks||[]){const stock=stocks['US:'+input.symbol];if(!stock||input.region!=='US'||input.cik&&Number(input.cik)!==Number(stock.cik))continue;
   Object.assign(stock,publicQuoteBundle(input,{publicDisplayConfirmed:process.env.US_PUBLIC_DISPLAY_CONFIRMED==='true'}));
  }
 }catch{for(const stock of Object.values(stocks))stock.warnings.push('行情介接檔讀取失敗；停止發布價格，保留 SEC 基本面。');}
}
const result={schemaVersion:1,generatedAt:new Date().toISOString(),asOf,source:'SEC EDGAR Company Facts + Submissions',stocks,policy:{quotes:'unavailable-until-display-rights-verified',secAutomaticUpdate:!!ua&&/@/.test(ua),secRequestsPerSecond:1,financialVersions:'latest-public-as-of-observation',eps:'direct-quarterly-GAAP-diluted; Q4 verified from issuer 8-K exhibit'}};
fs.writeFileSync(path,JSON.stringify(result)+'\n');
// Small fallback avoids shipping raw SEC facts inside the initial HTML bundle.
fs.writeFileSync('src/generated/us-summary.json',JSON.stringify({...result,stocks:Object.fromEntries(Object.entries(stocks).map(([id,s])=>[id,{...s,financials:undefined}]))})+'\n');
