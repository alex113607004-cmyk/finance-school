import React from 'react';
import {render,screen,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe,it,expect,vi} from 'vitest';
import App from './App';
import {units} from './data';

describe('source-led learning app',()=>{
 it('replaces the old curriculum with 15 lessons, five topics and no retired menus or shortcuts',()=>{
  render(<App/>);expect(screen.getAllByRole('article')).toHaveLength(15);
  expect(within(screen.getByRole('navigation',{name:'主題導航'})).getAllByRole('button')).toHaveLength(5);
  expect(screen.queryByText('實戰試算室')).not.toBeInTheDocument();expect(screen.queryByText('真實歷史案例')).not.toBeInTheDocument();
  expect(screen.queryByRole('link',{name:/試算|案例/})).not.toBeInTheDocument();
  expect(screen.getByRole('link',{name:'從第一單元開始'})).toHaveAttribute('href','#unit/start-ownership');
 });
 it('filters topics and searches the new summaries and original publishers',async()=>{
  const user=userEvent.setup();render(<App/>);
  await user.click(within(screen.getByRole('navigation',{name:'主題導航'})).getByRole('button',{name:/財報與估值/}));expect(screen.getAllByRole('article')).toHaveLength(3);
  await user.type(screen.getByRole('searchbox',{name:'搜尋所有教學單元'}),'集保');expect(screen.getAllByRole('article')).toHaveLength(1);
  expect(screen.getByRole('heading',{name:'集保股權分散：級距與資料基準'})).toBeInTheDocument();
  await user.clear(screen.getByRole('searchbox'));await user.type(screen.getByRole('searchbox'),'Fidelity');expect(screen.getAllByRole('article')).toHaveLength(3);
 });
 it('puts sourced takeaways before original resources and shows language and publisher',()=>{
  window.history.replaceState(null,'','#unit/fund-statements');render(<App/>);
  const top=screen.getByRole('region',{name:'本單元重點整理'}),reading=screen.getByRole('region',{name:'文章與教學影片'});
  expect(within(top).getAllByRole('listitem')).toHaveLength(3);
  expect(top.compareDocumentPosition(reading)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(within(top).getAllByRole('link').every(link=>link.href.startsWith('https://'))).toBe(true);
  expect(within(reading).getByText('英文')).toBeInTheDocument();expect(within(reading).getByText('美國證券交易委員會 SEC')).toBeInTheDocument();
  expect(within(reading).getAllByRole('link',{name:'閱讀原文'})).toHaveLength(2);
 });
 it('keeps progress and bookmarks on new IDs without marking old units as complete',async()=>{
  const user=userEvent.setup();localStorage.setItem('finance-school.completed.v2','["s1-1"]');
  window.history.replaceState(null,'','#unit/start-ownership');const{unmount}=render(<App/>);
  expect(screen.getAllByRole('progressbar')[0]).toHaveAttribute('aria-valuenow','0');
  await user.click(screen.getByRole('button',{name:'收藏這個單元'}));await user.click(screen.getByRole('button',{name:'標記已學會'}));
  expect(JSON.parse(localStorage.getItem('finance-school.completed.v3'))).toEqual(['start-ownership']);expect(localStorage.getItem('finance-school.completed.v2')).toBe('["s1-1"]');
  unmount();window.history.replaceState(null,'','#bookmarks');render(<App/>);expect(screen.getAllByRole('article')).toHaveLength(1);
  await user.click(screen.getByRole('button',{name:'取消收藏：持有股票，究竟持有什麼？'}));expect(screen.getByText('還沒有收藏，先留下一個想讀的單元。')).toBeInTheDocument();
 });
 it.each(['#tools','#cases','#case/1','#lesson/2'])('retires old route %s rather than displaying its former page',hash=>{
  window.history.replaceState(null,'',hash);render(<App/>);expect(window.location.hash).toBe('#learn');expect(screen.getAllByRole('article')).toHaveLength(15);
 });
 it('shows official video pages through the materials index',async()=>{
  const user=userEvent.setup();window.history.replaceState(null,'','#sources');render(<App/>);
  await user.click(screen.getByRole('button',{name:'官方影片',exact:true}));expect(screen.getAllByRole('article')).toHaveLength(4);
  for(const link of screen.getAllByRole('link',{name:'到原站觀看'})){expect(link.href).toMatch(/^https:\/\/www.twse.com.tw\/zh\/allinone\//);expect(link).toHaveAttribute('target','_blank');}
 });
 it('preserves readable content when browser storage is unavailable',()=>{
  const spy=vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('quota')});render(<App/>);expect(screen.getByRole('status')).toHaveTextContent('瀏覽器無法儲存');spy.mockRestore();
 });
});
