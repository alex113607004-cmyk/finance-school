import React from 'react';
import TaiwanStockAnalysis from './TaiwanStockAnalysis';
import USStockAnalysis from './USResearchPage';
import {parseAnalysisAddress} from '../security';
import '../stock-analysis.css';
export default function StockAnalysis({param,symbol,term=t=>t}){
 const route=parseAnalysisAddress(param,symbol);
 return route.region==='US'?<USStockAnalysis param={route.symbol} term={term}/>:<TaiwanStockAnalysis param={route.symbol} term={term}/>;
}
