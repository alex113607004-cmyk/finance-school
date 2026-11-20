import {afterEach,it,expect,vi} from 'vitest';
import {isLocalRuntime,configuredIntradayOrigin} from './intraday-config';
afterEach(()=>{document.querySelector('meta[name="finance-school-mode"]')?.remove();vi.unstubAllGlobals();vi.unstubAllEnvs();});
const mark=()=>{const m=document.createElement('meta');m.name='finance-school-mode';m.content='local';document.head.append(m);};
it('uses same-origin loopback only when the local server explicitly marks its page',()=>{mark();vi.stubGlobal('location',{hostname:'127.0.0.1',origin:'http://127.0.0.1:4178'});expect(isLocalRuntime()).toBe(true);expect(configuredIntradayOrigin()).toBe('http://127.0.0.1:4178');});
it('does not activate local mode for a remote page that contains the same marker',()=>{mark();vi.stubGlobal('location',{hostname:'example.com',origin:'https://example.com'});vi.stubEnv('VITE_INTRADAY_API_ORIGIN','');expect(isLocalRuntime()).toBe(false);expect(configuredIntradayOrigin()).toBe('');});
it('does not activate local mode on an ordinary local development page without the marker',()=>{vi.stubGlobal('location',{hostname:'127.0.0.1',origin:'http://127.0.0.1:4200'});expect(isLocalRuntime()).toBe(false);});
