import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {analyzeFundamentals} from './fundamentals';
import {fundamentalData,reportPeriod,peerStatistics} from '../worker/runtime.mjs';
import {newestData} from './freshness';

const read=name=>JSON.parse(fs.readFileSync(`tests/fixtures/${name}.json`));
const now=new Date('2026-11-17T03:00:00Z');
const stock=()=>{const data=read('fundamental-2330-20261117');data.valuation.pe=20;return data;};
const analyze=data=>analyzeFundamentals(data,now);

describe('transparent general-industry research conditions',()=>{
 it('allows only a conditional candidate and retains the cash-flow gap',()=>{
  const report=analyze(stock());
  expect(report.status).toBe('candidate');
  expect(report.checks).toHaveLength(4);
  expect(report.criticalGaps).toHaveLength(0);
  expect(report.gaps.join()).toContain('現金流');
  expect(report.summary).toContain('個人部位風險');
 });
 it('separates profitable companies from a price above the peer median',()=>{
  const report=analyze(read('fundamental-2330-20261117'));
  expect(report.status).toBe('watch');
  expect(report.checks.find(c=>c.key==='profitability').status).toBe('support');
  expect(report.checks.find(c=>c.key==='valuation').status).toBe('caution');
 });
 it.each([0,-3])('never treats cumulative EPS %s as a positive earnings condition',eps=>{
  const data=stock();data.fundamentals.earnings.epsYtd=eps;
  expect(analyze(data).status).toBe('caution');
  expect(analyze(data).concerns.join()).toContain('未維持正值');
 });
 it('does not annualize YTD EPS or divide price by it',()=>{
  const data=stock();data.fundamentals.earnings.epsYtd=1;
  expect(analyze(data).status).toBe('candidate');
  expect(data.valuation.pe).toBe(20);
 });
 it.each([null,undefined,NaN])('does not turn missing earnings %s into zero or a buy conclusion',eps=>{
  const data=stock();data.fundamentals.earnings.epsYtd=eps;
  expect(analyze(data).status).toBe('insufficient');
 });
 it('handles debt boundaries, liquidity risk, negative growth and negative equity',()=>{
  const data=stock(),b=data.fundamentals.balance;
  b.debtRatio=60;b.currentRatio=100;
  expect(analyze(data).status).toBe('candidate');
  b.debtRatio=60.01;expect(analyze(data).status).toBe('watch');
  b.debtRatio=60;b.currentRatio=99;expect(analyze(data).status).toBe('watch');
  b.currentRatio=100;data.fundamentals.revenue.yoy=-1;
  expect(analyze(data).status).toBe('watch');
  b.equity=-1;expect(analyze(data).status).toBe('caution');
 });
 it.each(['quotes','valuation','profit','companies','earnings','revenue','balance'])('requires a recent successful %s source check',key=>{
  const data=stock();data.sourceChecks[key]='2026-11-10T03:00:00Z';
  expect(analyze(data).status).toBe('insufficient');
  data.sourceChecks[key]=null;data.fetchedAt=now.toISOString();
  expect(analyze(data).status).toBe('insufficient');
 });
 it('rejects stale, invalid, future or mismatched price and reporting dates',()=>{
  for(const change of [
   d=>d.quote.date='2026-11-01',d=>d.quote.date='2026-99-99',d=>d.quote.date='2026-11-18',d=>d.quote.close=null,
   d=>d.valuation.date='2026-11-13',d=>d.fundamentals.balance.period.quarter=2,
   d=>d.fundamentals.earnings.period.end='2026-01-01',d=>d.fundamentals.earnings.period.end=null,
   d=>d.fundamentals.revenue.month='2026-08',d=>d.fundamentals.revenue.month='2026-00',
   d=>d.sourceChecks.balance='2026-11-18T03:00:00Z',d=>d.warnings=['月營收來源本次查詢失敗'],
  ]){const data=stock();change(data);expect(analyze(data).status).toBe('insufficient');}
 });
 it('requires five comparable peers of the same industry, date and reference period',()=>{
  for(const change of [p=>p.count=4,p=>p.date='2026-11-13',p=>p.financialPeriod='115/2',p=>p.industryCode='31']){
   const data=stock();change(data.fundamentals.peer);expect(analyze(data).status).toBe('insufficient');
  }
  const data=stock();data.valuation.pe=0;expect(analyze(data).status).toBe('insufficient');
 });
 it.each(['financial','etf','unavailable'])('uses a separate research state for %s',kind=>{
  const data=stock();data.fundamentals.kind=kind;
  expect(analyze(data).status).toBe('special');expect(analyze(data).checks).toHaveLength(0);
 });
 it('cannot judge an unconnected stock',()=>{expect(analyze(null).status).toBe('insufficient');});
});

describe('official fundamental source normalization and independent recalculation',()=>{
 const datasets={companies:read('t187ap03_L'),revenue:read('t187ap05_L'),earnings:read('t187ap14_L'),balance:read('t187ap07_L_ci')};
 it('keeps YTD income and point-in-time balances distinct and preserves missing cash flow',()=>{
  const f=fundamentalData('2330',datasets);
  expect(f.earnings.period.end).toBe('2026-09-30');
  expect(f.earnings.period.label).toContain('年初累計');expect(f.earnings.epsYtd).toBe(78.75);
  expect(f.balance.period.label).toContain('季末時點');
  expect(f.balance.debtRatio).toBeCloseTo(3009660084/10052887514*100,8);
  expect(f.balance.currentRatio).toBeCloseTo(5084925495/1967745043*100,8);
  expect(f.revenue.yoy).toBeCloseTo((586890319/367473051-1)*100,8);
  expect(f.revenue.mom).toBeCloseTo((586890319/511857399-1)*100,8);
  expect(f.revenue.ytdGrowth).toBeCloseTo((f.revenue.ytdAmount/f.revenue.priorYtd-1)*100,8);
  expect(f.revenue.month).toBe('2026-10');expect(f.cashflow).toBeNull();
 });
 it('rejects invalid periods and zero denominators without Infinity',()=>{
  expect(reportPeriod({'年度':'115','季別':'5'})).toBeNull();
  const d=structuredClone(datasets);d.balance[0]['資產總計']='0';d.balance[0]['流動負債']='0';
  const f=fundamentalData('2330',d);expect(f.balance.debtRatio).toBeNull();expect(f.balance.currentRatio).toBeNull();
  expect(fundamentalData('0050',{}).kind).toBe('etf');
 });
 it('excludes self, loss-making and mismatched peers and recomputes quantiles',()=>{
  const data=stock(),v={date:'2026-11-16',financialPeriod:'115/3'};
  const make=(code,pe,extra={})=>({code,industryCode:'24',valuation:{...v,pe,...extra}});
  const peers=[make('2330',20),...([10,15,20,30,40].map((pe,i)=>make('p'+i,pe))),make('loss',-1),make('zero',0),make('old',2,{date:'2026-11-13'}),make('q2',2,{financialPeriod:'115/2'}),{...make('other',2),industryCode:'31'}];
  const result=peerStatistics(data,peers);expect(result.count).toBe(5);expect(result.median).toBe(20);expect(result.p25).toBe(15);expect(result.p75).toBe(30);expect(result.excludesSelf).toBe(true);
 });
 it('preserves a newer fundamental snapshot and its actual source times when a query regresses',()=>{
  const known=stock(),incoming=stock();incoming.fundamentals.earnings.period.end='2026-06-30';incoming.fundamentals.balance=null;incoming.fundamentals.revenue.month='2026-09';incoming.sourceChecks.balance='new-query';
  const result=newestData(incoming,known);
  expect(result.fundamentals.earnings.period.end).toBe('2026-09-30');expect(result.fundamentals.revenue.month).toBe('2026-10');
  expect(result.fundamentals.balance).toEqual(known.fundamentals.balance);expect(result.sourceChecks.balance).toBe(known.sourceChecks.balance);
  expect(result.warnings).toHaveLength(3);expect(analyze(result).status).toBe('insufficient');
  delete incoming.fundamentals;
  expect(newestData(incoming,known).fundamentals.earnings.epsYtd).toBe(78.75);
 });
});
