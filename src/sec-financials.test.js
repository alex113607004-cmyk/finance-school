import fs from 'node:fs';
import {describe,it,expect} from 'vitest';
import {quarterMetric,epsAt,usTrailingEPS,extractFacts,fiscalPeriods,financialSnapshot,nextDay,compareMetrics} from './sec-financials';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const publication=read('src/generated/us.json');
const fact=(value,start,end,filed='2026-05-01',extra={})=>({value,start,end,filed,availableFrom:nextDay(filed),accession:'original',form:'10-Q',currency:'USD',unit:'USD',tag:'NetCashProvidedByUsedInOperatingActivities',...extra});
describe('SEC fiscal periods, versions and additive flows',()=>{
 it('derives a cash flow quarter only from matching cumulative values across calendar years',()=>{
  const p1={fiscalYear:2026,fiscalQuarter:1,end:'2025-12-31'},p2={fiscalYear:2026,fiscalQuarter:2,end:'2026-03-31'};
  const facts={operatingCashFlow:[fact(100,'2025-10-01',p1.end),fact(260,'2025-10-01',p2.end)]};
  const q=quarterMetric(facts,[p1,p2],p2,'operatingCashFlow','2026-05-02');
  expect(q).toMatchObject({value:160,start:'2026-01-01',end:'2026-03-31',method:'cumulative-difference'});
  expect(quarterMetric(facts,[p1,p2],p2,'operatingCashFlow','2026-05-01').available).toBe(false);
  facts.operatingCashFlow[0].start='2025-09-01';expect(quarterMetric(facts,[p1,p2],p2,'operatingCashFlow','2026-05-02').available).toBe(false);
 });
 it('does not backfill an amendment into an earlier observation or subtract unaligned restated flows',()=>{
  const p={fiscalYear:2026,fiscalQuarter:1,end:'2026-03-31'},original=fact(10,'2026-01-01',p.end),amended=fact(8,'2026-01-01',p.end,'2026-06-01',{accession:'amended',form:'10-Q/A',amended:true});
  const f={operatingCashFlow:[original,amended]};expect(quarterMetric(f,[p],p,'operatingCashFlow','2026-05-31').value).toBe(10);expect(quarterMetric(f,[p],p,'operatingCashFlow','2026-06-02').value).toBe(8);
  const p2={fiscalYear:2026,fiscalQuarter:2,end:'2026-06-30'},cumulative=fact(30,'2026-01-01',p2.end,'2026-08-01');
  f.operatingCashFlow.push(cumulative);expect(quarterMetric(f,[p,p2],p2,'operatingCashFlow','2026-08-02').reason).toMatch(/更正/);
 });
 it('rejects annual-minus-nine-month diluted EPS when a direct Q4 is missing',()=>{
  const p={fiscalYear:2026,fiscalQuarter:4,end:'2026-09-30'},p3={fiscalYear:2026,fiscalQuarter:3,end:'2026-06-30'};
  const f={facts:{eps:[fact(10,'2025-10-01',p.end,'2026-11-01',{tag:'EarningsPerShareDiluted',unit:'USD/shares'}),fact(7,'2025-10-01',p3.end,'2026-08-01',{tag:'EarningsPerShareDiluted',unit:'USD/shares'})]},periods:[p3,p],extraEPS:[]};
  expect(epsAt(f,p,'2026-11-03').available).toBe(false);
  f.extraEPS.push(fact(3.01,'2026-07-01',p.end,'2026-11-01',{fiscalYear:2026,fiscalQuarter:4,tag:'EarningsPerShareDiluted',unit:'USD/shares'}));
  expect(epsAt(f,p,'2026-11-03').value).toBe(3.01);
 });
 it('rejects missing quarters and mismatched comparative units',()=>{
  const f=structuredClone(publication.stocks['US:MSFT'].financials);f.periods.splice(-2,1);expect(usTrailingEPS(f,'2026-11-17').available).toBe(false);
  expect(compareMetrics(fact(5,'2026-01-01','2026-03-31'),fact(4,'2025-01-01','2025-03-31','2025-05-01',{currency:'TWD'})).available).toBe(false);
 });
});
describe('independent checks against actual SEC raw snapshots',()=>{
 it('recomputes Apple Q4 cash flow and margins from annual and nine-month raw Company Facts',()=>{
  const raw=read('data/sec/AAPL-facts.json'),sub=read('data/sec/AAPL-submissions.json');
  const get=(tag,start,end)=>raw.facts['us-gaap'][tag].units.USD.find(f=>f.start===start&&f.end===end&&f.accn==='0000320193-26-000026')?.val;
  const annual=get('NetCashProvidedByUsedInOperatingActivities','2025-09-28','2026-09-26');
  // Nine-month value comes from its contemporaneous 10-Q, not a later future filing.
  const nine=raw.facts['us-gaap'].NetCashProvidedByUsedInOperatingActivities.units.USD.find(f=>f.start==='2025-09-28'&&f.end==='2026-06-27'&&f.accn==='0000320193-26-000020').val;
  expect(annual).toBe(145097e6);expect(nine).toBe(116996e6);
  const s=financialSnapshot(publication.stocks['US:AAPL'].financials,'2026-11-17');expect(s.metrics.operatingCashFlow.value).toBe(annual-nine);expect(s.metrics.capex.value).toBe(2242e6);expect(s.metrics.freeCashFlow.value).toBe(25859e6);expect(s.metrics.grossMargin.value).toBeCloseTo(54820/114477*100,8);
  expect(s.ttm.eps).toBe(8.97);expect(s.ttm.reports.map(r=>r.eps)).toEqual([2.84,2.01,2.02,2.10]);
  const facts=extractFacts(raw,sub),extra=publication.stocks['US:AAPL'].financials.extraEPS;expect(financialSnapshot({facts,periods:fiscalPeriods(facts,sub,extra),extraEPS:extra},'2026-11-17').latest.end).toBe('2026-09-26');
 });
 it('uses Microsoft FY2027 Q1 and the directly disclosed Q4 EPS',()=>{
  const s=financialSnapshot(publication.stocks['US:MSFT'].financials,'2026-11-17');expect(s.latest).toMatchObject({fiscalYear:2027,fiscalQuarter:1,start:'2026-07-01',end:'2026-09-30'});
  expect(s.metrics.revenue.value).toBe(92279e6);expect(s.metrics.operatingCashFlow.value).toBe(58000e6);expect(s.metrics.capex.value).toBe(39367e6);expect(s.metrics.freeCashFlow.value).toBe(18633e6);expect(s.ttm.eps).toBe(19.16);expect(s.ttm.reports.map(r=>r.eps)).toEqual([5.16,4.27,4.81,4.92]);
  expect(s.metrics.revenueYoY.value).toBeCloseTo((92279/77673-1)*100,8);
 });
});
