export const format=(n,d=2)=>Number.isFinite(n)?n.toLocaleString('zh-TW',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
