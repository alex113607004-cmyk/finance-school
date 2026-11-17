// Compatibility import for the previous US page. All routes now share one UI.
import React from 'react';
import StockAnalysis from './StockAnalysis';
export default function UsStockAnalysis({symbol,term}){return <StockAnalysis param="US" symbol={symbol||'AAPL'} term={term}/>;}
