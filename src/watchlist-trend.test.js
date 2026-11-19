import {it,expect} from 'vitest';
import {watchTrend,miniGeometry} from './watchlist-trend';
const now=new Date('2026-11-19T08:00:00Z');
const stock=()=>({code:'2330',quote:{open:99,high:102,low:98,close:100,date:'2026-11-19',currency:'TWD'}});
const feed=()=>({id:'TW:2330',date:'2026-11-19',currency:'TWD',publicDisplayAllowed:true,source:'https://example.com/synthetic-feed',provider:'Synthetic test data',basis:'unadjusted',regularSession:true,open:99,sessionStart:'2026-11-19T09:00:00+08:00',sessionEnd:'2026-11-19T13:30:00+08:00',rows:[{time:'2026-11-19T01:00:00Z',price:100},{time:'2026-11-19T01:01:00Z',price:101}]});
const trend=(changed={})=>watchTrend({...stock(),intraday:{...feed(),...changed}},null,{now});
it('does not replace the requested intraday curve with OHLC ranges or historical daily closes',()=>{
 expect(watchTrend(stock(),null,{now}).mode).toBe('missing');
 expect(watchTrend(stock(),{rows:[{date:'2026-11-18',close:90},{date:'2026-11-19',close:100}]},{now}).mode).toBe('missing');
});
it('uses current session points and the sourced opening price independently of an older daily quote',()=>{
 const s={...stock(),quote:{...stock().quote,date:'2026-11-18'},intraday:feed()},r=watchTrend(s,null,{now});expect(r.mode).toBe('intraday');expect(r.open).toBe(99);expect(r.points.map(p=>p.value)).toEqual([100,101]);expect(r.label).toBe('今日分時');
});
it('rejects wrong identities, dates, currencies, rights, adjustment basis, ordering and missing opening prices',()=>{
 for(const changes of [{id:'US:2330'},{publicDisplayAllowed:false},{date:'2026-11-18'},{currency:'USD'},{basis:'split-adjusted'},{regularSession:false},{source:'javascript:bad()'},{open:0},{open:null},{rows:[...feed().rows].reverse()},{rows:[feed().rows[0],feed().rows[0]]},{rows:[feed().rows[0]]}])expect(trend(changes).mode,JSON.stringify(changes)).toBe('missing');
});
it('rejects future and out-of-session points instead of moving them into the current curve',()=>{
 for(const time of ['2026-11-19T09:00:00Z','2026-11-19T00:59:00Z','2026-11-19T05:31:00Z','2026-11-18T01:00:00Z'])expect(trend({rows:[feed().rows[0],{time,price:102}]}).mode).toBe('missing');
 expect(trend({sessionStart:'2026-11-19T08:00:00+08:00'}).mode).toBe('missing');
});
it('scales the opening baseline with the prices and leaves the untraded part of the session empty',()=>{
 const r=trend({open:120}),g=miniGeometry(r);expect(g.openY).toBeGreaterThan(0);expect(g.openY).toBeLessThan(40);expect(g.x(r.points.at(-1).time)).toBeLessThan(5);expect(g.x(r.end)).toBe(116);expect(g.path).not.toMatch(/NaN|Infinity/);expect(g.y(120)).toBe(g.openY);
});
it('renders flat intraday prices with a finite baseline at the same height',()=>{
 const r=trend({open:100,rows:feed().rows.map(p=>({...p,price:100}))}),g=miniGeometry(r);expect(g.path).not.toMatch(/NaN|Infinity/);expect(g.openY).toBe(g.y(100));
});
it('removes the previous day curve after the market date changes',()=>{
 expect(watchTrend({...stock(),intraday:feed()},null,{now:new Date('2026-11-19T16:01:00Z')}).mode).toBe('missing');
});
it('accepts private data only in an authenticated private view without claiming public display rights',()=>{
 const intraday={...feed(),publicDisplayAllowed:false,accessScope:'personal-authenticated'};expect(watchTrend({...stock(),intraday},null,{now}).mode).toBe('missing');expect(watchTrend({...stock(),intraday,intradayAuthenticated:true},null,{now}).mode).toBe('intraday');
});
