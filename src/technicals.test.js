import {describe,it,expect} from 'vitest';
import {analyzeTechnicals,combineAnalysis} from './technicals.js';
import {analyzeFundamentals} from './fundamentals.js';
import {enrichHistoryRows,completedHistoryRows} from '../worker/runtime.mjs';
import fs from 'node:fs';

const now=new Date('2026-11-17T04:30:00Z');
function history(count=260,price=i=>100+i){
 const dates=[];const day=new Date('2026-11-16T00:00:00Z');
 while(dates.length<count){if(![0,6].includes(day.getUTCDay()))dates.unshift(day.toISOString().slice(0,10));day.setUTCDate(day.getUTCDate()-1);}
 return {code:'2330',fetchedAt:'2026-11-17T04:00:00Z',partial:false,rows:dates.map((date,i)=>({date,close:price(i),open:price(i),high:price(i),low:price(i),volume:100}))};
}
const quote=h=>({code:'2330',quote:{date:h.rows.at(-1).date,close:h.rows.at(-1).close}});
describe('complete moving-average evidence',()=>{
 it('independently recomputes five distinct averages, slopes and bias using the weekly label',()=>{
  const h=history(),r=analyzeTechnicals(h,quote(h),now),last=359;
  expect(r.status).toBe('support');expect(r.metrics).toHaveLength(5);expect(r.above).toBe(5);
  for(const metric of r.metrics){
   const expected=h.rows.slice(-metric.period).reduce((sum,row)=>sum+row.close,0)/metric.period;
   expect(metric.value).toBeCloseTo(expected,10);expect(metric.slope).toBeCloseTo(1,10);
   expect(metric.bias).toBeCloseTo((last/expected-1)*100,10);
  }
  expect(r.metrics.find(x=>x.label==='週線').period).toBe(5);expect(r.metrics.find(x=>x.label==='五日線')).toBeUndefined();
 });
 it('requires 240 closes for an annual average and 241 for its slope',()=>{
  const short=history(239),just=history(240),complete=history(241);
  expect(enrichHistoryRows(short.rows).at(-1).ma240).toBeNull();
  const r=analyzeTechnicals(just,quote(just),now);expect(r.metrics.at(-1).value).not.toBeNull();expect(r.metrics.at(-1).slope).toBeNull();expect(r.status).toBe('insufficient');
  expect(analyzeTechnicals(complete,quote(complete),now).status).toBe('support');
 });
 it('does not include an unfinished current trading day or future rows in daily averages',()=>{
  const h=history();h.rows.push({...h.rows.at(-1),date:'2026-11-17',close:500});
  expect(completedHistoryRows(h.rows,now).at(-1).date).toBe('2026-11-16');
  expect(completedHistoryRows(h.rows,new Date('2026-11-17T06:00:00Z')).at(-1).date).toBe('2026-11-17');
 });
 it('separates falling trends, conflicting lines, flat prices and an extended entry',()=>{
  const falling=history(260,i=>500-i),flat=history(260,()=>100),extended=history(260,i=>i===259?420:100+i);
  expect(analyzeTechnicals(falling,quote(falling),now).status).toBe('caution');
  expect(analyzeTechnicals(flat,quote(flat),now).status).toBe('mixed');
  const r=analyzeTechnicals(extended,quote(extended),now);expect(r.status).toBe('extended');expect(r.bias20).toBeGreaterThan(10);
 });
 it('blocks conclusions for stale, partial, split-like, mismatched and failed history',()=>{
  for(const change of [
   h=>h.partial=true,h=>h.refreshFailed=true,h=>h.fetchedAt='2026-11-10T04:00:00Z',
   h=>h.code='2317',h=>h.rows.at(-1).close*=.5,h=>h.rows.push({...h.rows.at(-1)}),
  ]){const h=history(),q=quote(h);change(h);expect(analyzeTechnicals(h,q,now).status).toBe('insufficient');}
  const h=history();h.partial=true;expect(analyzeTechnicals(h,quote(h),now).metrics.every(x=>x.value===null)).toBe(true);
 });
 it('combines fundamentals and technical conditions so neither can independently produce a full candidate',()=>{
  const h=history(),technical=analyzeTechnicals(h,quote(h),now);
  const data=JSON.parse(fs.readFileSync('tests/fixtures/fundamental-2330-20261117.json'));data.valuation.pe=20;
  const f=analyzeFundamentals(data,now);expect(f.status).toBe('candidate');
  expect(combineAnalysis(f,technical).status).toBe('candidate');
  expect(combineAnalysis(f,{...technical,status:'mixed'}).status).toBe('watch');
  expect(combineAnalysis(f,{...technical,status:'insufficient',gaps:['年線不足']}).status).toBe('insufficient');
  expect(combineAnalysis({...f,status:'watch'},technical).status).toBe('watch');
  expect(combineAnalysis({...f,status:'special'},technical).status).toBe('special');
 });
});
