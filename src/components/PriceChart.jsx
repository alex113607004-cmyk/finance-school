import React,{useState} from 'react';
import {format} from '../domain';
import {MA_LINES} from '../technicals.js';
const lines=MA_LINES.filter(line=>!line.alias);
export default function PriceChart({rows,term,kind='candles'}){
 const [limit,setLimit]=useState(50),[selected,setSelected]=useState(null),[visible,setVisible]=useState([5,10,20,60,240]);
 const valid=(rows||[]).filter(r=>Number.isFinite(r.close)&&r.close>0),recent=valid.slice(-limit);
 if(!recent.length)return <p className="empty-copy">尚未取得有效日線資料，請稍後更新或開啟原始來源。</p>;
 const last=recent.at(-1),active=recent.find(r=>r.date===selected)||last;
 const values=recent.flatMap(r=>[r.close,...visible.map(n=>r['ma'+n]),...(kind==='candles'?[r.high,r.low]:[])]).filter(Number.isFinite);
 const min=Math.min(...values),max=Math.max(...values),pad=Math.max((max-min)*.1,max*.005),lo=min-pad,hi=max+pad;
 const x=i=>18+i*670/Math.max(1,recent.length-1),y=v=>20+(hi-v)/(hi-lo)*240,width=Math.max(1.4,Math.min(10,670/recent.length*.55)),index=recent.findIndex(r=>r.date===active.date);
 const points=key=>recent.map((r,i)=>Number.isFinite(r[key])?`${x(i)},${y(r[key])}`:'').join(' ');
 return <div className="native-price-chart">
  <div className="price-chart-options" aria-label="顯示天數">{[20,50,120,240].map(n=><button key={n} className={'secondary '+(n===limit?'selected':'')} onClick={()=>{setLimit(n);setSelected(null)}} aria-pressed={n===limit}>最近 {n} 個交易日</button>)}<span>實際顯示 {recent.length} 筆</span></div>
  <div className="ma-toggles" aria-label="均線顯示">{lines.map(line=><label key={line.period}><input type="checkbox" checked={visible.includes(line.period)} onChange={()=>setVisible(old=>old.includes(line.period)?old.filter(n=>n!==line.period):[...old,line.period])}/><span style={{color:line.color}}>{line.label} MA{line.period}</span></label>)}</div>
  <div className="ma-labels">{lines.map(line=><React.Fragment key={line.period}>{term(line.label)}<b style={{color:line.color}}>{format(active['ma'+line.period])}</b></React.Fragment>)}<small>{active.date} · 未還原 · 新台幣元／股</small></div>
  <svg className="native-chart" viewBox="0 0 790 300" role="img" aria-label={kind==='candles'?'本站日K線與五日、十日、月、季、年均線':'本站收盤價與五日、十日、月、季、年均線'}><title>{kind==='candles'?'依官方每日開高低收繪製的 K 線':'官方每日收盤線'}，非即時資料</title>
   {[0,1,2,3].map(i=>{const v=lo+(hi-lo)*i/3;return <g key={i}><line x1="10" x2="700" y1={y(v)} y2={y(v)} stroke="#293044"/><text x="712" y={y(v)+4}>{format(v)}</text></g>})}
   {kind==='candles'?recent.filter(r=>[r.open,r.high,r.low].every(Number.isFinite)).map(r=>{const i=recent.indexOf(r),color=r.close>r.open?'#ff8c99':r.close<r.open?'#7ad7a6':'#a3adc0';return <g key={r.date}><title>{`${r.date} 開 ${r.open} 高 ${r.high} 低 ${r.low} 收 ${r.close}`}</title><line x1={x(i)} x2={x(i)} y1={y(r.high)} y2={y(r.low)} stroke={color}/><rect x={x(i)-width/2} y={Math.min(y(r.open),y(r.close))} width={width} height={Math.max(1,Math.abs(y(r.open)-y(r.close)))} fill={color}/></g>}):<polyline stroke="#9cbbe5" strokeWidth="2" fill="none" points={points('close')}/>}
   {lines.filter(line=>visible.includes(line.period)).map(line=><polyline key={line.period} data-period={line.period} stroke={line.color} strokeWidth="1.8" fill="none" points={points('ma'+line.period)}/>)}
   <line x1={x(index)} x2={x(index)} y1="10" y2="266" stroke="#8ca9b7" strokeDasharray="3 5" opacity=".55"/><text x="10" y="291">{recent[0].date}</text><text x="700" y="291" textAnchor="end">{last.date}</text>
  </svg>
  <p className="subtle">{kind==='candles'?'紅 K：收高於開；綠 K：收低於開。K 棒紅綠與相對前收漲跌的基準不同。':'藍色線：每日收盤價。'}　五日／週線 MA5、十日 MA10、月 MA20、季 MA60、年 MA240。可勾選顯示各線。</p>
  <div className="price-chart-reading"><label htmlFor="price-day">選取交易日</label><input id="price-day" aria-label="選取交易日" type="range" min="0" max={recent.length-1} value={index} onChange={e=>setSelected(recent[Number(e.target.value)].date)}/><output aria-live="polite">{active.date}　開 {format(active.open)}／高 {format(active.high)}／低 {format(active.low)}／收 {format(active.close)}</output></div>
  <details><summary>查看原始數字與逐日均線</summary><div className="table-scroll"><table><thead><tr><th>交易日</th><th>開盤</th><th>最高</th><th>最低</th><th>收盤</th>{lines.map(line=><th key={line.period}>MA{line.period}</th>)}<th>成交量（股）</th></tr></thead><tbody>{[...recent].reverse().map(r=><tr key={r.date}><td>{r.date}</td><td>{format(r.open)}</td><td>{format(r.high)}</td><td>{format(r.low)}</td><td>{format(r.close)}</td>{lines.map(line=><td key={line.period}>{format(r['ma'+line.period])}</td>)}<td>{format(r.volume,0)}</td></tr>)}</tbody></table></div></details>
 </div>;
}
