import React from 'react';
import {render,screen,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {it,expect,vi} from 'vitest';
import WatchlistSearch from './WatchlistSearch';
import {WatchlistProvider} from './WatchlistContext';
import {createWatchlistStore} from '../watchlist-store';
it('browses an industry without a symbol, loads more and adds a stock without changing the analysis route',async()=>{
 const universe={stocks:Object.fromEntries(Array.from({length:15},(_,i)=>{const code=String(6000+i);return [code,{code,name:'模擬標的'+i,market:'TWSE',securityKind:'stock',company:{industryCode:i<12?'24':'28'},fundamentals:{industryName:i<12?'半導體業':'電子零組件業'}}];}))},store=createWatchlistStore(),request=vi.fn(),user=userEvent.setup();
 render(<WatchlistProvider store={store}><WatchlistSearch universe={universe} us={{stocks:{}}} onSearch={request}/></WatchlistProvider>);
 await user.selectOptions(screen.getByRole('combobox',{name:'自選股搜尋產業'}),'TW:24');
 expect(within(screen.getByRole('list',{name:'標的搜尋結果'})).getAllByRole('listitem')).toHaveLength(8);
 await user.click(screen.getByRole('button',{name:'顯示更多符合標的'}));expect(within(screen.getByRole('list',{name:'標的搜尋結果'})).getAllByRole('listitem')).toHaveLength(12);
 const hash=location.hash;await user.click(screen.getByRole('button',{name:'加入自選 6011 模擬標的11'}));expect(store.getSnapshot().items[0].id).toBe('TW:6011');expect(location.hash).toBe(hash);
 await user.type(screen.getByRole('searchbox'),'6012');expect(screen.queryByRole('list',{name:'標的搜尋結果'})).not.toBeInTheDocument();expect(screen.getByRole('status')).toHaveTextContent('查無符合');
 await user.selectOptions(screen.getByRole('combobox',{name:'標的搜尋市場'}),'US');expect(screen.getByRole('combobox',{name:'自選股搜尋產業'})).toHaveValue('all');
});
