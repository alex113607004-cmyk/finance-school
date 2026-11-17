import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import analysis from './generated/analysis.json';
import {aggregateCandles,calendarPeriod,dailyAverages,trailingEPS,historicalValuation,maPosition,scenario,validCandle} from './stock-analysis';
const entry=analysis.stocks['2330'],filings=entry.filings,history=entry.history;
const quote=history.rows.at(-1),now=new Date(analysis.generatedAt);
const calc=(extra={})=>historicalValuation({quote,history,filings,now,...extra});
describe('point-in-time Taiwanese stock analysis',()=>{
 it('uses four consecutive first-release quarterly EPS, after announcement day only',()=>{
  expect(trailingEPS(filings.reports,'2024-01-18').available).toBe(false);
  expect(trailingEPS(filings.reports,'2024-01-19').eps).toBe(32.34);
  expect(trailingEPS(filings.reports,'2025-01-16').eps).toBe(40.01);
  expect(trailingEPS(filings.reports,'2025-01-17').eps).toBe(45.25);
  expect(trailingEPS(filings.reports,'2026-10-16').eps).toBe(98.26);
  expect(trailingEPS(filings.reports.filter(r=>!(r.year===2026&&r.quarter===2)),'2026-11-17').available).toBe(false);
 });
 it('independently recalculates monthly PEs and interpolated historical valuation from original TWSE responses',()=>{
  const result=calc();expect(result.available,result.reasons.join('；')).toBe(true);expect(result.validSamples.length).toBeGreaterThanOrEqual(34);
  const rawFiles=fs.readdirSync('data/stock-day/2330').filter(f=>f.endsWith('.json'));
  const sourceRows=rawFiles.map(f=>JSON.parse(fs.readFileSync('data/stock-day/2330/'+f)).body.data.at(-1));
  const values=result.validSamples.map(sample=>{
   const raw=sourceRows.find(r=>{const [y,m,d]=r[0].split('/');return `${Number(y)+1911}-${m}-${d}`===sample.date});
   expect(raw).toBeTruthy();const close=Number(raw[6].replaceAll(',',''));
   const available=filings.reports.filter(r=>r.announcedOn<sample.date).slice(-4),sum=available.reduce((s,r)=>s+r.eps,0);
   expect(sample.eps).toBeCloseTo(sum,8);expect(sample.pe).toBeCloseTo(close/sum,8);
   expect(sample.reports.every(r=>r.availableFrom<=sample.date)).toBe(true);
   return close/sum;
  }).sort((a,b)=>a-b);
  const percentile=p=>{const i=(values.length-1)*p;return values[Math.floor(i)]+(i%1)*(values[Math.ceil(i)]-values[Math.floor(i)])};
  expect(result.p25).toBeCloseTo(percentile(.25),10);expect(result.p75).toBeCloseTo(percentile(.75),10);
  expect(result.low).toBeCloseTo(result.ttm.eps*percentile(.25),8);expect(result.high).toBeCloseTo(result.ttm.eps*percentile(.75),8);
 });
 it('independently recomputes all three MAs from raw daily closes before slicing chart range',()=>{
  const days=fs.readdirSync('data/stock-day/2330').filter(f=>f.endsWith('.json')).sort().flatMap(f=>JSON.parse(fs.readFileSync('data/stock-day/2330/'+f)).body.data).filter(r=>{const [y,m,d]=r[0].split('/');return `${Number(y)+1911}-${m}-${d}`<=quote.date});
  const enriched=dailyAverages(history.rows),last=enriched.at(-1);
  for(const n of [5,20,60])expect(last['ma'+n]).toBeCloseTo(days.slice(-n).reduce((s,r)=>s+Number(r[6].replaceAll(',','')),0)/n,8);
  const position=maPosition(quote,history);expect(position.available).toBe(true);expect(position.average).toBe(last.ma20);expect(position.sum/20).toBe(last.ma20);
 });
 it('aggregates real OHLCV without double counting, and flags unfinished week/month and initial truncation',()=>{
  for(const kind of ['week','month']){
   const groups=aggregateCandles(history.rows,kind,{asOf:quote.date,coverageStart:history.coverageStart});
   for(const g of groups){const rows=history.rows.filter(r=>r.date>=g.start&&r.date<=g.end);expect(g.open).toBe(rows[0].open);expect(g.close).toBe(rows.at(-1).close);expect(g.high).toBe(Math.max(...rows.map(r=>r.high)));expect(g.low).toBe(Math.min(...rows.map(r=>r.low)));expect(g.volume).toBe(rows.reduce((s,r)=>s+r.volume,0));}
   expect(groups.at(-1).unfinished).toBe(true);
   expect(aggregateCandles(history.rows,kind,{asOf:'2099-01-01',coverageStart:history.coverageStart}).at(-1).unfinished).toBe(false);
  }
  expect(calendarPeriod('2026-01-01','week')).toEqual({start:'2025-12-29',end:'2026-01-04'});
  expect(aggregateCandles(history.rows.slice(1,5),'week',{asOf:'2099-01-01',coverageStart:history.rows[1].date})[0].truncated).toBe(true);
 });
 it.each([0,-1])('does not apply PE when TTM EPS is %s',eps=>{
  const four=filings.reports.slice(-4),mutated={...filings,reports:[...filings.reports.slice(0,-4),...four.map(r=>({...r,eps:eps/4}))]};
  const result=calc({filings:mutated});expect(result.available).toBe(false);expect(result.reasons.join()).toMatch(/零或負/);
  expect(scenario(eps,15,20).reason).toMatch(/不適用/);
 });
 it('fails closed for insufficient samples, missing sources, stale filings, new quarters and inconsistent basis',()=>{
  expect(calc({minSamples:100}).available).toBe(false);
  expect(calc({history:{...history,partial:true}}).reasons.join()).toMatch(/缺漏/);
  expect(calc({filings:{...filings,basisConfirmed:false}}).reasons.join()).toMatch(/口徑/);
  expect(calc({filings:{...filings,reviewRequired:true}}).available).toBe(false);
  expect(calc({filings:{...filings,checkedAt:null}}).available).toBe(false);
  expect(calc({history:{...history,rows:[...history.rows,history.rows.at(-1)]}}).available).toBe(false);
  // Preserve dated, already verified facts while the following quarter is still in progress.
  expect(calc({filings:{...filings,warnings:['公司公告更新失敗：offline']}}).available).toBe(true);
  expect(calc({filings:{...filings,warnings:['公司公告更新失敗：offline']},now:new Date('2027-01-02')}).reasons.join()).toMatch(/下一季已結束.*查核失敗/);
  expect(calc({expectedPeriod:{year:2099,quarter:1}}).reasons.join()).toMatch(/更新季報/);
  expect(calc({now:new Date('2027-01-02')}).reasons.join()).toMatch(/8 日/);
  expect(maPosition({...quote,date:'2020-01-01'},history).available).toBe(false);
  const broken=[...history.rows.slice(0,-1),{...quote,close:null}];expect(validCandle(broken.at(-1))).toBe(false);expect(dailyAverages(broken).at(-1).ma5).toBeNull();
 });
 it('separates assumptions and rejects blank/invalid/reversed scenario inputs',()=>{
  expect(scenario(10,15,20)).toEqual({available:true,low:150,high:200});
  expect(scenario(0,'','').reason).toMatch(/零或負/);
  for(const v of [['',15,20],[10,21,20],[10,0,20],[Infinity,10,20],[10,NaN,20]])expect(scenario(...v).available).toBe(false);
 });
});
