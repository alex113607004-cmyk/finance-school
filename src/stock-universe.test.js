import {describe,it,expect} from 'vitest';
import {normalizeMarket,mergeMarkets,searchStocks,resolveStock,parseTpexDaily,addPeerContext,universeCounts,securityKind} from './stock-universe';
import companies from '../tests/fixtures/universe/otc-companies.json';
import income from '../tests/fixtures/universe/otc-financial.json';
import revenue from '../tests/fixtures/universe/otc-revenue.json';
import valuation from '../tests/fixtures/universe/otc-pe.json';
import daily from '../tests/fixtures/universe/otc-daily.json';
const stocks=normalizeMarket({market:'TPEX',companies,income,revenue,valuation,sources:{earnings:'https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap06_O_ciA'}});
describe('all Taiwan stock markets',()=>{
 it('normalizes real OTC company, cumulative EPS, margins, revenue and official PE without inventing TTM',()=>{
  const s=stocks['6488'];expect(s.market).toBe('TPEX');expect(s.name).toBe('環球晶');expect(s.fundamentals.kind).toBe('company');expect(s.company.fullName).toContain('環球晶');
  expect(s.fundamentals.earnings.epsYtd).toBe(Number(income[0]['基本每股盈餘（元）']));expect(s.fundamentals.earnings.basis).toContain('非近四季');expect(s.fundamentals.earnings.announcementDate).toBeNull();
  expect(s.profit.gross).toBeCloseTo(Number(income[0]['營業毛利（毛損）淨額'])/Number(income[0]['營業收入'])*100,8);
  expect(s.valuation.pe).toBe(Number(valuation[0].PriceEarningRatio));expect(s.fundamentals.revenue.yoy).toBe(Number(revenue[0]['營業收入-去年同月增減(%)']));expect(s.fundamentals.cashflow).toBeNull();
 });
 it('keeps suspended registrants with no quote, and recognizes funds and preferred shares',()=>{
  expect(stocks[6488].quote).toBeNull();expect(normalizeMarket({market:'ESB',quotes:[{SecuritiesCompanyCode:'1293',CompanyName:'利統',LatestPrice:'0',Date:'1151117'}]})['1293'].quote.close).toBeNull();
  const more=normalizeMarket({market:'TPEX',quotes:[{SecuritiesCompanyCode:'00679B',CompanyName:'債券ETF',Close:'20',Date:'1151117'},{SecuritiesCompanyCode:'70001P',CompanyName:'權證',Close:'1'},{SecuritiesCompanyCode:'2883A',CompanyName:'特別股',Close:'50'}]});
  expect(more['00679B'].securityKind).toBe('etf');expect(more['00679B'].fundamentals.kind).toBe('etf');expect(more['70001P']).toBeUndefined();expect(more['2883A'].securityKind).toBe('preferred');expect(securityKind('64881')).toBeNull();expect(securityKind('01002T')).toBe('reit');
 });
 it('searches partial names, code prefixes, fullwidth text, 台/臺 and markets with exact matches first',()=>{
  const all={...stocks,'2330':{code:'2330',name:'台積電',market:'TWSE',company:{english:'TSMC'}},'2317':{code:'2317',name:'鴻海',market:'TWSE'}};
  expect(resolveStock(all,'２３３０').code).toBe('2330');expect(resolveStock(all,'臺積電').code).toBe('2330');expect(resolveStock(all,'tSmC').code).toBe('2330');
  expect(searchStocks(all,'23').map(s=>s.code)).toEqual(['2317','2330']);expect(searchStocks(all,'環球')[0].code).toBe('6488');expect(searchStocks(all,'環球',{market:'TWSE'})).toEqual([]);expect(resolveStock(all,'__proto__')).toBeNull();
 });
 it('parses exact daily shares, official price differences and correct date from the real whole-market report',()=>{
  const records=parseTpexDaily(daily,new Set(['6488','00411A']),'official','2026-11-17');const source=daily.tables[0],r=source.data.find(r=>r[0]==='6488'),s=records.find(s=>s.code==='6488');
  expect(s.date).toBe('2026-11-17');expect(s.close).toBe(546);expect(s.change).toBe(-31);expect(s.volume).toBe(Number(r[source.fields.indexOf('成交股數')].replaceAll(',','')));
  const lot={date:'20261117',stat:'ok',tables:[{fields:['代號','名稱','開盤','最高','最低','收盤','成交張數','漲跌'],data:[['6488','環球晶','100','110','90','105','2','除息']]}]};
  const row=parseTpexDaily(lot,new Set(['6488']),'official','now')[0];expect(row.volume).toBe(2000);expect(row.change).toBeNull();
 });
 it('deduplicates cross-market transfers by quote date and avoids mixing peer markets',()=>{
  expect(mergeMarkets({'6488':{...stocks[6488],quote:{date:'2026-10-01'}}},{'6488':{...stocks[6488],market:'TWSE',quote:{date:'2026-11-01'}}})[6488].market).toBe('TWSE');
  const sample={};for(let i=0;i<7;i++)sample['x'+i]={code:'x'+i,market:'TPEX',securityKind:'stock',company:{industryCode:'24'},valuation:{date:'2026-11-17',pe:10+i}};
  sample.outside={...sample.x0,code:'outside',market:'TWSE',valuation:{date:'2026-11-17',pe:1000}};
  addPeerContext(sample);expect(sample.x0.officialPeer.count).toBe(6);expect(sample.outside.officialPeer).toBeUndefined();expect(universeCounts(sample).TPEX).toBe(7);
 });
});
