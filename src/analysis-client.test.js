import {describe,it,expect,vi} from 'vitest';
import {createAnalysisClient,quoteFromHistory,mergeHistory} from './analysis-client';
const now=()=>new Date('2026-11-17T08:00:00Z'),baseUrl='https://school.example/finance-school/';
const stock={code:'6488',name:'環球晶',market:'TPEX'};
describe('all-market analysis loader',()=>{
 it('loads OTC history through the repository path and deduplicates concurrent requests',async()=>{
  const h={code:'6488',market:'TPEX',rows:[],sources:[],fetchedAt:now().toISOString()};const fetcher=vi.fn(async u=>{expect(String(u)).toBe(baseUrl+'stock-history/TPEX/6488.json');return Response.json(h);});
  const client=createAnalysisClient({fetcher,baseUrl,now});await Promise.all([client.loadHistory(stock),client.loadHistory(stock)]);expect(fetcher).toHaveBeenCalledTimes(1);
 });
 it('fails on a wrong-symbol response instead of displaying another stock',async()=>{
  const client=createAnalysisClient({fetcher:async()=>Response.json({code:'2330',market:'TPEX',rows:[]}),baseUrl,now});await expect(client.loadHistory(stock)).rejects.toThrow(/識別/);
 });
 it('loads listed history by official month and clips requests before first listing',async()=>{
  const fetcher=vi.fn(async u=>Response.json({stat:'OK',title:'2330 台積電',data:[['115/11/17','1000','100000','100','105','95','101','除息']]}));
  const c=createAnalysisClient({fetcher,baseUrl,now});const h=await c.loadHistory({code:'2330',market:'TWSE',company:{listed:'2026-11-10'}});expect(fetcher).toHaveBeenCalledTimes(1);expect(h.rows[0].change).toBeNull();expect(h.rows[0].source).toContain('stockNo=2330');
 });
 it('does not manufacture OHLC from emerging-stock averages',async()=>{
  const fetcher=vi.fn(),c=createAnalysisClient({fetcher,baseUrl,now}),h=await c.loadHistory({code:'1260',market:'ESB'});expect(h.rows).toEqual([]);expect(h.reason).toContain('假 K');expect(fetcher).not.toHaveBeenCalled();
 });
 it('uses official change rather than simple close-to-close difference across ex-dividend days',()=>{
  const s={code:'2330',market:'TWSE',quote:{date:'2026-11-16',close:110},sources:{},sourceChecks:{}};
  const h={sources:[{url:'source',checkedAt:'2026-11-17'}],rows:[{date:'2026-11-17',open:100,high:102,low:99,close:101,volume:1000,change:1,source:'source'}]};
  const q=quoteFromHistory(s,h).quote;expect(q.change).toBe(1);expect(q.changePercent).toBe(1);expect(q.change).not.toBe(-9);
 });
 it('merges only own-symbol histories and keeps earlier audited coverage',()=>{
  const a={code:'2330',coverageStart:'2024-01-01',rows:[{date:'2024-01-02',close:100}],sources:[],completeMonths:['2024-01']},b={code:'2330',coverageStart:'2026-10-01',rows:[{date:'2026-11-17',close:200}],sources:[],completeMonths:['2026-10']};
  const h=mergeHistory(a,b);expect(h.coverageStart).toBe('2024-01-01');expect(h.rows).toHaveLength(2);expect(mergeHistory(a,{...b,code:'6488'}).code).toBe('6488');expect(mergeHistory(a,{...b,code:'6488'}).rows).toHaveLength(1);
 });
});
