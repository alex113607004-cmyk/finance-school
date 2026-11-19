import {it,expect,vi} from 'vitest';
import {loadMarketOverview} from './overview-client';
const now=()=>new Date('2026-11-19T06:00:00Z');
const snapshot=()=>({schemaVersion:1,markets:{TWSE:{date:'2026-11-18'}},stocks:[{id:'TW:TWSE:2330',code:'2330',market:'TWSE',type:'stock',date:'2026-11-18',close:2175,volume:100,turnover:200,limit:{status:'unavailable'}}]});
it('loads a cache-bypassed same-origin snapshot under the Pages repository path',async()=>{const fetcher=vi.fn(async()=>Response.json(snapshot()));expect((await loadMarketOverview({baseUrl:'https://example.com/finance-school/',fetcher,now})).stocks).toHaveLength(1);expect(fetcher.mock.calls[0][0]).toMatch(/^https:\/\/example.com\/finance-school\/market-overview-data.json\?visit=/);});
it('rejects source failures, invalid identities, future/invalid dates and mixed report dates',async()=>{
 await expect(loadMarketOverview({baseUrl:'https://example.com/',fetcher:async()=>new Response('',{status:503}),now})).rejects.toThrow(/503/);
 for(const patch of [{id:'US:2330'},{date:'2026-11-17'},{date:'2099-01-01'},{date:'2026-99-99'},{close:null},{close:'2175'},{volume:null},{type:'warrant'},{limit:null}]){const s=snapshot();Object.assign(s.stocks[0],patch);await expect(loadMarketOverview({baseUrl:'https://example.com/',fetcher:async()=>Response.json(s),now})).rejects.toThrow(/格式|日期/);}
});
