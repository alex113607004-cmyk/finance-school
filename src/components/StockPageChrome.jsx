import React from 'react';
import {CandlestickChart,ChartNoAxesCombined,Building2,Calculator,Database} from 'lucide-react';
const sections=[['chart','走勢圖',CandlestickChart],['assessment','價格評估',ChartNoAxesCombined],['fundamentals','基本面',Building2],['valuation','估值試算',Calculator],['sources','資料查核',Database]];
export function SectionNav({fund=false}){
 function jump(id){const target=document.getElementById('stock-'+id);target?.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});target?.focus({preventScroll:true});}
 return <nav className="stock-section-nav" aria-label="個股頁章節">{sections.map(([id,label,Icon])=><button key={id} type="button" onClick={()=>jump(id)}><Icon size={16}/>{fund&&id==='valuation'?'折溢價':fund&&id==='fundamentals'?'基金資料':label}</button>)}</nav>;
}
export function QuickFacts({items,term=t=>t}){
 return <div className="stock-quick-facts" role="group" aria-label="關鍵指標">{items.map(({label,value,unit,note})=><div key={label}><span>{term(label)}</span><strong>{value}<small>{unit}</small></strong><p>{note}</p></div>)}</div>;
}
