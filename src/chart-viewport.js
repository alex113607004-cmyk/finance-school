// Match Lightweight Charts' strict range: floor the left logical index and ceil
// the right one (including partial edge bars), excluding non-data whitespace.
export function visibleCandleWindow(length,range){
 if(!length||!range||!Number.isFinite(range.from)||!Number.isFinite(range.to)||range.to<range.from)return {start:0,end:-1,count:0};
 const epsilon=1e-7,start=Math.max(0,Math.floor(range.from+epsilon)),end=Math.min(length-1,Math.ceil(range.to-epsilon));
 return end<start?{start:0,end:-1,count:0}:{start,end,count:end-start+1};
}
export function latestCandleRange(length,count=60){
 if(!length)return null;
 const size=Math.min(length,Math.max(1,Math.floor(count)));
 return {from:length-size,to:length-1};
}
export function preserveCandleRange(previousRows,rows,range){
 if(!rows.length)return null;
 const old=visibleCandleWindow(previousRows.length,range);
 if(!old.count)return latestCandleRange(rows.length);
 const span=Math.min(rows.length-1,range.to-range.from);
 if(!(span>=0))return latestCandleRange(rows.length,old.count);
 const atLatest=range.to>=previousRows.length-1-1e-7;
 const anchor=rows.findIndex(r=>r.date===previousRows[old.start]?.date);
 const proposed=atLatest?rows.length-1-span:anchor>=0?range.from+anchor-old.start:rows.length-1-span;
 const from=Math.max(0,Math.min(proposed,rows.length-1-span));
 return {from,to:from+span};
}
