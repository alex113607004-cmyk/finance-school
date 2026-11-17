import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {analyzePrice} from './valuation.js';

const now=new Date('2026-11-17T03:00:00Z');
const stock=()=>JSON.parse(fs.readFileSync('tests/fixtures/fundamental-2330-20261117.json'));
describe('relative price assessment with explicit scenario assumptions',()=>{
 it('recomputes a sourced stock’s peer premium and constant-earnings price scenarios',()=>{
  const r=analyzePrice(stock(),now);
  expect(r.status).toBe('middle');expect(r.available).toBe(true);
  expect(r.premium).toBeCloseTo(5.77193805725,8);
  expect(r.scenarios[0].price).toBeCloseTo(1283.6485137533,6);
  expect(r.scenarios[1].price).toBeCloseTo(2094.128216504,5);
  expect(r.scenarios[2].price).toBeCloseTo(3500.613908607,5);
  expect(r.summary).toContain('不能證明');
 });
 it('separates high, middle and low relative multiples without calling a low multiple a bargain',()=>{
  const data=stock();data.valuation.pe=40;
  expect(analyzePrice(data,now).status).toBe('high');
  data.valuation.pe=10;const low=analyzePrice(data,now);
  expect(low.status).toBe('low');expect(low.summary).toContain('不能直接視為便宜');
  data.valuation.pe=data.fundamentals.peer.median;expect(analyzePrice(data,now).premium).toBe(0);
 });
 it.each([0,-1,null,Infinity])('does not produce scenario prices from invalid PE %s',pe=>{
  const data=stock();data.valuation.pe=pe;const r=analyzePrice(data,now);
  expect(r.available).toBe(false);expect(r.scenarios).toEqual([]);
 });
 it('withholds price scenarios when earnings are nonpositive or equity has a warning',()=>{
  const data=stock();data.fundamentals.earnings.epsYtd=0;
  expect(analyzePrice(data,now).status).toBe('caution');expect(analyzePrice(data,now).scenarios).toEqual([]);
 });
 it('requires same-day comparisons, full comparable quartiles and verified current sources',()=>{
  for(const mutate of [
   d=>d.valuation.date='2026-11-13',d=>d.fundamentals.peer.count=4,
   d=>d.fundamentals.peer.financialPeriod='115/2',d=>d.fundamentals.peer.industryCode='31',
   d=>d.fundamentals.peer.p25=null,d=>d.fundamentals.peer.p75=1,
   d=>d.sourceChecks.earnings='2026-11-01T00:00:00Z',d=>d.warnings=['來源本次查詢失敗'],
  ]){const data=stock();mutate(data);const r=analyzePrice(data,now);expect(r.available).toBe(false);expect(r.scenarios).toEqual([]);}
 });
 it('uses separate methods for financials and funds and does not fabricate a missing stock value',()=>{
  const data=stock();for(const kind of ['financial','etf','unavailable']){data.fundamentals.kind=kind;expect(analyzePrice(data,now).status).toBe('special');}
  expect(analyzePrice(null,now).status).toBe('insufficient');
 });
});
