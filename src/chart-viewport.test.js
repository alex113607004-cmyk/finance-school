import {describe,it,expect} from 'vitest';
import {latestCandleRange,visibleCandleWindow,preserveCandleRange} from './chart-viewport';
const rows=Array.from({length:150},(_,i)=>({date:new Date(Date.UTC(2025,0,i+1)).toISOString().slice(0,10)}));
describe('K-line viewport and actual data coverage',()=>{
 it('starts at exactly 60 bars and clamps presets to available history',()=>{
  expect(visibleCandleWindow(150,latestCandleRange(150,60))).toEqual({start:90,end:149,count:60});
  expect(visibleCandleWindow(20,latestCandleRange(20,60))).toEqual({start:0,end:19,count:20});
  expect(visibleCandleWindow(150,latestCandleRange(150,5000)).count).toBe(150);
  expect(visibleCandleWindow(6001,latestCandleRange(6001,Infinity)).count).toBe(6001);
  expect(visibleCandleWindow(1,latestCandleRange(1,60)).count).toBe(1);
 });
 it('uses native strict-range rounding for partial edge bars without counting empty future space',()=>{
  expect(visibleCandleWindow(150,{from:20.3,to:108.9})).toEqual({start:20,end:109,count:90});
  expect(visibleCandleWindow(150,{from:-20,to:200})).toEqual({start:0,end:149,count:150});
  expect(visibleCandleWindow(150,{from:90-1e-10,to:149+1e-10}).count).toBe(60);
  for(const range of [null,{from:10,to:9},{from:NaN,to:100},{from:200,to:300}])expect(visibleCandleWindow(150,range).count).toBe(0);
  expect(latestCandleRange(0)).toBeNull();
 });
 it('keeps zoom stable when toggling MAs or receiving equivalent history objects',()=>{
  const range={from:20.3,to:108.9},next=preserveCandleRange(rows,rows.map(r=>({...r})),range);
  expect(next.from).toBeCloseTo(range.from,9);expect(next.to).toBeCloseTo(range.to,9);
 });
 it('preserves historical dates when early data is added/removed and follows new bars only at the latest edge',()=>{
  const old=rows.slice(10),range={from:20,to:79},expanded=preserveCandleRange(old,rows,range);
  expect(rows[visibleCandleWindow(rows.length,expanded).start].date).toBe(old[20].date);
  expect(visibleCandleWindow(rows.length,expanded).count).toBe(60);
  expect(preserveCandleRange(rows.slice(0,-1),rows,latestCandleRange(149,60))).toEqual({from:90,to:149});
  expect(preserveCandleRange(rows,rows.slice(-10),{from:0,to:149})).toEqual({from:0,to:9});
 });
});
