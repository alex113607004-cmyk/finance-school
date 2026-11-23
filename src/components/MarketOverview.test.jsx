import React from 'react';
import {render,screen,within,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {it,expect,vi,afterEach} from 'vitest';
import MarketOverview from './MarketOverview';
import savedSnapshot from '../generated/market-overview.json';
const fixture=()=>({schemaVersion:1,generatedAt:'2026-11-19T05:00:00Z',markets:{TWSE:{date:'2026-11-18',status:'ok',warnings:[]},TPEX:{date:'2026-11-18',status:'ok',warnings:[]}},stocks:Array.from({length:40},(_,i)=>{
 const code=String(6000+i),market=i%2?'TPEX':'TWSE',close=100+i,change=i%3===0?1:i%3===1?-1:0;
 return {id:`TW:${market}:${code}`,code,name:`模擬標的${i}`,market,type:i%8===0?'etf':'stock',date:'2026-11-18',close,change,changePercent:change,volume:(i+1)*10000,turnover:(40-i)*100000,limit:{status:i===4?'up':i===5?'down':'none',upper:i===4?close:close+10,lower:i===5?close:close-10}};
 })});
afterEach(()=>vi.unstubAllGlobals());
async function setup(){vi.stubGlobal('fetch',vi.fn(async()=>Response.json(fixture())));render(<MarketOverview/>);await waitFor(()=>expect(screen.getByRole('button',{name:'重新整理'})).toBeEnabled());return userEvent.setup();}
const category=name=>within(screen.getByRole('group',{name:'排行分類'})).getByRole('button',{name,exact:true});
it('opens ready-to-browse volume rankings with direct stock links and pagination',async()=>{
 const user=await setup();expect(screen.getByRole('heading',{name:'市場總覽'})).toBeInTheDocument();expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
 expect(screen.getByRole('link',{name:'分析 6039 模擬標的39'})).toHaveAttribute('href','#analysis/TW/6039');expect(screen.getByRole('link',{name:'查看 6039 模擬標的39 個股分析'})).toHaveAttribute('href','#analysis/TW/6039');
 expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(31);await user.click(screen.getByRole('button',{name:'下一頁排行'}));expect(screen.getByText('第 31～35 檔，共 35 檔')).toBeInTheDocument();expect(screen.getByRole('button',{name:'下一頁排行'})).toBeDisabled();
});
it('switches gainers/losers/verified limits and can recover from an empty ETF limit category',async()=>{
 const user=await setup();await user.click(category('漲停板'));expect(screen.getByRole('link',{name:'查看 6004 模擬標的4 個股分析'})).toBeInTheDocument();expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2);
 await user.click(category('跌停板'));expect(screen.getByRole('link',{name:'查看 6005 模擬標的5 個股分析'})).toBeInTheDocument();
 await user.selectOptions(screen.getByRole('combobox',{name:'排行標的類型'}),'etf');expect(screen.getByRole('heading',{name:'此範圍尚無已確認的收盤跌停標的'})).toBeInTheDocument();await user.click(screen.getByRole('button',{name:'查看成交熱門'}));expect(category('成交熱門')).toHaveAttribute('aria-pressed','true');
 await user.click(category('漲幅排行'));expect(screen.getByRole('link',{name:'查看 6039 模擬標的39 個股分析'})).toBeInTheDocument();await user.click(category('跌幅排行'));expect(screen.queryByRole('link',{name:'查看 6039 模擬標的39 個股分析'})).not.toBeInTheDocument();
});
it('filters markets and ETFs and distinguishes volume popularity from amount ranking',async()=>{
 const user=await setup();await user.selectOptions(screen.getByRole('combobox',{name:'熱門排序依據'}),'turnover');expect(screen.getByRole('link',{name:'分析 6001 模擬標的1'})).toBeInTheDocument();
 await user.click(within(screen.getByRole('group',{name:'排行市場'})).getByRole('button',{name:'上櫃',exact:true}));expect(screen.queryByRole('link',{name:'查看 6002 模擬標的2 個股分析'})).not.toBeInTheDocument();
 await user.click(within(screen.getByRole('group',{name:'排行市場'})).getByRole('button',{name:'全部市場',exact:true}));await user.selectOptions(screen.getByRole('combobox',{name:'排行標的類型'}),'etf');expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(6);expect(screen.getByRole('link',{name:'查看 6000 模擬標的0 個股分析'})).toBeInTheDocument();
});
it('keeps the original snapshot date visible when refreshing fails and exposes sources on request',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>{throw Error('offline')}));render(<MarketOverview/>);expect(await screen.findByText(/沿用已保存快照與原交易日期/)).toBeInTheDocument();expect(document.querySelector('.ov-date strong').textContent).toBe(savedSnapshot.stocks.filter(s=>s.type==='stock').map(s=>s.date).sort().at(-1));
 await userEvent.click(screen.getByText('排行口徑、交易日期與官方來源'));expect(screen.getAllByRole('link',{name:'官方整批行情 ↗'})).toHaveLength(2);
});
it('restores filters, sort and page after leaving and remounting, including after fresh snapshot arrival',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json(fixture())));const user=userEvent.setup(),first=render(<MarketOverview/>);await waitFor(()=>expect(screen.getByRole('button',{name:'重新整理'})).toBeEnabled());await user.selectOptions(screen.getByRole('combobox',{name:'熱門排序依據'}),'turnover');await user.click(screen.getByRole('button',{name:'下一頁排行'}));expect(screen.getByText('第 31～35 檔，共 35 檔')).toBeInTheDocument();first.unmount();render(<MarketOverview/>);await waitFor(()=>expect(screen.getByRole('button',{name:'重新整理'})).toBeEnabled());expect(screen.getByRole('combobox',{name:'熱門排序依據'})).toHaveValue('turnover');expect(screen.getByText('第 31～35 檔，共 35 檔')).toBeInTheDocument();
});

it('filters ranking totals and rows by industry, resets pagination and restores the choice on return',async()=>{
 const data=fixture();data.stocks.forEach((s,i)=>s.industry={code:i%2?'24':'28',label:i%2?'半導體業':'電子零組件業'});
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json(data)));const user=userEvent.setup(),first=render(<MarketOverview/>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'重新整理'})).toBeEnabled());await user.click(screen.getByRole('button',{name:'下一頁排行'}));
 await user.selectOptions(screen.getByRole('combobox',{name:'排行產業篩選'}),'TW:24');
 expect(screen.getByText('第 1～20 檔，共 20 檔')).toBeInTheDocument();expect(screen.getByRole('button',{name:'下一頁排行'})).toBeDisabled();
 expect(screen.queryByRole('link',{name:'查看 6002 模擬標的2 個股分析'})).not.toBeInTheDocument();
 expect(screen.getByRole('link',{name:'查看 6001 模擬標的1 個股分析'})).toBeInTheDocument();
 first.unmount();render(<MarketOverview/>);await waitFor(()=>expect(screen.getByRole('button',{name:'重新整理'})).toBeEnabled());
 expect(screen.getByRole('combobox',{name:'排行產業篩選'})).toHaveValue('TW:24');
 await user.selectOptions(screen.getByRole('combobox',{name:'排行標的類型'}),'etf');expect(screen.getByRole('combobox',{name:'排行產業篩選'})).toHaveValue('all');
});
