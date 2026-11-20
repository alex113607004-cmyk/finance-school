import React from 'react';
import {render,screen,waitFor} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import CloudQuotes from './CloudQuotes';
afterEach(()=>vi.unstubAllGlobals());
it('uses same-origin Access cookies without a password or API key form',async()=>{const ready=vi.fn(),fetcher=vi.fn(async()=>Response.json({mode:'cloud-access',authenticated:true,configured:true}));vi.stubGlobal('fetch',fetcher);render(<CloudQuotes onReady={ready}/>);await waitFor(()=>expect(ready).toHaveBeenLastCalledWith(true));expect(fetcher.mock.calls[0][0]).toBe('/api/session');expect(fetcher.mock.calls[0][1]).toMatchObject({credentials:'same-origin',redirect:'manual'});expect(screen.queryByRole('textbox')).toBeNull();expect(screen.queryByLabelText('私人分時存取密碼')).toBeNull();expect(screen.getByRole('link',{name:'登出'})).toHaveAttribute('href','/cdn-cgi/access/logout');});
it('disables quotes on an expired session and provides a top-level reauthentication link',async()=>{const ready=vi.fn();vi.stubGlobal('fetch',vi.fn(async()=>new Response('',{status:403})));render(<CloudQuotes onReady={ready}/>);await screen.findByText('登入已失效或尚未完成驗證，請重新驗證。');expect(ready).toHaveBeenLastCalledWith(false);expect(screen.getByRole('link',{name:'重新驗證登入'})).toHaveAttribute('href','/');});
