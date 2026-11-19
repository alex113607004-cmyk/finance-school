import {it,expect,vi} from 'vitest';
import {intradayEndpoint,loadIntraday} from './intraday-client';
it('does not request a source when no backend has been configured',async()=>{const fetcher=vi.fn();expect(await loadIntraday('TW','2330',{fetcher})).toBeNull();expect(fetcher).not.toHaveBeenCalled();});
it('keeps market in the address and rejects credentials, query keys, insecure hosts and unsupported symbols',()=>{
 expect(intradayEndpoint('https://example.com','TW','2330')).toBe('https://example.com/api/intraday?region=TW&symbol=2330');expect(intradayEndpoint('https://example.com','US','2330')).toContain('region=US');
 for(const origin of ['http://example.com','https://key:secret@example.com','https://example.com?key=secret','https://example.com/path'])expect(()=>intradayEndpoint(origin,'TW','2330')).toThrow();
 expect(()=>intradayEndpoint('https://example.com','TW','../secret')).toThrow();
});
it('loads a matching feed without sending browser credentials and reports upstream failures',async()=>{
 const fetcher=vi.fn(async()=>Response.json({schemaVersion:1,intraday:{id:'TW:2330'}}));expect((await loadIntraday('TW','2330',{origin:'https://example.com',fetcher})).id).toBe('TW:2330');expect(fetcher.mock.calls[0][1]).toMatchObject({cache:'no-store',credentials:'omit'});
 await expect(loadIntraday('TW','2330',{origin:'https://example.com',fetcher:async()=>Response.json({schemaVersion:1,intraday:{id:'US:2330'}})})).rejects.toThrow('格式');
 await expect(loadIntraday('TW','2330',{origin:'https://example.com',fetcher:async()=>new Response('',{status:502})})).rejects.toThrow('無法連線');
});

it('sends a separate access password only in an authorization header and recognizes authentication failures',async()=>{
 const password='synthetic-private-access-password-1234567890',fetcher=vi.fn(async()=>Response.json({schemaVersion:1,intraday:{id:'TW:2330'}}));await loadIntraday('TW','2330',{origin:'https://example.com',accessPassword:password,fetcher});expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer '+password);expect(fetcher.mock.calls[0][0]).not.toContain(password);
 await expect(loadIntraday('TW','2330',{origin:'https://example.com',accessPassword:password,fetcher:async()=>new Response('',{status:401})})).rejects.toMatchObject({accessRequired:true});
});
