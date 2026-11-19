import {compareMetrics} from './sec-financials.js';
export function researchSnapshotTW(extra,ttm){
 const comparisons=Object.fromEntries(['revenue','netIncome','operatingCashFlow','capex','freeCashFlow'].map(k=>[k,compareMetrics(extra.metrics[k],extra.prior.metrics[k])]));
 return {available:true,checkedAt:extra.checkedAt,latest:extra.latest,prior:extra.prior,ttm,metrics:{...extra.metrics,revenueYoY:comparisons.revenue},comparisons};
}
