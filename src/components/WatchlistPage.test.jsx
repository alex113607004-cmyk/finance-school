import React from 'react';
import {render,screen,within,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,it,expect,vi} from 'vitest';
import {createWatchlistStore,WATCHLIST_KEY} from '../watchlist-store';
import {WatchlistProvider,WatchButton,WatchlistNotice} from './WatchlistContext';
import WatchlistPage from './WatchlistPage';
const tw={code:'2330',name:'台積電',market:'TWSE',securityKind:'stock',quote:{close:100,date:'2026-11-18',change:1,changePercent:1,volume:100},sources:{quotes:'https://example.com/simulated'},sourceChecks:{quotes:'2026-11-19T06:00:00Z'},fundamentals:{kind:'company',earnings:{epsYtd:2,period:{year:2026,quarter:3,end:'2026-09-30',label:'2026 Q3 累計'}}}};
const us={schemaVersion:1,policy:{secAutomaticUpdate:false},stocks:{'US:AAPL':{id:'US:AAPL',region:'US',code:'AAPL',name:'Apple',nameZh:'蘋果',market:'NASDAQ',securityKind:'stock',quote:{status:'unavailable'},history:{rows:[]},sources:{},fundamentals:{},snapshot:{available:false}}}};
function responses(url){if(String(url).includes('universe-data'))return {schemaVersion:1,stocks:{2330:tw}};if(String(url).includes('us-data'))return us;if(String(url).includes('market-overview'))return {schemaVersion:1,markets:{TWSE:{date:'2026-11-18'}},stocks:[{id:'TW:TWSE:2330',code:'2330',name:'台積電',type:'stock',market:'TWSE',date:'2026-11-18',close:100,volume:100,turnover:10000,limit:{status:'none'}}]};return {stocks:{}};}
afterEach(()=>vi.unstubAllGlobals());
function setup(store=createWatchlistStore()){
 vi.stubGlobal('fetch',vi.fn(async url=>Response.json(responses(url))));
 render(<WatchlistProvider store={store}><div data-testid="test-star"><WatchButton region="TW" code="2330" name="台積電"/><WatchButton region="US" code="AAPL" name="蘋果"/></div><WatchlistNotice/><WatchlistPage/></WatchlistProvider>);return {store,user:userEvent.setup(),buttons:within(screen.getByTestId('test-star'))};
}
it('guides an empty list, then synchronizes star buttons, cards, removal and saved reload data',async()=>{const {store,user,buttons}=setup();expect(screen.getByRole('region',{name:'自選股空清單'})).toBeInTheDocument();expect(fetch).not.toHaveBeenCalled();await user.click(buttons.getByRole('button',{name:'加入自選 2330 台積電'}));await waitFor(()=>expect(document.querySelector('[data-security-id="TW:2330"]')).toBeInTheDocument());expect(buttons.getByRole('button',{name:'移除自選 2330 台積電'})).toHaveAttribute('aria-pressed','true');expect(JSON.parse(localStorage.getItem(WATCHLIST_KEY)).items).toHaveLength(1);await user.click(screen.getByRole('button',{name:'從清單移除 2330 台積電'}));expect(store.getSnapshot().items).toHaveLength(0);expect(screen.getByRole('region',{name:'自選股空清單'})).toBeInTheDocument();});
it('keeps missing US quotes explicit and filters saved stocks without querying unsupported symbols',async()=>{const {user,buttons}=setup();await user.click(buttons.getByRole('button',{name:'加入自選 2330 台積電'}));await user.click(buttons.getByRole('button',{name:'加入自選 AAPL 蘋果'}));await waitFor(()=>expect(screen.getByRole('button',{name:'重新整理資料'})).toBeEnabled());expect(document.querySelector('[data-security-id="US:AAPL"]')).toHaveTextContent('行情暫不可用');expect(document.querySelector('[data-security-id="TW:2330"]')).toHaveTextContent('連續四季稀釋 EPS 不足');await user.type(screen.getByRole('textbox',{name:'篩選自選股'}),'AAPL');expect(document.querySelector('[data-security-id="TW:2330"]')).toBeNull();expect(document.querySelector('[data-security-id="US:AAPL"]')).toBeInTheDocument();});
it('shows storage failure without losing the working list, and allows retry',async()=>{let fail=true;const values=new Map(),store=createWatchlistStore({getStorage:()=>({getItem:k=>values.get(k)??null,setItem:(k,v)=>{if(fail)throw Error('quota');values.set(k,v);}})}),{user,buttons}=setup(store);await user.click(buttons.getByRole('button',{name:'加入自選 2330 台積電'}));expect(screen.getByRole('alert')).toHaveTextContent('此分頁暫存');expect(document.querySelector('[data-security-id="TW:2330"]')).toBeInTheDocument();fail=false;await user.click(screen.getByRole('button',{name:'重試儲存'}));expect(screen.queryByRole('alert')).toBeNull();expect(JSON.parse(values.get(WATCHLIST_KEY)).items).toHaveLength(1);});
it('keeps original quote dates and visible cards when refresh fails',async()=>{const store=createWatchlistStore();store.add({region:'TW',symbol:'2330',name:'台積電'});const {user}=setup(store);await waitFor(()=>expect(screen.getByRole('button',{name:'重新整理資料'})).toBeEnabled());vi.stubGlobal('fetch',vi.fn(async()=>{throw Error('offline')}));await user.click(screen.getByRole('button',{name:'重新整理資料'}));await screen.findByText('部分資料沿用快照，查看來源狀態');expect(document.querySelector('[data-security-id="TW:2330"]')).toHaveTextContent('2026-11-18');expect(store.getSnapshot().items).toHaveLength(1);});
it('searches from an empty watchlist, adds on the same page and synchronizes result and card stars',async()=>{
 const {user,store}=setup(),route=location.hash;
 await user.type(screen.getByRole('searchbox',{name:'搜尋標的代號或公司名稱'}),'2330');
 const results=await screen.findByRole('list',{name:'標的搜尋結果'});
 expect(within(results).getByRole('link',{name:'分析搜尋標的 2330 台積電'})).toHaveAttribute('href','#analysis/TW/2330');
 await user.click(within(results).getByRole('button',{name:'加入自選 2330 台積電'}));
 expect(location.hash).toBe(route);expect(store.getSnapshot().items.map(s=>s.id)).toEqual(['TW:2330']);
 expect(document.querySelector('[data-security-id="TW:2330"]')).toBeInTheDocument();
 expect(within(results).getByRole('button',{name:'移除自選 2330 台積電'})).toHaveAttribute('aria-pressed','true');
 await user.click(screen.getByRole('button',{name:'從清單移除 2330 台積電'}));
 expect(within(results).getByRole('button',{name:'加入自選 2330 台積電'})).toHaveAttribute('aria-pressed','false');
 expect(store.getSnapshot().items).toHaveLength(0);
});
it('separates catalog discovery from filtering saved items and supports US company names',async()=>{
 const {user,store}=setup();
 await user.type(screen.getByRole('textbox',{name:'篩選自選股'}),'2330');
 await user.type(screen.getByRole('searchbox',{name:'搜尋標的代號或公司名稱'}),'Apple');
 const results=await screen.findByRole('list',{name:'標的搜尋結果'});
 await user.click(within(results).getByRole('button',{name:'加入自選 AAPL 蘋果'}));
 expect(store.getSnapshot().items.map(s=>s.id)).toEqual(['US:AAPL']);
 expect(screen.getByRole('textbox',{name:'篩選自選股'})).toHaveValue('2330');
 expect(screen.getByRole('heading',{name:'這個範圍沒有符合的自選股'})).toBeInTheDocument();
 await user.clear(screen.getByRole('textbox',{name:'篩選自選股'}));
 expect(document.querySelector('[data-security-id="US:AAPL"]')).toBeInTheDocument();
 await user.selectOptions(screen.getByRole('combobox',{name:'標的搜尋市場'}),'TW');
 expect(screen.queryByRole('list',{name:'標的搜尋結果'})).toBeNull();
 expect(screen.getByText(/查無符合的標的/)).toBeInTheDocument();
});
it('leaves unknown searches unsaved and supports submitting and clearing with the keyboard',async()=>{
 const {user,store}=setup(),input=screen.getByRole('searchbox',{name:'搜尋標的代號或公司名稱'}),route=location.hash;
 await user.click(screen.getByRole('button',{name:'搜尋標的',exact:true}));expect(screen.getByText('請輸入股票代號或公司名稱。')).toBeInTheDocument();
 await user.type(input,'NOT-A-REAL-STOCK{Enter}');
 await waitFor(()=>expect(screen.getByRole('button',{name:'重新整理資料'})).toBeEnabled());
 expect(screen.getByText(/查無符合的標的/)).toBeInTheDocument();expect(store.getSnapshot().items).toHaveLength(0);expect(location.hash).toBe(route);
 await user.click(screen.getByRole('button',{name:'清除標的搜尋'}));expect(input).toHaveValue('');expect(input).toHaveFocus();
});
it('searches the newly published catalog while retaining the original catalog when the source fails',async()=>{
 const {user}=setup();
 vi.stubGlobal('fetch',vi.fn(async url=>Response.json(String(url).includes('universe-data')?{schemaVersion:1,stocks:{...responses(url).stocks,9999:{code:'9999',name:'測試新增公司',market:'TPEX',securityKind:'stock'}}}:responses(url))));
 const input=screen.getByRole('searchbox',{name:'搜尋標的代號或公司名稱'});await user.type(input,'9999');
 expect(await screen.findByRole('link',{name:'分析搜尋標的 9999 測試新增公司'})).toHaveAttribute('href','#analysis/TW/9999');
 vi.stubGlobal('fetch',vi.fn(async()=>{throw Error('offline')}));
 await user.click(screen.getByRole('button',{name:'重新整理資料'}));await screen.findByText('部分資料沿用快照，查看來源狀態');
 expect(screen.getByRole('link',{name:'分析搜尋標的 9999 測試新增公司'})).toBeInTheDocument();
});
