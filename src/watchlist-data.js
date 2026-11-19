import {historicalValuation} from './stock-analysis.js';
import {analyzeUSValuation} from './us-valuation.js';
import {dataReadiness,validDataDate} from './data-readiness.js';
import {assessFundamentals} from './price-assessment.js';
import {quoteStatus,marketDate} from './security.js';
import {researchSnapshotTW} from './research-snapshot.js';
export function latestWatchQuote(stock,entry,overview,now=new Date()){
 const today=marketDate(now,'TW'),candidates=[];
 const add=(quote,source,checkedAt)=>{if(quote&&Number.isFinite(quote.close)&&quote.close>0&&validDataDate(quote.date)&&quote.date<=today)candidates.push({quote,source,checkedAt});};
 add(stock.quote,stock.sources?.quotes,stock.sourceChecks?.quotes);
 if(entry?.history?.market===stock.market)add(entry.quote,entry.quote?.source,entry.quote?.checkedAt);
 const marketQuote=overview?.stocks?.find(s=>s.code===stock.code&&s.market===stock.market);
 if(marketQuote)add({date:marketQuote.date,close:marketQuote.close,change:marketQuote.change,changePercent:marketQuote.changePercent,volume:marketQuote.volume},marketQuote.source,marketQuote.checkedAt);
 candidates.sort((a,b)=>b.quote.date.localeCompare(a.quote.date)||(Date.parse(b.checkedAt)||0)-(Date.parse(a.checkedAt)||0));
 const selected=candidates[0];return selected?{...stock,quote:selected.quote,sources:{...stock.sources,quotes:selected.source},sourceChecks:{...stock.sourceChecks,quotes:selected.checkedAt}}:stock;
}
export function watchlistRow(saved,{universe,curated,overview,us,research2330,now=new Date()}={}){
 const region=saved.region,raw=region==='US'?us?.stocks?.[saved.id]:universe?.stocks?.[saved.symbol];
 if(!raw)return {...saved,available:false,reason:'此標的目前未出現在已發布資料中；自選仍保留，可移除或查看個股頁。'};
 const entry=region==='TW'?curated?.stocks?.[saved.symbol]:null;
 const stock=region==='TW'?latestWatchQuote(raw,entry,overview,now):raw,quote=stock.quote||{},history=region==='TW'?entry?.history||{rows:[],completeMonths:[],partial:false}:stock.history||{rows:[]};
 const filings=entry?.filings||{},valuation=region==='TW'?historicalValuation({quote,history,filings,expectedPeriod:stock.fundamentals?.earnings?.period,now}):analyzeUSValuation(stock,{now});
 const snapshot=region==='US'?stock.snapshot:saved.symbol==='2330'&&research2330?researchSnapshotTW(research2330,valuation.ttm):undefined;
 const report=dataReadiness({stock,history,valuation,filings,snapshot,region,now,policy:us?.policy});
 const fundamentals=assessFundamentals(stock,{region,now,snapshot});
 const factKeys=['eps','revenue','freeCashFlow'];
 return {...saved,available:true,name:stock.nameZh||stock.name||saved.name,market:stock.market,currency:report.currency,quote,quoteUsable:region==='TW'?report.quote.available:quoteStatus(quote,{region,now}).usable,quoteSource:region==='TW'?stock.sources?.quotes:quote.sourceURL,quoteStatus:report.groups[0],financialStatus:report.groups[1],modelStatus:report.groups[2],modelTitle:report.groups[2].state==='ready'?valuation.title:report.groups[2].state==='inapplicable'?'本益比模型不適用':'暫無適用估值',low:report.groups[2].state==='ready'?valuation.low:null,high:report.groups[2].state==='ready'?valuation.high:null,facts:fundamentals.rows.filter(r=>factKeys.includes(r.key)),modelReasons:report.modelReasons,pe:report.pe};
}
