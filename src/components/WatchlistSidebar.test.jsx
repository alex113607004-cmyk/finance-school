import React,{useState} from 'react';
import {render,screen,within,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,it,expect,vi} from 'vitest';
import {createWatchlistStore,WATCHLIST_KEY} from '../watchlist-store';
import {WatchlistProvider,WatchlistNotice} from './WatchlistContext';
import WatchlistSidebar from './WatchlistSidebar';
const tw={code:'2330',name:'台積電',market:'TWSE',securityKind:'stock',quote:{close:100,open:99,high:101,low:98,date:'2026-11-18',change:1,changePercent:1,volume:100},sources:{quotes:'https://example.com/simulated'},sourceChecks:{quotes:'2026-11-19T06:00:00Z'},fundamentals:{kind:'company'}};
const us={schemaVersion:1,stocks:{'US:AAPL':{id:'US:AAPL',region:'US',code:'AAPL',name:'Apple',nameZh:'蘋果',market:'NASDAQ',securityKind:'stock',quote:{status:'unavailable'},history:{rows:[]},sources:{},fundamentals:{}}}};
function responses(url){if(String(url).includes('universe-data'))return {schemaVersion:1,stocks:{2330:tw}};if(String(url).includes('us-data'))return us;if(String(url).includes('etf-nav-data'))return {schemaVersion:1,stocks:{}};if(String(url).includes('market-overview'))return {schemaVersion:1,markets:{TWSE:{date:'2026-11-18'}},stocks:[{id:'TW:TWSE:2330',code:'2330',name:'台積電',type:'stock',market:'TWSE',date:'2026-11-18',close:100,volume:100,turnover:10000,limit:{status:'none'}}]};return {stocks:{}};}
afterEach(()=>vi.unstubAllGlobals());
function setup(store=createWatchlistStore()){
 vi.stubGlobal('fetch',vi.fn(async url=>Response.json(responses(url))));
 function Harness(){const [market,setMarket]=useState('all');return <WatchlistProvider store={store}><WatchlistNotice/><WatchlistSidebar market={market} onMarketChange={setMarket}/></WatchlistProvider>;}
 render(<Harness/>);return {store,user:userEvent.setup()};
}
const results=()=>within(screen.getByRole('list',{name:'標的搜尋結果'}));
const search=()=>screen.getByRole('searchbox',{name:'搜尋標的代號或公司名稱'});
it('starts empty, searches and adds without leaving the current analysis address',async()=>{
 const {user,store}=setup(),hash=location.hash;expect(screen.getByRole('region',{name:'自選股空清單'})).toBeInTheDocument();expect(fetch).not.toHaveBeenCalled();
 await user.type(search(),'2330');await user.click(results().getByRole('button',{name:'加入自選 2330 台積電'}));
 expect(location.hash).toBe(hash);expect(store.getSnapshot().items.map(s=>s.id)).toEqual(['TW:2330']);expect(screen.getByRole('link',{name:'分析自選股 2330 台積電'})).toHaveAttribute('href','#analysis/TW/2330');expect(JSON.parse(localStorage.getItem(WATCHLIST_KEY)).items).toHaveLength(1);
 await user.click(within(document.querySelector('[data-security-id="TW:2330"]')).getByRole('button',{name:'移除自選 2330 台積電'}));expect(store.getSnapshot().items).toHaveLength(0);expect(results().getByRole('button',{name:'加入自選 2330 台積電'})).toHaveAttribute('aria-pressed','false');
});
it('keeps discovery separate from the saved-list filter and supports US companies',async()=>{
 const {user,store}=setup();await user.type(screen.getByRole('textbox',{name:'篩選自選股'}),'2330');await user.type(search(),'Apple');await user.click(results().getByRole('button',{name:'加入自選 AAPL 蘋果'}));expect(store.getSnapshot().items[0].id).toBe('US:AAPL');expect(screen.getByRole('textbox',{name:'篩選自選股'})).toHaveValue('2330');
 await user.clear(screen.getByRole('textbox',{name:'篩選自選股'}));expect(document.querySelector('[data-security-id="US:AAPL"]')).toHaveTextContent('行情暫不可用');
 await user.click(within(screen.getByRole('group',{name:'自選股市場'})).getByRole('button',{name:/台股/}));expect(document.querySelector('[data-security-id="US:AAPL"]')).toBeNull();
 await user.click(within(screen.getByRole('group',{name:'自選股市場'})).getByRole('button',{name:/美股/}));expect(document.querySelector('[data-security-id="US:AAPL"]')).toBeInTheDocument();
});
it('retains a working list and retries when browser storage fails',async()=>{
 let fail=true;const values=new Map(),store=createWatchlistStore({getStorage:()=>({getItem:k=>values.get(k)??null,setItem:(k,v)=>{if(fail)throw Error('quota');values.set(k,v);}})}),{user}=setup(store);
 await user.type(search(),'2330');await user.click(results().getByRole('button',{name:'加入自選 2330 台積電'}));expect(screen.getByRole('alert')).toHaveTextContent('此分頁暫存');expect(document.querySelector('[data-security-id="TW:2330"]')).toBeInTheDocument();fail=false;await user.click(screen.getByRole('button',{name:'重試儲存'}));expect(screen.queryByRole('alert')).toBeNull();expect(JSON.parse(values.get(WATCHLIST_KEY)).items).toHaveLength(1);
});
it('keeps original dates and visible items when a refresh fails',async()=>{
 const store=createWatchlistStore();store.add({region:'TW',symbol:'2330',name:'台積電'});const {user}=setup(store);await waitFor(()=>expect(screen.getByRole('button',{name:'重新整理自選股資料'})).toBeEnabled());vi.stubGlobal('fetch',vi.fn(async()=>{throw Error('offline')}));await user.click(screen.getByRole('button',{name:'重新整理自選股資料'}));await screen.findByText('部分資料沿用快照，查看來源狀態');expect(document.querySelector('[data-security-id="TW:2330"]')).toHaveTextContent('2026-11-18');expect(store.getSnapshot().items).toHaveLength(1);
});
it('does not save unknown targets and supports keyboard submit and clear',async()=>{
 const {user,store}=setup();await user.click(screen.getByRole('button',{name:'搜尋標的',exact:true}));expect(screen.getByText('請輸入股票代號或公司名稱。')).toBeInTheDocument();await user.type(search(),'NOT-A-REAL-STOCK{Enter}');await waitFor(()=>expect(screen.getByRole('button',{name:'重新整理自選股資料'})).toBeEnabled());expect(screen.getByText(/查無符合的標的/)).toBeInTheDocument();expect(store.getSnapshot().items).toHaveLength(0);await user.click(screen.getByRole('button',{name:'清除標的搜尋'}));expect(search()).toHaveValue('');expect(search()).toHaveFocus();
});
it('uses newly published catalog entries and retains them when the source fails',async()=>{
 const {user}=setup();vi.stubGlobal('fetch',vi.fn(async url=>Response.json(String(url).includes('universe-data')?{schemaVersion:1,stocks:{2330:tw,9999:{code:'9999',name:'測試新增公司',market:'TPEX',securityKind:'stock'}}}:responses(url))));await user.type(search(),'9999');expect(await screen.findByRole('link',{name:'分析搜尋標的 9999 測試新增公司'})).toHaveAttribute('href','#analysis/TW/9999');vi.stubGlobal('fetch',vi.fn(async()=>{throw Error('offline')}));await user.click(screen.getByRole('button',{name:'重新整理自選股資料'}));await screen.findByText('部分資料沿用快照，查看來源狀態');expect(screen.getByRole('link',{name:'分析搜尋標的 9999 測試新增公司'})).toBeInTheDocument();
});
it('uses ETF premium instead of forward PE in saved ETF items',()=>{
 const store=createWatchlistStore();store.add({region:'TW',symbol:'0050',name:'元大台灣50'});setup(store);const row=document.querySelector('[data-security-id="TW:0050"]');expect(row).toHaveTextContent('折溢價');expect(row).not.toHaveTextContent('前瞻本益比');expect(row).not.toHaveTextContent('EPS');
});
