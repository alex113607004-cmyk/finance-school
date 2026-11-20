import {renderHook,waitFor,act} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import {useIntraday} from './use-intraday';
const items=[{id:'TW:2330'}];
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
it('clears an earlier curve after a failed refresh instead of treating it as current',async()=>{
 vi.stubEnv('VITE_INTRADAY_API_ORIGIN','https://example.com');vi.stubGlobal('fetch',vi.fn(async()=>Response.json({schemaVersion:1,intraday:{id:'TW:2330',date:'2026-11-19'}})));
 const {result,rerender}=renderHook(({revision})=>useIntraday(items,true,revision,'synthetic-private-access-password-1234567890'),{initialProps:{revision:0}});await waitFor(()=>expect(result.current.stocks['TW:2330']).toBeTruthy());
 vi.stubGlobal('fetch',vi.fn(async()=>{throw Error('offline');}));rerender({revision:1});await waitFor(()=>expect(result.current.warning).toContain('offline'));expect(result.current.stocks).toEqual({});expect(result.current.busy).toBe(false);
});
it('finishes the loading state when the last item is removed and ignores an abandoned response',async()=>{
 vi.stubEnv('VITE_INTRADAY_API_ORIGIN','https://example.com');let resolve;vi.stubGlobal('fetch',vi.fn(()=>new Promise(r=>{resolve=r;})));
 const {result,rerender}=renderHook(({saved})=>useIntraday(saved,true,0,'synthetic-private-access-password-1234567890'),{initialProps:{saved:items}});await waitFor(()=>expect(result.current.busy).toBe(true));rerender({saved:[]});await waitFor(()=>expect(result.current.busy).toBe(false));
 await act(async()=>resolve(Response.json({schemaVersion:1,intraday:{id:'TW:2330'}})));expect(result.current.stocks).toEqual({});
});
it('does not load intraday data while the sidebar is closed',()=>{
 vi.stubEnv('VITE_INTRADAY_API_ORIGIN','https://example.com');const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);renderHook(()=>useIntraday(items,false,0));expect(fetcher).not.toHaveBeenCalled();
});

it('does not request any data before unlocking and clears data immediately after locking',async()=>{
 vi.stubEnv('VITE_INTRADAY_API_ORIGIN','https://example.com');const fetcher=vi.fn(async()=>Response.json({schemaVersion:1,intraday:{id:'TW:2330'}}));vi.stubGlobal('fetch',fetcher);
 const {result,rerender}=renderHook(({password})=>useIntraday(items,true,0,password),{initialProps:{password:''}});expect(fetcher).not.toHaveBeenCalled();rerender({password:'synthetic-private-access-password-1234567890'});await waitFor(()=>expect(result.current.stocks['TW:2330']).toBeTruthy());rerender({password:''});await waitFor(()=>expect(result.current.stocks).toEqual({}));expect(result.current.busy).toBe(false);
});
it('stops additional batches after a rejected access password',async()=>{
 vi.stubEnv('VITE_INTRADAY_API_ORIGIN','https://example.com');const fetcher=vi.fn(async()=>new Response('',{status:401}));vi.stubGlobal('fetch',fetcher);
 const many=Array.from({length:10},(_,i)=>({id:'TW:'+String(2330+i)})),{result}=renderHook(()=>useIntraday(many,true,0,'synthetic-private-access-password-1234567890'));await waitFor(()=>expect(result.current.warning).toContain('密碼不正確'));expect(fetcher).toHaveBeenCalledTimes(3);expect(result.current.stocks).toEqual({});
});
it('loads local-only quotes without any access password and clears them when the local key is removed',async()=>{
 const meta=document.createElement('meta');meta.name='finance-school-mode';meta.content='local';document.head.append(meta);vi.stubGlobal('location',{hostname:'127.0.0.1',origin:'http://127.0.0.1:4178'});const fetcher=vi.fn(async()=>Response.json({schemaVersion:1,intraday:{id:'TW:2330',accessScope:'local-only'}}));vi.stubGlobal('fetch',fetcher);
 try{const {result,rerender}=renderHook(({ready})=>useIntraday(items,true,0,'',ready),{initialProps:{ready:false}});expect(fetcher).not.toHaveBeenCalled();rerender({ready:true});await waitFor(()=>expect(result.current.stocks['TW:2330']).toBeTruthy());expect(fetcher.mock.calls[0][0]).toContain('http://127.0.0.1:4178/api/intraday');expect(fetcher.mock.calls[0][1].headers).toEqual({});rerender({ready:false});await waitFor(()=>expect(result.current.stocks).toEqual({}));}finally{meta.remove();}
});
