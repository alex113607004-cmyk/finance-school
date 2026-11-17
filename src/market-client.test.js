import {describe,it,expect,vi} from 'vitest';
import fs from 'node:fs';
import {createMarketClient} from './market-client.js';
import {analyzeTechnicals} from './technicals.js';

const now=()=>new Date('2026-11-17T04:30:00Z');
function setup({failPublication=false,failOfficial=false,failHistory=false}={}){
 const stock=JSON.parse(fs.readFileSync('tests/fixtures/fundamental-2330-20261117.json'));
 const history=JSON.parse(fs.readFileSync('tests/fixtures/annual-2330-20261117.json'));
 const s={generatedAt:'2026-11-17T04:00:36.920Z',stocks:{'2330':stock},histories:{'2330':history}};
 const fetcher=vi.fn(async(url,options)=>{
  const u=new URL(url);
  if(u.pathname.endsWith('market-data.json')){if(failPublication)throw new Error('offline');return Response.json(s);}
  if(u.pathname.endsWith('BWIBBU_d')){
   if(failOfficial)throw new Error('offline');
   const date=u.searchParams.get('date');return Response.json({stat:'OK',date,data:[['2330','台積電',date==='20261116'?'2215':'2350','0.99','114',date==='20261116'?'22.54':'23.92','8.21','115/3']]});
  }
  if(u.pathname.endsWith('STOCK_DAY')){
   if(failHistory)throw new Error('offline');
   const ym=u.searchParams.get('date').slice(0,6),iso=ym.slice(0,4)+'-'+ym.slice(4);
   return Response.json({stat:'OK',data:history.rows.filter(r=>r.date.startsWith(iso)).map(r=>[`${Number(r.date.slice(0,4))-1911}/${r.date.slice(5,7)}/${r.date.slice(8)}`,r.volume,0,r.open,r.high,r.low,r.close])});
  }
  throw new Error('Unexpected URL');
 });
 const client=createMarketClient({snapshot:s,fetcher,now,baseUrl:'https://example.test/finance-school/'});
 return {s,client,fetcher};
}
describe('refresh each visit without exposing GitHub credentials',()=>{
 it('performs one deduplicated visit update, using no-store and preserving real financial source times',async()=>{
  const {client,fetcher,s}=setup();const first=client.refreshVisit();expect(client.refreshVisit()).toBe(first);await first;
  expect(fetcher).toHaveBeenCalledTimes(3);expect(client.getState().phase).toBe('ready');
  expect(client.getState().snapshot.stocks['2330'].sourceChecks.earnings).toBe(s.stocks['2330'].sourceChecks.earnings);
  expect(fetcher.mock.calls[0][0]).toMatch(/^https:\/\/example.test\/finance-school\/market-data.json\?visit=/);
  for(const [,options]of fetcher.mock.calls){expect(options.cache).toBe('no-store');expect(options.credentials).toBe('omit');expect(options.headers).toBeUndefined();}
  await client.refreshVisit();expect(fetcher).toHaveBeenCalledTimes(3);
  await client.refreshVisit({force:true});expect(fetcher).toHaveBeenCalledTimes(6);
  const other=setup();await other.client.refreshVisit();expect(other.fetcher).toHaveBeenCalledTimes(3);
 });
 it('refreshes current and previous months on a visit and recomputes the complete annual average',async()=>{
  const {client,fetcher,s}=setup();const result=await client.refreshStock('2330');
  const historyCalls=fetcher.mock.calls.filter(([url])=>new URL(url).pathname.endsWith('STOCK_DAY'));
  expect(historyCalls).toHaveLength(2);expect(result.history.partial).toBe(false);
  const rows=result.history.rows;
  expect(rows.at(-1).ma240).toBeCloseTo(rows.slice(-240).reduce((sum,r)=>sum+r.close,0)/240,10);
  expect(result.stock.quote.date).toBe(rows.at(-1).date);
  const oldURL=result.history.sources.at(-1);expect(result.history.sourceChecks[oldURL]).toBe(s.histories['2330'].sourceChecks[oldURL]);
  await client.refreshStock('2330');expect(fetcher).toHaveBeenCalledTimes(5);
  await client.refreshStock('2330',{force:true});expect(fetcher).toHaveBeenCalledTimes(10);
 });
 it('preserves data and exposes failed upstream refreshes instead of relabeling old financial data',async()=>{
  const {client,s}=setup({failPublication:true,failOfficial:true});const result=await client.refreshStock('2330');
  expect(client.getState().phase).toBe('partial');expect(result.stock.warnings.join()).toContain('失敗');
  expect(result.stock.sourceChecks.earnings).toBe(s.stocks['2330'].sourceChecks.earnings);
 });
 it('suppresses all averages and the composite conclusion after a failed monthly refresh',async()=>{
  const {client}=setup({failHistory:true});const result=await client.refreshStock('2330');
  expect(result.history.partial).toBe(true);expect(result.history.rows.at(-1).ma240).toBeNull();
  expect(analyzeTechnicals(result.history,result.stock,now()).status).toBe('insufficient');
 });
});
