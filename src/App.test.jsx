import React from 'react';
import {render,screen,within,fireEvent,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,it,expect,vi} from 'vitest';
import App from './App';
import {glossary} from './glossary';
vi.mock('./components/StockAnalysis',()=>({default:({param,symbol,term})=><section aria-label="個股分析頁"><p data-testid="analysis-address">{[param,symbol].filter(Boolean).join('/')}</p>{term('EPS')}</section>}));
vi.mock('./components/MarketOverview',()=>({default:()=><section aria-label="市場總覽頁"><a href="#analysis/TW/2330">分析台積電</a></section>}));
afterEach(()=>vi.restoreAllMocks());
it('opens stock analysis directly with no learning navigation, progress or course links',()=>{
 window.history.replaceState(null,'','/');render(<App/>);
 expect(window.location.hash).toBe('#analysis/TW/2330');expect(screen.getByTestId('analysis-address')).toHaveTextContent('TW/2330');
 expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();expect(screen.queryByRole('searchbox',{name:'搜尋所有教學單元'})).not.toBeInTheDocument();
 for(const text of ['學習主題','精選教材','我的收藏','學習進度','台美股看盤','繼續我的學習'])expect(screen.queryByText(text)).not.toBeInTheDocument();
 expect(document.title).toBe('台美股個股分析｜行情・財報・估值');expect(screen.getByRole('link',{name:/台美股個股分析/})).toHaveAttribute('href','#analysis/TW/2330');
});
it.each(['#learn','#unit/fund-pe','#lesson/1','#bookmarks','#sources','#glossary','#market','#tools','#cases','#case/1','#unknown','#%E0%A4%A'])('redirects removed or invalid URL %s to analysis',hash=>{
 window.history.replaceState(null,'',hash);render(<App/>);expect(window.location.hash).toBe('#analysis/TW/2330');expect(screen.getByRole('region',{name:'個股分析頁'})).toBeInTheDocument();
});
it.each([['#analysis/2330','2330'],['#analysis/TW/6488','TW/6488'],['#analysis/us/AAPL','us/AAPL'],['#analysis/US/MSFT','US/MSFT']])('preserves stock URL %s', (hash,address)=>{
 window.history.replaceState(null,'',hash);render(<App/>);expect(window.location.hash).toBe(hash);expect(screen.getByTestId('analysis-address')).toHaveTextContent(address);
});
it('handles market navigation and browser back/forward hash changes',async()=>{
 render(<App/>);window.history.replaceState(null,'','#analysis/US/MSFT');fireEvent(window,new HashChangeEvent('hashchange'));await waitFor(()=>expect(screen.getByTestId('analysis-address')).toHaveTextContent('US/MSFT'));
 const markets=within(screen.getByRole('navigation',{name:'個股分析市場'}));
 expect(markets.getByRole('link',{name:'美股 US'})).toHaveAttribute('aria-current','page');
 expect(markets.getByRole('link',{name:'美股 US'})).toHaveAttribute('href','#analysis/US/MSFT');
 window.history.replaceState(null,'','#analysis/2330');fireEvent(window,new HashChangeEvent('hashchange'));await waitFor(()=>expect(screen.getByTestId('analysis-address')).toHaveTextContent('2330'));
 expect(markets.getByRole('link',{name:'台股 TW'})).toHaveAttribute('aria-current','page');
});
it('keeps metric definitions inside analysis without linking to a removed dictionary or lesson',async()=>{
 const user=userEvent.setup();render(<App/>);await user.click(screen.getByRole('button',{name:'EPS'}));const dialog=screen.getByRole('dialog');expect(dialog).toHaveTextContent(glossary.EPS[0]);expect(within(dialog).queryByRole('link')).not.toBeInTheDocument();await user.click(screen.getByRole('button',{name:'關閉名詞解釋'}));expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('does not read, overwrite or erase former learning progress and bookmarks',()=>{
 const keys=['finance-school.completed.v3','finance-school.bookmarks.v3'];for(const key of keys)localStorage.setItem(key,'["fund-pe"]');
 const get=vi.spyOn(Storage.prototype,'getItem'),set=vi.spyOn(Storage.prototype,'setItem');render(<App/>);
 for(const key of keys){expect(get).not.toHaveBeenCalledWith(key);expect(set.mock.calls.some(call=>call[0]===key)).toBe(false);}
 get.mockRestore();set.mockRestore();for(const key of keys)expect(localStorage.getItem(key)).toBe('["fund-pe"]');
});
it('opens the new overview from navigation and preserves the previously selected stock for returning',async()=>{
 window.history.replaceState(null,'','#analysis/TW/6488');const user=userEvent.setup();render(<App/>);
 await user.click(within(screen.getByRole('navigation',{name:'網站導覽'})).getByRole('link',{name:'市場總覽'}));await screen.findByRole('region',{name:'市場總覽頁'});
 expect(window.location.hash).toBe('#overview/TW');expect(document.title).toBe('市場總覽｜台美股個股分析');expect(screen.getByRole('link',{name:'個股分析',exact:true})).toHaveAttribute('href','#analysis/TW/6488');
 await user.click(screen.getByRole('link',{name:'分析台積電'}));await waitFor(()=>expect(screen.getByTestId('analysis-address')).toHaveTextContent('TW/2330'));
});
it('accepts a direct overview address without changing existing stock URLs',()=>{
 window.history.replaceState(null,'','#overview');render(<App/>);expect(window.location.hash).toBe('#overview/TW');expect(screen.getByRole('region',{name:'市場總覽頁'})).toBeInTheDocument();expect(screen.getByRole('link',{name:'市場總覽'})).toHaveAttribute('aria-current','page');
});
it('redirects old watchlist addresses to analysis while opening the sidebar',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>{throw Error('offline')}));window.history.replaceState(null,'','#watchlist/US');render(<App/>);await waitFor(()=>expect(window.location.hash).toBe('#analysis/TW/2330'));expect(document.title).toBe('台美股個股分析｜行情・財報・估值');expect(screen.getByRole('dialog',{name:'自選股側邊欄'})).toBeInTheDocument();expect(within(screen.getByRole('group',{name:'自選股市場'})).getByRole('button',{name:/美股/})).toHaveAttribute('aria-pressed','true');vi.unstubAllGlobals();
});
it('opens and closes the sidebar without replacing the current analysis address',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>{throw Error('offline')}));window.history.replaceState(null,'','#analysis/US/MSFT');const user=userEvent.setup();render(<App/>);const toggle=screen.getByRole('button',{name:'自選股',exact:true});await user.click(toggle);expect(screen.getByRole('dialog',{name:'自選股側邊欄'})).toBeInTheDocument();expect(window.location.hash).toBe('#analysis/US/MSFT');expect(screen.getByTestId('analysis-address')).toHaveTextContent('US/MSFT');await user.keyboard('{Escape}');expect(screen.queryByRole('dialog',{name:'自選股側邊欄'})).toBeNull();expect(toggle).toHaveFocus();vi.unstubAllGlobals();
});
it('keeps metric definitions available inside the compact sidebar',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>{throw Error('offline')}));localStorage.setItem('finance-school.watchlist.v1',JSON.stringify({schemaVersion:1,items:[{id:'TW:2330',region:'TW',symbol:'2330',name:'台積電',addedAt:new Date().toISOString()}]}));window.history.replaceState(null,'','#watchlist/all');render(<App/>);const sidebar=await screen.findByRole('dialog',{name:'自選股側邊欄'});await userEvent.click(within(sidebar).getByRole('button',{name:'前瞻本益比',exact:true}));expect(screen.getByRole('dialog',{name:'前瞻本益比'})).toHaveTextContent(glossary['前瞻本益比'][0]);vi.unstubAllGlobals();
});
