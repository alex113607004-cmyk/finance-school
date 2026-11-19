import React from 'react';
import {render,act} from '@testing-library/react';
import {it,expect,vi,beforeEach} from 'vitest';
const mock=vi.hoisted(()=>({charts:[]}));
vi.mock('lightweight-charts',()=>({
 CandlestickSeries:'candles',HistogramSeries:'volume',LineSeries:'MA',CrosshairMode:{Normal:0},LineStyle:{Dashed:2},
 createChart:vi.fn((host,options)=>{
  let range=null;const listeners=new Set();
  const scale={setVisibleLogicalRange:vi.fn(next=>{range=next;listeners.forEach(cb=>cb(next));}),getVisibleLogicalRange:()=>range,subscribeVisibleLogicalRangeChange:vi.fn(cb=>listeners.add(cb)),unsubscribeVisibleLogicalRangeChange:vi.fn(cb=>listeners.delete(cb)),coordinateToTime:()=>null};
  const series=[];const chart={options,series,scale,timeScale:()=>scale,addSeries:vi.fn(type=>{const s={type,setData:vi.fn(),priceScale:()=>({applyOptions:vi.fn()})};series.push(s);return s;}),subscribeCrosshairMove:vi.fn(),unsubscribeCrosshairMove:vi.fn(),setCrosshairPosition:vi.fn(),remove:vi.fn()};
  mock.charts.push(chart);return chart;
 })
}));
import LightweightCandles from './LightweightCandles';
const rows=Array.from({length:150},(_,i)=>({date:new Date(Date.UTC(2025,0,i+1)).toISOString().slice(0,10),open:100+i,high:102+i,low:99+i,close:101+i,volume:1000,ma5:100+i,ma20:99+i,ma60:98+i}));
const props=()=>({rows,kind:'day',visible:[5,20,60],active:rows.at(-1),onPick:vi.fn(),onViewportChange:vi.fn(),viewportRequest:{count:60},label:'K線'});
beforeEach(()=>{mock.charts.length=0;});
it('loads the entire real history and applies a 60-bar viewport instead of trimming the dataset',()=>{
 const p=props();render(<LightweightCandles {...p}/>);const chart=mock.charts[0];
 expect(chart.series[0].setData.mock.calls[0][0]).toHaveLength(150);expect(chart.series[0].setData.mock.calls[0][0][0].time).toBe(rows[0].date);
 expect(chart.scale.setVisibleLogicalRange).toHaveBeenLastCalledWith({from:90,to:149});
 expect(chart.options.handleScale.mouseWheel).toBe(true);expect(chart.options.handleScale.pinch).toBe(true);expect(chart.options.handleScroll.pressedMouseMove).toBe(false);
});
it('reports arbitrary native zoom counts without recreating the chart on crosshair or callback updates',()=>{
 const p=props(),{rerender}=render(<LightweightCandles {...p}/>),chart=mock.charts[0];
 act(()=>chart.scale.setVisibleLogicalRange({from:20.3,to:108.9}));expect(p.onViewportChange).toHaveBeenLastCalledWith(expect.objectContaining({start:20,end:109,count:90}));
 rerender(<LightweightCandles {...p} active={rows[80]} onViewportChange={vi.fn()}/>);
 expect(mock.charts).toHaveLength(1);expect(chart.scale.getVisibleLogicalRange()).toEqual({from:20.3,to:108.9});
});
it('keeps the zoom when toggling MAs and lets an explicit preset restore the latest range',()=>{
 const p=props(),{rerender,unmount}=render(<LightweightCandles {...p}/>),old=mock.charts[0];
 act(()=>old.scale.setVisibleLogicalRange({from:20.3,to:108.9}));
 const visible=[5,60];rerender(<LightweightCandles {...p} visible={visible}/>);const chart=mock.charts[1];
 expect(chart.scale.getVisibleLogicalRange().from).toBeCloseTo(20.3,9);expect(chart.scale.getVisibleLogicalRange().to).toBeCloseTo(108.9,9);expect(old.remove).toHaveBeenCalled();expect(old.scale.unsubscribeVisibleLogicalRangeChange).toHaveBeenCalled();
 rerender(<LightweightCandles {...p} visible={visible} viewportRequest={{count:60}}/>);expect(chart.scale.getVisibleLogicalRange()).toEqual({from:90,to:149});
 rerender(<LightweightCandles {...p} visible={visible} viewportRequest={{count:5000}}/>);expect(chart.scale.getVisibleLogicalRange()).toEqual({from:0,to:149});
 unmount();expect(chart.remove).toHaveBeenCalled();
});
