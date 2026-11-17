import React from 'react';
import TaiwanStockAnalysis from './TaiwanStockAnalysis';
import USStockAnalysis from './USResearchPage';
import {parseAnalysisAddress,analysisHref} from '../security';
import '../stock-analysis.css';
export default function StockAnalysis({param,symbol,term=t=>t}){
 const route=parseAnalysisAddress(param,symbol);
 return <><nav className="analysis-market-switch" aria-label="個股分析市場"><span>研究市場</span>{[['TW','台股','2330'],['US','美股','AAPL']].map(([region,label,code])=><a key={region} aria-current={route.region===region?'page':undefined} className={route.region===region?'selected':''} href={analysisHref(region,route.region===region?route.symbol:code)}>{label} <small>{region}</small></a>)}</nav>{route.region==='US'?<USStockAnalysis param={route.symbol} term={term}/>:<TaiwanStockAnalysis param={route.symbol} term={term}/>}</>;
}
