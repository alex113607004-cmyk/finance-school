import {expect,it} from 'vitest';
import {searchWatchTargets} from './watchlist-search';

// Synthetic catalog fixtures exercise matching; these are not published financial data.
const universe={stocks:{2330:{code:'2330',name:'台積電',market:'TWSE',securityKind:'stock',company:{fullName:'台灣積體電路製造股份有限公司',english:'TSMC'}},6488:{code:'6488',name:'環球晶',market:'TPEX',securityKind:'stock'},'0050':{code:'0050',name:'元大台灣50',market:'TWSE',securityKind:'etf'},ABCD:{code:'ABCD',name:'測試台股',market:'TWSE',securityKind:'stock'}}};
const us={stocks:{'US:AAPL':{code:'AAPL',name:'Apple Inc.',nameZh:'蘋果',market:'NASDAQ',securityKind:'stock'},'US:ABCD':{code:'ABCD',name:'Synthetic US Company',market:'NYSE',securityKind:'stock'}}};

it('searches Taiwan symbols, normalized names, full company names and English aliases',()=>{
 for(const q of ['２３３０','臺積電','台灣積體電路','TSMC'])expect(searchWatchTargets(universe,us,q).items[0].id).toBe('TW:2330');
 expect(searchWatchTargets(universe,us,'環球').items[0]).toMatchObject({id:'TW:6488',market:'TPEX'});
 expect(searchWatchTargets(universe,us,'0050').items[0]).toMatchObject({code:'0050',securityKind:'etf'});
});
it('searches US tickers and Chinese or English names case insensitively',()=>{
 for(const q of [' aapl ','Apple','蘋果','ＡＡＰＬ'])expect(searchWatchTargets(universe,us,q).items[0]).toMatchObject({id:'US:AAPL',region:'US',name:'蘋果',description:'Apple Inc.'});
});
it('preserves separate identities for matching symbols across markets and respects scope',()=>{
 expect(searchWatchTargets(universe,us,'ABCD').items.map(s=>s.id).sort()).toEqual(['TW:ABCD','US:ABCD']);
 expect(searchWatchTargets(universe,us,'ABCD','TW').items.map(s=>s.id)).toEqual(['TW:ABCD']);
 expect(searchWatchTargets(universe,us,'ABCD','US').items.map(s=>s.id)).toEqual(['US:ABCD']);
});
it('does not manufacture targets for empty, unsupported or missing catalogs',()=>{
 for(const q of ['  ','UNKNOWN','999999'])expect(searchWatchTargets(universe,us,q)).toEqual({items:[],hasMore:false});
 expect(searchWatchTargets(null,null,'2330').items).toEqual([]);
});
it('caps broad matches and puts the exact symbol before partial matches',()=>{
 const many={stocks:Object.fromEntries(Array.from({length:15},(_,i)=>{const code=String(2300+i);return [code,{code,name:'測試公司 '+code,market:'TWSE'}]}))};
 const result=searchWatchTargets(many,us,'23');
 expect(result.items).toHaveLength(8);expect(result.hasMore).toBe(true);
 expect(searchWatchTargets(many,us,'2301').items[0].id).toBe('TW:2301');
});
