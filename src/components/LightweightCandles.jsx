import React,{useEffect,useRef} from 'react';
import {createChart,CandlestickSeries,HistogramSeries,LineSeries,CrosshairMode,LineStyle} from 'lightweight-charts';
const asDate=time=>typeof time==='string'?time:time?`${time.year}-${String(time.month).padStart(2,'0')}-${String(time.day).padStart(2,'0')}`:null;
const colors={5:'#e6bd7f',20:'#aca6ff',60:'#79c9e4'};
export default function LightweightCandles({rows,kind,visible,active,onPick,onKeyDown,label,describedBy}){
 const host=useRef(),api=useRef(),callback=useRef(onPick);callback.current=onPick;
 useEffect(()=>{
  const chart=createChart(host.current,{height:430,autoSize:true,localization:{locale:'zh-TW'},layout:{background:{color:'#101a26'},textColor:'#91a4b6',attributionLogo:true},grid:{vertLines:{color:'#1f2c3b'},horzLines:{color:'#1f2c3b'}},crosshair:{mode:CrosshairMode.Normal,vertLine:{style:LineStyle.Dashed,color:'#c1d7e4'},horzLine:{style:LineStyle.Dashed,color:'#c1d7e4'}},timeScale:{borderColor:'#334155',rightOffset:3},rightPriceScale:{borderColor:'#334155'},handleScroll:{mouseWheel:false,pressedMouseMove:false,horzTouchDrag:false,vertTouchDrag:false},handleScale:{axisPressedMouseMove:true,mouseWheel:true,pinch:true},trackingMode:{exitMode:0}});
  const candles=chart.addSeries(CandlestickSeries,{upColor:'#ff8c99',downColor:'#7ad7a6',wickUpColor:'#ff8c99',wickDownColor:'#7ad7a6',borderVisible:false});
  candles.priceScale().applyOptions({scaleMargins:{top:.07,bottom:.28}});
  candles.setData(rows.map(r=>({time:r.date,open:r.open,high:r.high,low:r.low,close:r.close,...r.unfinished?{color:'#b99369',wickColor:'#e6bd7f',borderColor:'#e6bd7f'}:{}})));
  const volume=chart.addSeries(HistogramSeries,{priceFormat:{type:'volume'},priceScaleId:'volume',lastValueVisible:false,priceLineVisible:false});
  volume.priceScale().applyOptions({scaleMargins:{top:.81,bottom:0}});
  volume.setData(rows.map(r=>({time:r.date,value:r.volume,color:r.close>=r.open?'#ff8c9966':'#7ad7a666'})));
  if(kind==='day')for(const n of visible){const line=chart.addSeries(LineSeries,{color:colors[n],lineWidth:1,priceLineVisible:false,lastValueVisible:false,crosshairMarkerVisible:false});line.setData(rows.map(r=>Number.isFinite(r['ma'+n])?{time:r.date,value:r['ma'+n]}:{time:r.date}));}
  chart.timeScale().fitContent();
  const pick=param=>{if(param.time){const date=asDate(param.time);callback.current(date);}};
  chart.subscribeCrosshairMove(pick);
  // Touch and mouse dragging select a bar directly, without requiring a long press.
  const move=e=>{if(e.pointerType!=='touch'&&e.type!=='pointerdown'&&e.buttons!==1)return;const rect=host.current.getBoundingClientRect(),time=chart.timeScale().coordinateToTime(e.clientX-rect.left);if(time){const row=rows.find(r=>r.date===asDate(time));if(row){chart.setCrosshairPosition(row.close,row.date,candles);callback.current(row.date);}}};
  const element=host.current;element.addEventListener('pointerdown',move);element.addEventListener('pointermove',move);api.current={chart,candles};
  return()=>{api.current=null;element.removeEventListener('pointerdown',move);element.removeEventListener('pointermove',move);chart.unsubscribeCrosshairMove(pick);chart.remove();};
 },[rows,kind,visible]);
 useEffect(()=>{if(active&&api.current)api.current.chart.setCrosshairPosition(active.close,active.date,api.current.candles);},[active]);
 return <div ref={host} className="lightweight-chart" role="img" tabIndex={0} aria-label={label} aria-describedby={describedBy} onKeyDown={onKeyDown}/>;
}
