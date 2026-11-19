import React,{useId,useMemo,useRef,useState} from 'react';
import {aggregateCandles} from '../stock-analysis';
import {chartIndexAtClientX} from '../chart-interaction';
import {format} from '../domain';
import LightweightCandles from './LightweightCandles';
import {latestCandleRange,visibleCandleWindow} from '../chart-viewport';
const colors={5:'#e6bd7f',20:'#aca6ff',60:'#79c9e4'};
export default function AnalysisChart({history,asOf,term}){
 const [kind,setKind]=useState('day'),[visible,setVisible]=useState([5,20,60]),[viewportRequest,setViewportRequest]=useState({count:60}),[viewport,setViewport]=useState(null),[picked,setPicked]=useState(null),[numbersOpen,setNumbersOpen]=useState(false);
 const pointer=useRef(null),help=useId(),volumeUnit=history?.volumeUnit||'股',adjustmentLabel=history?.adjustment==='split-adjusted'?'已還原分割，未還原股利':history?.adjustment==='dividend-and-split-adjusted'?'已還原股利與分割':'未還原除權息與分割';
 const all=useMemo(()=>aggregateCandles(history?.rows||[],kind,{asOf,coverageStart:history?.coverageStart,partial:history?.partial}),[history?.rows,history?.coverageStart,history?.partial,kind,asOf]);
 const window=viewport?.rows===all&&viewport.kind===kind?viewport:visibleCandleWindow(all.length,latestCandleRange(all.length,viewportRequest.count));
 const rows=useMemo(()=>all.slice(window.start,window.end+1),[all,window.start,window.end]),active=rows.find(r=>r.date===picked)||rows.at(-1),idx=rows.indexOf(active);
 const countChoice=rows.length===all.length?5000:[30,60,120].includes(rows.length)?rows.length:'custom';
 const rangeChanged=next=>setViewport(old=>old?.rows===next.rows&&old.kind===next.kind&&old.start===next.start&&old.end===next.end?old:next);
 if(!rows.length)return <p role="status">尚無完整開高低收與成交量，無法繪製 K 線。</p>;
 const values=rows.flatMap(r=>[r.low,r.high,...(kind==='day'?visible.map(n=>r['ma'+n]):[])]).filter(Number.isFinite),min=Math.min(...values),max=Math.max(...values),pad=Math.max((max-min)*.08,max*.005),lo=min-pad,hi=max+pad;
 const x=i=>18+i*670/Math.max(rows.length-1,1),y=v=>20+(hi-v)/(hi-lo)*240,width=Math.max(1.5,Math.min(12,670/rows.length*.65)),vmax=Math.max(...rows.map(r=>r.volume),1);
 const select=e=>{const i=chartIndexAtClientX(e.clientX,e.currentTarget.getBoundingClientRect(),rows.length);if(i!==null)setPicked(rows[i].date)};
 const end=e=>{if(pointer.current===e.pointerId){pointer.current=null;if(e.currentTarget.hasPointerCapture?.(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}};
 function key(e){const n=e.key==='ArrowLeft'?Math.max(0,idx-1):e.key==='ArrowRight'?Math.min(rows.length-1,idx+1):e.key==='Home'?0:e.key==='End'?rows.length-1:null;if(n!==null){e.preventDefault();setPicked(rows[n].date)}}
 return <div className="analysis-chart" data-visible-count={rows.length} data-total-count={all.length} data-viewport-ready={viewport?.rows===all&&viewport.kind===kind?'true':'false'}>
  <div className="analysis-chart-toolbar"><div className="tab-row" aria-label="K 線週期">{[['day','日 K'],['week','週 K'],['month','月 K']].map(([k,l])=><button key={k} aria-pressed={kind===k} className={kind===k?'selected':''} onClick={()=>{setKind(k);setPicked(null)}}>{l}</button>)}</div><label>顯示根數 <select aria-label="K 棒顯示根數" value={countChoice} onChange={e=>{if(e.target.value==='custom')return;setViewport(null);setViewportRequest({count:e.target.value==='5000'?Infinity:Number(e.target.value)});setPicked(null)}}>{countChoice==='custom'&&<option value="custom">{rows.length} 根</option>}{[30,60,120,5000].map(n=><option key={n} value={n}>{n===5000?`全部（${all.length} 根）`:n+' 根'}</option>)}</select></label></div>
  {kind==='day'?<div className="ma-toggles" aria-label="個股均線開關">{[5,20,60].map(n=><label key={n}><input type="checkbox" checked={visible.includes(n)} onChange={()=>setVisible(v=>v.includes(n)?v.filter(x=>x!==n):[...v,n])}/><span style={{color:colors[n]}}>MA{n}（{n} 日）</span></label>)}{term('均線')}</div>:<p className="subtle">週／月 K 由每日資料彙整，不顯示日均線，避免混淆日數與根數。</p>}
  <div className="analysis-chart-readout" aria-live="polite">
   <b data-testid="candle-date">{active.start}{kind!=='day'&&' ～ '+active.date}</b>
   <div className="chart-ohlc"><span>開 {format(active.open)}</span><span>高 {format(active.high)}</span><span>低 {format(active.low)}</span><span>收 <strong>{format(active.close)}</strong></span></div>
   <span>量 {format(active.volume,0)} {volumeUnit} · {active.count} 個交易日</span>
   {active.unfinished&&<span className="analysis-tag">期中 K 棒 · 尚未結束</span>}
   {active.truncated&&<span>起始週／月未涵蓋完整資料</span>}
   {kind==='day'&&visible.length>0&&<div className="chart-ma-values">{visible.map(n=><span key={n} style={{color:colors[n]}}>MA{n} {format(active['ma'+n])}</span>)}</div>}
  </div>
  {!/jsdom/i.test(navigator.userAgent)?<LightweightCandles rows={all} kind={kind} visible={visible} active={active} onPick={setPicked} onKeyDown={key} viewportRequest={viewportRequest} onViewportChange={rangeChanged} label={`個股${{day:'日',week:'週',month:'月'}[kind]}K 與均線及成交量`} describedBy={help}/>:<>
  <svg className="native-chart interactive-chart analysis-candles" viewBox="0 0 790 300" role="img" tabIndex={0} aria-label={`個股${{day:'日',week:'週',month:'月'}[kind]}K 與均線`} aria-describedby={help} onKeyDown={key} onPointerDown={e=>{if(e.isPrimary===false||e.button!==0)return;pointer.current=e.pointerId;e.currentTarget.setPointerCapture?.(e.pointerId);select(e)}} onPointerMove={e=>{if(pointer.current===e.pointerId)select(e)}} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>
   <title>{history.market==='TPEX'?'櫃買中心':'證交所'}未還原 K 線 · {history.currencyLabel||'新台幣元／股'}</title>{[0,1,2,3].map(i=>{const v=lo+(hi-lo)*i/3;return <g key={i}><line x1="10" x2="700" y1={y(v)} y2={y(v)} stroke="#293044"/><text x="711" y={y(v)+4}>{format(v,0)}</text></g>})}
   {rows.map((r,i)=>{const color=r.close>=r.open?'#ff8c99':'#7ad7a6';return <g key={r.date} data-candle={r.date} opacity={r.unfinished ? .65 : 1}><line x1={x(i)} x2={x(i)} y1={y(r.high)} y2={y(r.low)} stroke={color}/><rect x={x(i)-width/2} y={Math.min(y(r.open),y(r.close))} width={width} height={Math.max(1,Math.abs(y(r.open)-y(r.close)))} fill={color} stroke={r.unfinished?'#e6bd7f':color} strokeDasharray={r.unfinished?'2 2':undefined}/></g>})}
   {kind==='day'&&visible.map(n=>{const segments=[];let current=[];rows.forEach((r,i)=>{if(Number.isFinite(r['ma'+n]))current.push(`${x(i)},${y(r['ma'+n])}`);else if(current.length){segments.push(current);current=[]}});if(current.length)segments.push(current);return segments.map((s,i)=><polyline key={n+'-'+i} data-ma={n} fill="none" stroke={colors[n]} strokeWidth="1.6" points={s.join(' ')}/>)})}
   <line className="analysis-crosshair" data-date={active.date} x1={x(idx)} x2={x(idx)} y1="10" y2="265" stroke="#c1d7e4" strokeDasharray="3 5"/><circle cx={x(idx)} cy={y(active.close)} r="3.8" fill="#bce8d3"/><text x="10" y="290">{rows[0].date}</text><text x="700" y="290" textAnchor="end">{rows.at(-1).date}</text>
  </svg>
  <svg viewBox="0 0 790 100" className="analysis-volume" role="img" aria-label={`同週期成交量（${volumeUnit}）`}><title>成交量單位：{volumeUnit}</title><text x="10" y="12">成交量（{volumeUnit}）</text>{rows.map((r,i)=><rect key={r.date} x={x(i)-width/2} y={85-r.volume/vmax*65} width={width} height={r.volume/vmax*65} fill={r.close>=r.open?'#ff8c99':'#7ad7a6'} opacity=".55"/>)}<line x1={x(idx)} x2={x(idx)} y1="15" y2="88" stroke="#c1d7e4" strokeDasharray="3 5"/><text x="711" y="28">{format(vmax/1000000,1)} 百萬</text><text x="711" y="86">0</text></svg>
  </>}
  <label className="analysis-slider">選取 K 棒<input type="range" aria-label="選取個股 K 棒" min="0" max={rows.length-1} value={idx} onChange={e=>setPicked(rows[Number(e.target.value)].date)}/></label>
  <p id={help} className="subtle chart-help">滾輪縮放 K 線根數，拖曳虛線查看數值；也可用 ← → 選取 K 棒。</p>
  <p className="subtle chart-attribution">圖表使用 <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer">TradingView Lightweight Charts™</a> · <a href="./LICENSE-lightweight-charts.txt" target="_blank" rel="noopener noreferrer">Apache 2.0</a> · <a href="./THIRD-PARTY-NOTICES.txt" target="_blank" rel="noopener noreferrer">NOTICE</a>。</p>
  <details className="chart-method"><summary>價格口徑與圖表操作</summary><p className="subtle">價格與日均線同為{adjustmentLabel}；未還原口徑包含除息／分割跳空。成交量採{volumeUnit}。紅 K 為收盤 ≥ 開盤，綠 K 為收盤低於開盤。週採週一至週日、月採曆月；曆週／月尚未結束時以淡色框標記，不預測未來數值。日線僅含已公布盤後資料。</p><p className="subtle">圖表聚焦後可用 Home／End 跳至首末 K 棒，或使用滑桿選取日期。</p></details>
  {history?.partial&&<p className="notice" role="status">部分月份更新失敗或缺漏；保留原始 K 棒，所有均線與估值判讀暫停，不以插值補齊。</p>}
  <details onToggle={e=>setNumbersOpen(e.currentTarget.open)}><summary>查看 K 棒與均線原始數字（目前 {rows.length} 根）</summary>{numbersOpen&&<div className="table-scroll"><table><thead><tr>{['起日','末交易日','開','高','低','收',`成交量（${volumeUnit}）`,...(kind==='day'?['MA5','MA20','MA60']:['交易日數','狀態'])].map(s=><th key={s}>{s}</th>)}</tr></thead><tbody>{[...rows].reverse().map(r=><tr key={r.date}><td>{r.start}</td><td>{r.date}</td>{['open','high','low','close'].map(k=><td key={k}>{format(r[k])}</td>)}<td>{format(r.volume,0)}</td>{kind==='day'?[5,20,60].map(n=><td key={n}>{format(r['ma'+n])}</td>):<><td>{r.count}</td><td>{r.unfinished?'期中':'已結束'}{r.truncated?'／起始截斷':''}</td></>}</tr>)}</tbody></table></div>}</details>
 </div>;
}
