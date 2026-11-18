import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {parseCashflow,reportURL,updateRecord,planBatches,attachCashflows,markBatchFailure} from '../scripts/mops-cashflow.mjs';
import {cashflowView} from './tw-cashflow';
import {assessFundamentals} from './price-assessment';
const html=fs.readFileSync('tests/fixtures/mops/cashflow-2026-q3.html','utf8');
const now=new Date('2026-11-18T16:08:00Z'),period={year:2026,quarter:3,end:'2026-09-30',label:'2026 Q3（年初累計）'};
const stocks=['2317','6488','2330'].map(code=>({code,name:code,market:code==='6488'?'TPEX':'TWSE',securityKind:'stock',fundamentals:{kind:'company',earnings:{period}},sources:{},sourceChecks:{}}));
const options={stocks,period,checkedAt:now.toISOString(),source:reportURL(stocks.map(s=>s.code),period)};
const parse=(text=html)=>parseCashflow(text,options);
const stockWith=r=>({...structuredClone(stocks.find(s=>s.code===r.code)),fundamentals:{kind:'company',earnings:{period},cashflow:r}});
describe('verified official MOPS current cash flows',()=>{
 it('recomputes real 2317, 6488 and 2330 YTD FCF without mixing units or periods',()=>{
  const rows=parse();expect(rows.map(r=>[r.code,r.amount,r.capex,r.freeCashFlow])).toEqual([['2317',-125723025,161725656,-287448681],['6488',6379662,8875540,-2495878],['2330',2402116725,1289970777,1112145948]]);
  for(const r of rows){expect(r.periodStart).toBe('2026-01-01');expect(r.periodEnd).toBe('2026-09-30');expect(r.announcedOn).toBeNull();expect(r.pointInTimeEligible).toBe(false);expect(r.sourceHash).toMatch(/^[a-f0-9]{64}$/);}
 });
 it('rejects default periods, wrong currencies, wrong company and wrong markets',()=>{
  for(const [from,to]of [['2026Q3','2020Q2'],['新台幣仟元','美元'],['2317&nbsp;','9999&nbsp;']])expect(()=>parse(html.replace(from,to))).toThrow();
  expect(()=>parseCashflow(html,{...options,stocks:stocks.map(s=>({...s,market:'TWSE'}))})).toThrow(/市場/);
 });
 it('does not interpret missing values as zero, invert a positive equipment receipt, or use cash generated before tax',()=>{
  const missing=parse(html.replace('-8,875,540','--')).find(r=>r.code==='6488');expect(missing.capex).toBeNull();expect(missing.freeCashFlow).toBeNull();expect(missing.amount).toBe(6379662);
  const positive=parse(html.replace('-8,875,540','8,875,540')).find(r=>r.code==='6488');expect(positive.capex).toBeNull();
  const other=parse(html.replace('營業活動之淨現金流入（流出）','營運產生之現金流入（流出）'));expect(other.every(r=>r.amount===null&&r.freeCashFlow===null)).toBe(true);
  const zero=parse(html.replace('-8,875,540','0')).find(r=>r.code==='6488');expect(zero.freeCashFlow).toBe(6379662);
 });
 it('skips parent-only financials and rejects shifted rows and duplicate accounts',()=>{
  expect(parse(html.replace('>合併<','>個體<'))).toHaveLength(2);
  expect(()=>parse(html.replace('營業活動之淨現金流入（流出）','取得不動產、廠房及設備'))).toThrow(/重複/);
  expect(()=>parse(html.replace(/<td[^>]*>6,379,662<\/td>/,''))).toThrow(/列數|欄位/);
 });
 it('keeps first-observed versions separate from filing dates and preserves revised numbers',()=>{
  const old=parse()[0],next={...old,amount:0,freeCashFlow:-old.capex,checkedAt:'2026-11-19T16:08:00Z',firstObservedAt:'2026-11-19T16:08:00Z',sourceHash:'new'};
  const updated=updateRecord(old,next);expect(updated.firstObservedAt).toBe(old.firstObservedAt);expect(updated.revisions[0].amount).toBe(-125723025);expect(updated.changedSincePreviousObservation).toBe(true);expect(updated.announcedOn).toBeNull();expect(updateRecord(old,{...old,sourceHash:'changed-html-only'}).revisions).toEqual([]);
 });
 it('checks stock identity, exact accounting scope, period, source URL and FCF arithmetic at display time',()=>{
  const r=parse()[1],s=stockWith(r);expect(cashflowView(s,now).available).toBe(true);
  for(const patch of [{market:'TWSE'},{code:'2330'},{currency:'USD'},{scope:'parent'},{basis:'quarterly'},{periodStart:'2026-07-01'},{periodEnd:'2026-06-30'},{source:reportURL(['2330'],period)},{checkedAt:'2099-01-01'}])expect(cashflowView(stockWith({...r,...patch}),now).available).toBe(false);
  const bad=cashflowView(stockWith({...r,freeCashFlow:0}),now);expect(bad.available).toBe(true);expect(bad.freeCashFlow).toBeNull();
 });
 it('exposes negative current cash flow in analysis while retaining the missing announcement-date gap',()=>{
  const s=stockWith(parse()[0]),result=assessFundamentals(s,{now});
  expect(result.rows.find(r=>r.key==='cash').value).toBe(-125723025);expect(result.rows.find(r=>r.key==='cash').text).toMatch(/-125,723\.03 TWD 百萬元/);
  expect(result.rows.find(r=>r.key==='freeCashFlow').available).toBe(true);expect(result.risks.join()).toMatch(/自由現金流/);expect(result.gaps.join()).toMatch(/未列首次公告日/);
 });
});
describe('bounded free-source configuration and resilience',()=>{
 it('batches across TWSE/TPEX fairly, excludes funds/financials and reuses fresh period caches',()=>{
  const many=Object.fromEntries([...Array.from({length:30},(_,i)=>({...structuredClone(stocks[0]),code:String(1000+i)})),stocks[1],{...stocks[2],securityKind:'etf'},{...stocks[0],code:'9000',fundamentals:{...stocks[0].fundamentals,kind:'financial'}}].map(s=>[s.code,s]));
  const plan=planBatches(many,{records:{},attempts:{}},{now,maxBatches:2});expect(plan).toHaveLength(2);expect(plan.find(b=>b[0].market==='TWSE')).toHaveLength(10);expect(plan.find(b=>b[0].market==='TPEX')[0].code).toBe('6488');expect(plan.flat().some(s=>['2330','9000'].includes(s.code))).toBe(false);
  const cached={records:Object.fromEntries(parse().map(r=>[`${r.market}:${r.code}`,r])),attempts:{}};expect(planBatches(Object.fromEntries(stocks.map(s=>[s.code,s])),cached,{now})).toEqual([]);
  const future=new Date('2026-11-26');expect(planBatches(Object.fromEntries(stocks.map(s=>[s.code,s])),cached,{now:future}).length).toBeGreaterThan(0);
 });
 it('retains original values and timestamps on failure and applies a 24-hour block cooldown',()=>{
  const r=parse()[0],cache={records:{'TWSE:2317':r},attempts:{},warnings:[]},oldDate=r.checkedAt;
  markBatchFailure(cache,[stocks[0]],Object.assign(Error('HTTP 403'),{status:403}),now);expect(cache.blockedUntil).toBe('2026-11-19T16:08:00.000Z');expect(cache.records['TWSE:2317'].checkedAt).toBe(oldDate);
  const u=attachCashflows({stocks:{'2317':structuredClone(stocks[0])}},cache,now);expect(u.stocks['2317'].fundamentals.cashflowStatus.status).toBe('retained');expect(cashflowView(u.stocks['2317'],now).retained).toBe(true);expect(u.financialCoverage.complete).toBe(1);
 });
 it('does not attach another market or prior quarter to a new statement',()=>{
  const r=parse()[0],u=attachCashflows({stocks:{'2317':structuredClone(stocks[0])}},{records:{'TWSE:2317':{...r,periodEnd:'2026-06-30'}},attempts:{}},now);expect(u.stocks['2317'].fundamentals.cashflow).toBeUndefined();expect(u.financialCoverage.covered).toBe(0);
 });
});
