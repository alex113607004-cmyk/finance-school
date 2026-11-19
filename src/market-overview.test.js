import {describe,it,expect} from 'vitest';
import {collectOverview} from '../scripts/overview-collector.mjs';
import {parseOverviewQuotes,parseTwseLimits,parseTpexNextLimits,attachOverviewLimits,overviewScope,rankOverview} from './market-overview';
import twse from '../tests/fixtures/overview/twse-quotes.json';
import tpex from '../tests/fixtures/overview/tpex-quotes.json';
import twseLimits from '../tests/fixtures/overview/twse-limits.json';
import tpexPrevious from '../tests/fixtures/overview/tpex-previous.json';
import catalog from '../tests/fixtures/overview/catalog.json';
const meta={source:'https://official.example/report',checkedAt:'2026-11-19T05:33:00Z'};
const tw=()=>attachOverviewLimits(parseOverviewQuotes(twse,'TWSE',catalog,meta),parseTwseLimits(twseLimits,meta));
const ot=()=>attachOverviewLimits(parseOverviewQuotes(tpex,'TPEX',catalog,meta),parseTpexNextLimits(tpexPrevious,{...meta,effectiveDate:'2026-11-18',chainVerified:true}));
const snapshot=()=>({schemaVersion:1,markets:{TWSE:{date:'2026-11-18',status:'ok'},TPEX:{date:'2026-11-18',status:'ok'}},stocks:[...tw(),...ot()]});
describe('official dated market rankings',()=>{
 it('reads verified Taiwan quotes, units and price differences from the original fields',()=>{
  const s=tw().find(s=>s.code==='2330');expect(s.close).toBe(2175);expect(s.change).toBe(5);expect(s.changePercent).toBeCloseTo(5/2170*100,10);expect(s.volume).toBe(50794225);expect(s.date).toBe('2026-11-18');
  const q=ot().find(s=>s.code==='6488'),raw=tpex.tables[0].data.find(r=>r[0]==='6488');expect(q.volume).toBe(Number(raw[8].replaceAll(',','')));expect(q.market).toBe('TPEX');
 });
 it('identifies actual limits without requiring exactly ten percent, and keeps ordinary prices separate',()=>{
  const all=[...tw(),...ot()];for(const code of ['2321','3017','3131'])expect(all.find(s=>s.code===code).limit.status).toBe('up');for(const code of ['2314','6148'])expect(all.find(s=>s.code===code).limit.status).toBe('down');expect(all.find(s=>s.code==='2330').limit.status).toBe('none');expect(all.find(s=>s.code==='3131').changePercent).not.toBe(10);
 });
 it('rejects mismatched dates and unverified trading-day chains rather than applying next-day limits to today',()=>{
  const q=parseOverviewQuotes(twse,'TWSE',catalog,meta),bad=structuredClone(twseLimits);bad.date='20261119';expect(attachOverviewLimits(q,parseTwseLimits(bad,meta)).every(s=>s.limit.status==='unavailable')).toBe(true);
  expect(()=>parseTpexNextLimits(tpex,{...meta,effectiveDate:'2026-11-18',chainVerified:true})).toThrow(/交易日/);
  expect(()=>parseTpexNextLimits(tpexPrevious,{...meta,effectiveDate:'2026-11-18',chainVerified:false})).toThrow(/交易日/);
 });
 it('does not turn missing limits, unlimited ranges, out-of-range prices or non-traded stocks into limit signals',()=>{
  const s=tw()[0],b={date:s.date,upper:100,lower:80};expect(attachOverviewLimits([{...s,close:110}],{[s.code]:b})[0].limit.status).toBe('unavailable');
  expect(attachOverviewLimits([s],{[s.code]:{...b,upper:9999.95,lower:.01}})[0].limit.status).toBe('unrestricted');expect(attachOverviewLimits([s],{})[0].limit.status).toBe('unavailable');
  const body=structuredClone(twse);body.tables[0].data.forEach(r=>r[2]='0');expect(()=>parseOverviewQuotes(body,'TWSE',catalog,meta)).toThrow(/成交資料/);
 });
 it('filters ETFs and stale market dates, retaining unknown changes instead of treating them as flat',()=>{
  const s=snapshot();expect(overviewScope(s).stocks.every(x=>x.type==='stock')).toBe(true);expect(overviewScope(s,{type:'etf'}).stocks.every(x=>x.type==='etf')).toBe(true);
  s.markets.TPEX.date='2026-11-17';s.stocks=s.stocks.map(x=>x.market==='TPEX'?{...x,date:'2026-11-17'}:x);const scope=overviewScope(s,{type:'all'});expect(scope.date).toBe('2026-11-18');expect(scope.stocks.every(s=>s.market==='TWSE')).toBe(true);expect(scope.missingMarkets).toEqual(['TPEX']);expect(overviewScope(s,{market:'TPEX'}).date).toBe('2026-11-17');
  s.stocks[0].changePercent=null;expect(overviewScope(s,{type:'all'}).stats.unknownChange).toBeGreaterThan(0);
 });
 it('sorts volume, amount, gains, losses and exact limit categories without changing source rows',()=>{
  const s=overviewScope(snapshot(),{type:'all'}).stocks,original=s.map(x=>x.id);
  for(const metric of ['volume','turnover']){const ranked=rankOverview(s,{metric});expect(ranked[0][metric]).toBe(Math.max(...s.map(x=>x[metric])));}
  expect(rankOverview(s,{category:'gainers'}).every(x=>x.changePercent>0)).toBe(true);const down=rankOverview(s,{category:'losers'});expect(down[0].changePercent).toBe(Math.min(...s.map(s=>s.changePercent).filter(Number.isFinite)));
  expect(rankOverview(s,{category:'limitUp'}).every(s=>s.close===s.limit.upper)).toBe(true);expect(rankOverview(s,{category:'limitDown'}).every(s=>s.close===s.limit.lower)).toBe(true);expect(s.map(x=>x.id)).toEqual(original);
 });
 it('stops access-blocked requests and retains both market dates, original values and check timestamps',async()=>{
  const old=snapshot();for(const m of Object.values(old.markets))m.checkedAt=meta.checkedAt;
  let calls=0;const read=async()=>{calls++;throw Object.assign(Error('HTTP 403'),{status:403});};
  const next=await collectOverview({old,universe:catalog,now:new Date('2026-11-19T06:00:00Z'),read});
  expect(next.stocks).toEqual(old.stocks);expect(next.markets.TWSE.checkedAt).toBe(meta.checkedAt);expect(next.markets.TPEX.date).toBe('2026-11-18');expect(next.markets.TWSE.status).toBe('retained');expect(calls).toBe(2);
 });
 it('does not treat an unavailable prior TPEx report as a holiday or classify with the current report next-day prices',async()=>{
  const urls=[],read=async source=>{urls.push(source);if(source.includes('2026/11/17'))throw Error('HTTP 503');return {...meta,source,body:source.includes('TWT84U')?twseLimits:source.includes('tpex.org.tw')?tpex:twse};};
  const next=await collectOverview({universe:catalog,now:new Date('2026-11-18T06:00:00Z'),read});
  expect(next.stocks.filter(s=>s.market==='TPEX').every(s=>s.limit.status==='unavailable')).toBe(true);expect(next.markets.TPEX.warnings.join()).toContain('503');expect(urls.some(u=>u.includes('2026/11/16'))).toBe(false);expect(next.stocks.find(s=>s.code==='2321').limit.status).toBe('up');
 });
});
