import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {webcrypto} from 'node:crypto';
beforeEach(()=>vi.stubGlobal('crypto',webcrypto));afterEach(()=>vi.unstubAllGlobals());
import {createIntradayWorker,normalizeFugle} from '../worker/intraday.mjs';
const now=new Date('2026-11-19T08:00:00Z'),candles=()=>({symbol:'2330',date:'2026-11-19',exchange:'TWSE',timeframe:'1',data:[{date:'2026-11-19T09:00:00+08:00',open:99,close:100},{date:'2026-11-19T09:01:00+08:00',open:100,close:101}]}),quote=()=>({symbol:'2330',date:'2026-11-19',exchange:'TWSE',openPrice:99,lastTrial:{price:9999}}),origin='https://alex113607004-cmyk.github.io';
const env={FUGLE_API_KEY:'synthetic-private-key',INTRADAY_ALLOWED_ORIGIN:origin,INTRADAY_PERSONAL_USE_CONFIRMED:'true',INTRADAY_ACCESS_PASSWORD:'synthetic-private-access-password-1234567890'};
const request=(region='TW',symbol='2330')=>new Request('https://example.com/api/intraday?region='+region+'&symbol='+symbol,{headers:{Origin:origin,Authorization:'Bearer '+env.INTRADAY_ACCESS_PASSWORD}});
it('normalizes one-minute closes and actual opening price, excluding trial prices',()=>{const r=normalizeFugle(candles(),quote(),'2330',now);expect(r.open).toBe(99);expect(r.rows.map(p=>p.price)).toEqual([100,101]);expect(JSON.stringify(r)).not.toContain('9999');});
it('normalizes OTC and rejects wrong days, codes, exchanges and duplicate minutes',()=>{
 expect(normalizeFugle({...candles(),exchange:'TPEx'},{...quote(),exchange:'TPEx'},'2330',now).exchange).toBe('TPEx');
 for(const changed of [{date:'2026-11-18'},{symbol:'6488'},{exchange:'OTHER'},{timeframe:'5'},{data:[candles().data[0],candles().data[0]]}])expect(()=>normalizeFugle({...candles(),...changed},quote(),'2330',now)).toThrow();
});
it('requires server credentials and explicit personal-use configuration and an independent strong access password before making upstream requests',async()=>{
 const fetcher=vi.fn(),w=createIntradayWorker({fetcher,now:()=>now});for(const changed of [{FUGLE_API_KEY:''},{INTRADAY_PERSONAL_USE_CONFIRMED:'false'},{INTRADAY_ACCESS_PASSWORD:''},{INTRADAY_ACCESS_PASSWORD:'short'},{INTRADAY_ACCESS_PASSWORD:env.FUGLE_API_KEY}])expect((await w.fetch(request(),{...env,...changed})).status).toBe(503);expect(fetcher).not.toHaveBeenCalled();
});
it('sends keys only upstream and returns only normalized private fields with origin-specific CORS and no-store',async()=>{
 const fetcher=vi.fn(async url=>Response.json(url.includes('/candles/')?candles():quote())),w=createIntradayWorker({fetcher,now:()=>now}),r=await w.fetch(request(),env),body=await r.json();expect(body.intraday.open).toBe(99);expect(body.intraday.publicDisplayAllowed).toBe(false);expect(body.intraday.accessScope).toBe('personal-authenticated');expect(JSON.stringify(body)).not.toContain(env.INTRADAY_ACCESS_PASSWORD);expect(fetcher).toHaveBeenCalledTimes(2);expect(fetcher.mock.calls[0][1].headers['X-API-KEY']).toBe(env.FUGLE_API_KEY);expect(JSON.stringify(body)).not.toContain(env.FUGLE_API_KEY);expect(r.headers.get('Access-Control-Allow-Origin')).toBe(origin);expect(r.headers.get('Cache-Control')).toBe('no-store');
});
it('handles unsupported markets, bad symbols, untrusted origins and upstream failures without leaking secrets',async()=>{
 const fetcher=vi.fn(async()=>{throw Error('synthetic-private-key')}),w=createIntradayWorker({fetcher,now:()=>now});expect((await w.fetch(request('US','AAPL'),env)).status).toBe(422);expect((await w.fetch(request('TW','bad/key'),env)).status).toBe(400);expect((await w.fetch(new Request('https://example.com/api/intraday'),env)).status).toBe(403);expect(fetcher).not.toHaveBeenCalled();const r=await w.fetch(request(),env);expect(r.status).toBe(502);expect(await r.text()).not.toContain(env.FUGLE_API_KEY);
});

it('rejects anonymous, wrong-password and query-token requests before reading any Fugle data',async()=>{
 const fetcher=vi.fn(),w=createIntradayWorker({fetcher,now:()=>now});
 for(const headers of [{Origin:origin},{Origin:origin,Authorization:'Bearer incorrect-password'}]){const r=await w.fetch(new Request('https://example.com/api/intraday?region=TW&symbol=2330',{headers}),env);expect(r.status).toBe(401);expect(await r.text()).not.toContain(env.FUGLE_API_KEY);}
 const r=await w.fetch(new Request('https://example.com/api/intraday?region=TW&symbol=2330&password='+env.INTRADAY_ACCESS_PASSWORD,{headers:{Origin:origin}}),env);expect(r.status).toBe(401);expect(fetcher).not.toHaveBeenCalled();
});
it('permits authorization preflight without exposing credentials or requiring a password',async()=>{
 const fetcher=vi.fn(),w=createIntradayWorker({fetcher}),r=await w.fetch(new Request('https://example.com/api/intraday',{method:'OPTIONS',headers:{Origin:origin}}),env);expect(r.status).toBe(204);expect(r.headers.get('Access-Control-Allow-Headers')).toBe('Authorization');expect(r.headers.get('Access-Control-Allow-Origin')).toBe(origin);expect(fetcher).not.toHaveBeenCalled();
});
it('distinguishes provider key errors and exhausted quotas without relaying upstream text',async()=>{
 for(const status of [401,403,429]){const w=createIntradayWorker({fetcher:async()=>new Response('synthetic-private-key',{status}),now:()=>now}),r=await w.fetch(request(),env),body=await r.text();expect(r.status).toBe(status===429?429:502);expect(body).not.toContain(env.FUGLE_API_KEY);expect(body).toContain(status===429?'額度':'認證失敗');}
});
