import {renderHook,waitFor,act} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import {useIntraday} from './use-intraday';
const items=[{id:'TW:2330'}];
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
it('clears an earlier curve after a failed refresh instead of treating it as current',async()=>{
 vi.stubEnv('VITE_INTRADAY_API_ORIGIN','https://example.com');vi.stubGlobal('fetch',vi.fn(async()=>Response.json({schemaVersion:1,intraday:{id:'TW:2330',date:'2026-11-19'}})));
 const {result,rerender}=renderHook(({revision})=>useIntraday(items,true,revision),{initialProps:{revision:0}});await waitFor(()=>expect(result.current.stocks['TW:2330']).toBeTruthy());
 vi.stubGlobal('fetch',vi.fn(async()=>{throw Error('offline');}));rerender({revision:1});await waitFor(()=>expect(result.current.warning).toContain('失敗'));expect(result.current.stocks).toEqual({});expect(result.current.busy).toBe(false);
});
it('finishes the loading state when the last item is removed and ignores an abandoned response',async()=>{
 vi.stubEnv('VITE_INTRADAY_API_ORIGIN','https://example.com');let resolve;vi.stubGlobal('fetch',vi.fn(()=>new Promise(r=>{resolve=r;})));
 const {result,rerender}=renderHook(({saved})=>useIntraday(saved,true,0),{initialProps:{saved:items}});await waitFor(()=>expect(result.current.busy).toBe(true));rerender({saved:[]});await waitFor(()=>expect(result.current.busy).toBe(false));
 await act(async()=>resolve(Response.json({schemaVersion:1,intraday:{id:'TW:2330'}})));expect(result.current.stocks).toEqual({});
});
it('does not load intraday data while the sidebar is closed',()=>{
 vi.stubEnv('VITE_INTRADAY_API_ORIGIN','https://example.com');const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);renderHook(()=>useIntraday(items,false,0));expect(fetcher).not.toHaveBeenCalled();
});
