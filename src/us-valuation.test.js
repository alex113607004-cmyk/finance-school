import {describe,it,expect} from 'vitest';
import {analyzeUSValuation} from './us-valuation';
import {securityId,parseAnalysisAddress,analysisHref,quoteStatus,alignEPSForSplits} from './security';
import {publicQuoteBundle} from '../scripts/us-quote-provider.mjs';
import {nextDay} from './sec-financials';
import {alpacaPublication} from '../scripts/us-alpaca-provider.mjs';
function fixture(){
 const periods=[],eps=[],rows=[],completeMonths=[];
 for(let y=2021;y<=2026;y++)for(let q=1;q<=4;q++){
  const start=`${y}-${String(q*3-2).padStart(2,'0')}-01`,end=new Date(Date.UTC(y,q*3,0)).toISOString().slice(0,10);if(end>'2026-09-30')continue;
  const filed=nextDay(end);periods.push({fiscalYear:y,fiscalQuarter:q,end,firstFiled:filed});eps.push({value:1,start,end,filed,availableFrom:nextDay(filed),unit:'USD/shares',currency:'USD',accession:`${y}-${q}`,source:'https://www.sec.gov/',tag:'EarningsPerShareDiluted'});
 }
 for(let y=2023;y<=2026;y++)for(let m=1;m<=12;m++){const month=`${y}-${String(m).padStart(2,'0')}`;if(month>'2026-10')continue;const date=new Date(Date.UTC(y,m,0)).toISOString().slice(0,10);rows.push({date,open:40,high:42,low:39,close:40,volume:100});completeMonths.push(month);}
 return {id:'US:TEST',region:'US',securityKind:'stock',financials:{periods,facts:{eps},extraEPS:[]},quote:{price:40,date:'2026-11-16',timestamp:'2026-11-16T21:00:00Z',status:'delayed',currency:'USD'},history:{rows,completeMonths,coverageStart:'2023-01-01',corporateActionsVerified:true,corporateActions:[],adjustment:'unadjusted'}};
}
const now=new Date('2026-11-17T12:00:00Z');
describe('market identity and quote state',()=>{
 it('keeps legacy Taiwan routes and separates equal symbols by market',()=>{expect(securityId('TW','1234')).not.toBe(securityId('US','1234'));expect(parseAnalysisAddress('2330')).toEqual({region:'TW',symbol:'2330'});expect(parseAnalysisAddress('US','AAPL')).toEqual({region:'US',symbol:'AAPL'});expect(analysisHref('US','AAPL')).toBe('#analysis/US/AAPL');});
 it('labels delay, stale, disconnected and failed data explicitly',()=>{const q=fixture().quote;expect(quoteStatus(q,{now})).toMatchObject({label:'延遲',usable:true});expect(quoteStatus({...q,date:'2026-10-01'},{now}).usable).toBe(false);expect(quoteStatus({...q,date:'invalid'},{now}).usable).toBe(false);expect(quoteStatus({...q,status:'disconnected'},{now}).usable).toBe(false);expect(quoteStatus(null,{now}).usable).toBe(false);});
});
describe('auditable own-history valuation',()=>{
 it('calculates monthly P25/50/75 with at least 24 samples',()=>{const v=analyzeUSValuation(fixture(),{now});expect(v.available).toBe(true);expect(v.validSamples.length).toBe(46);expect(v.ttm.eps).toBe(4);expect(v.p25).toBe(10);expect(v.p50).toBe(10);expect(v.p75).toBe(10);expect(v.low).toBe(40);expect(v.high).toBe(40);});
 it('does not leak late amendments into earlier historical EPS',()=>{const s=fixture(),original=s.financials.facts.eps.find(f=>f.accession==='2025-4');s.financials.facts.eps.push({...original,value:2,filed:'2026-11-01',availableFrom:'2026-11-02',accession:'amended',amended:true});const v=analyzeUSValuation(s,{now});expect(v.samples.find(s=>s.date==='2026-10-31').eps).toBe(4);expect(v.ttm.eps).toBe(5);});
 it('stops for negative EPS, missing data, stale price and unknown split basis',()=>{const s=fixture();s.financials.facts.eps.forEach(f=>f.value=-1);expect(analyzeUSValuation(s,{now}).reasons.join()).toMatch(/負值/);const t=fixture();t.history.partial=true;expect(analyzeUSValuation(t,{now}).available).toBe(false);t.history.partial=false;t.quote.date='2026-01-01';expect(analyzeUSValuation(t,{now}).available).toBe(false);const u=fixture();u.history.corporateActionsVerified=false;expect(analyzeUSValuation(u,{now}).reasons.join()).toMatch(/股數基準/);});
 it('requires version-specific EPS share bases around a split, then aligns verified values',()=>{const ttm={available:true,eps:8,reports:[{eps:4,periodEnd:'2025-12-31',accession:'old'},{eps:4,periodEnd:'2026-03-31',accession:'new'}]},actions=[{date:'2026-02-01',type:'split',ratio:2,verified:true}];expect(alignEPSForSplits(ttm,'2026-04-01',actions).available).toBe(false);expect(alignEPSForSplits(ttm,'2026-04-01',actions,[{accession:'old',end:'2025-12-31',verified:true,basisThrough:'2025-12-31'}]).eps).toBe(6);expect(alignEPSForSplits({available:true,eps:4,end:'2025-12-31'},'2026-04-01',[{...actions[0],verified:false}]).available).toBe(false);});
});
describe('public quote adapter rights gate',()=>{
 it('never publishes yfinance or unverified licenses and strips provider secrets',()=>{
  const input={provider:'licensed-test',region:'US',symbol:'TEST',exchange:'NASDAQ',apiKey:'never-publish',quote:fixture().quote,history:fixture().history,license:{publicDisplayAllowed:true,documentation:'https://example.com/contract',checkedAt:'2026-11-17'}};
  expect(publicQuoteBundle(input).quote.price).toBeNull();expect(publicQuoteBundle({...input,provider:'yfinance'},{publicDisplayConfirmed:true}).quote.price).toBeNull();const bundle=publicQuoteBundle(input,{publicDisplayConfirmed:true});expect(bundle.quote.price).toBe(40);expect(JSON.stringify(bundle)).not.toContain('never-publish');expect(publicQuoteBundle(null).quote.status).toBe('unavailable');
 });
});
describe('existing optional Alpaca integration',()=>{
 const company={ticker:'AAPL',cik:'0000320193',exchange:'NASDAQ'};
 it('does not request quotes without the explicit publish and license settings',async()=>{
  let requested=false;const fetcher=async()=>{requested=true;};expect(await alpacaPublication(company,{config:{},fetcher})).toBeNull();await expect(alpacaPublication(company,{config:{US_PUBLISH_MARKET_DATA:'1'},fetcher})).rejects.toThrow(/條款/);expect(requested).toBe(false);
 });
 it('keeps raw daily timestamps distinct from trade time and excludes single-exchange valuation',async()=>{
  const config={US_PUBLISH_MARKET_DATA:'1',ALPACA_API_KEY_ID:'private-id',ALPACA_API_SECRET_KEY:'private-secret',US_ALPACA_FEED:'iex',US_MARKET_DATA_LICENSE_URL:'https://example.com/license',US_MARKET_DATA_LICENSE_CHECKED_AT:'2026-11-17',US_MARKET_DATA_CACHE_POLICY:'test contract'};
  const fetcher=async()=>Response.json({bars:{AAPL:[{t:'2026-11-16T05:00:00Z',o:100,h:105,l:99,c:102,v:1000}]}});
  const input=await alpacaPublication(company,{config,fetcher,now}),bundle=publicQuoteBundle(input,{publicDisplayConfirmed:true});expect(bundle.quote.timestampKind).toBe('daily-bar-start');expect(bundle.history.valuationCoverage).toBe('single-exchange');expect(JSON.stringify(bundle)).not.toContain('private-secret');expect(analyzeUSValuation({...fixture(),history:{...fixture().history,valuationCoverage:'single-exchange'}},{now}).reasons.join()).toMatch(/IEX/);
 });
});
