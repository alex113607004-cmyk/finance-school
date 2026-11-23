import {it,expect} from 'vitest';
import {industryInfo,industryOptions,secIndustry} from './industries';
import {searchStocks} from './stock-universe';
import {searchWatchTargets} from './watchlist-search';
import {overviewScope,withOverviewIndustries} from './market-overview';
const stock=(code,industryCode,industryName,market='TWSE')=>({code,name:'模擬 '+code,market,securityKind:'stock',company:{industryCode},fundamentals:{industryName},sources:{companies:'https://official.example/registry'},sourceChecks:{companies:'2026-11-20T06:00:00Z'}});
const a=stock('2330','24','半導體業'),b=stock('6488','24','半導體業','TPEX'),c=stock('2308','28','電子零組件業');
it('uses verified classifications and keeps source timestamps instead of guessing from the name',()=>{
 expect(industryInfo(a)).toMatchObject({key:'TW:24',label:'半導體業',checkedAt:'2026-11-20T06:00:00Z'});
 expect(industryInfo({name:'半導體公司'}).key).toBe('unclassified');
 expect(industryInfo({...a,fundamentals:{industryCode:'28',industryName:'舊分類'}}).label).toBe('產業代碼 24');
 expect(industryInfo({...a,securityKind:'etf'})).toMatchObject({key:'ETF',kind:'fund'});
 expect(industryInfo({industry:secIndustry({sic:'3571',sicDescription:'Electronic Computers'},{source:'https://data.sec.gov/submissions/CIK0000320193.json'})},'US').key).toBe('US:SIC:3571');
 expect(secIndustry({sic:'24',sicDescription:'invalid'},{source:'official'})).toBeNull();
});
it('combines market/name/industry filters, separates same tickers and browses without a query',()=>{
 const universe={stocks:{a,b,c}},us={stocks:{a:{...a,region:'US',industry:secIndustry({sic:'0024',sicDescription:'Synthetic SIC'},{source:'https://www.sec.gov/'})}}};
 expect(searchStocks(universe.stocks,'',{industry:'TW:24'}).map(s=>s.code)).toEqual(['2330','6488']);
 expect(searchStocks(universe.stocks,'',{market:'TPEX',industry:'TW:24'}).map(s=>s.code)).toEqual(['6488']);
 expect(searchStocks(universe.stocks,'2330',{industry:'TW:28'})).toEqual([]);
 expect(searchWatchTargets(universe,us,'2330','all',8,{industry:'US:SIC:0024'}).items.map(s=>s.id)).toEqual(['US:2330']);
 expect(searchWatchTargets(universe,us,'','all',8,{industry:'TW:24'}).items.map(s=>s.id)).toEqual(['TW:2330','TW:6488']);
 const opts=industryOptions([{stock:a},{stock:b},{stock:c},{stock:{...a,securityKind:'etf'}}]);
 expect(opts.find(o=>o.key==='TW:24')).toMatchObject({label:'台股 · 半導體業',count:2});expect(opts.find(o=>o.key==='ETF').count).toBe(1);
});
it('joins catalog classifications only for the exact venue and never rolls the quote date back for an industry',()=>{
 const row=(s,date)=>({...s,id:`TW:${s.market}:${s.code}`,company:undefined,fundamentals:undefined,type:'stock',date,close:100,volume:10,turnover:1000,changePercent:1,limit:{status:'none'}});
 const snapshot={stocks:[row(a,'2026-11-20'),row(b,'2026-11-19')],markets:{TWSE:{date:'2026-11-20'},TPEX:{date:'2026-11-19'}}};
 const classified=withOverviewIndustries(snapshot,{2330:a,6488:b});
 expect(overviewScope(classified,{industry:'TW:24'})).toMatchObject({date:'2026-11-20',stats:{total:1,turnover:1000}});
 const missing=overviewScope(classified,{industry:'TW:28'});expect(missing.date).toBe('2026-11-20');expect(missing.stocks).toEqual([]);
 expect(withOverviewIndustries(snapshot,{2330:{...a,market:'TPEX'}}).stocks[0].industry).toBeUndefined();
 expect(snapshot.stocks[0].industry).toBeUndefined();
});
